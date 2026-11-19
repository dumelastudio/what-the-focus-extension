(() => {
  'use strict';
  const core = globalThis.FocusCore;
  const pattern = 'https://web.whatsapp.com/*';
  class FocusController {
    constructor(api, options={}) {
      this.api=api; this.now=options.now || Date.now; this.uuid=options.uuid || (()=>crypto.randomUUID());
      this.preferences=core.preferences(); this.usage=core.usage(); this.session=null;
      this.notificationPermission=false; this.clients=new Map(); this.anchor=null; this.queue=Promise.resolve();
      this.notificationRule=null; this.notificationsBlocked=false; this.notificationCleanupPending=false;
      this.ready=this.initialize();
    }
    async initialize() {
      const values=await this.api.storage.local.get(Object.values(core.keys));
      this.preferences=core.preferences(values[core.keys.preferences]);
      this.usage=core.usage(values[core.keys.usage],this.now());
      if (JSON.stringify(this.usage)!==JSON.stringify(values[core.keys.usage] || {days:{}})) await this.api.storage.local.set({[core.keys.usage]:this.usage});
      this.session=core.session(values[core.keys.session]);
      // Preserve preferences; daily aggregates are the only usage data stored.
      await this.reconcile().catch(()=>{});
      if (this.session) await this.muteTabs();
    }
    run(operation) {
      const result=this.queue.catch(()=>{}).then(()=>this.ready).then(operation);
      this.queue=result; return result;
    }
    async persistSession() { await this.api.storage.local.set({[core.keys.session]:this.session}); }
    async eligible() {
      if (!this.preferences.tracking || this.session) return null;
      const tabs=await this.api.tabs.query({active:true,lastFocusedWindow:true});
      const tab=tabs[0]; if (!tab || !this.clients.has(tab.id)) return null;
      const client=this.clients.get(tab.id);
      if (!client.focused || !client.visible || this.now()-client.seen>25000) return null;
      const window=await this.api.windows.get(tab.windowId);
      if (!window.focused || await this.api.idle.queryState(120)!=='active') return null;
      return tab.id;
    }
    async settle() {
      const now=this.now();
      if (this.anchor && this.preferences.tracking && !this.session && now>this.anchor.at && now-this.anchor.at<=30000) {
        const updated=core.addUsage(this.usage,this.anchor.at,now);
        await this.api.storage.local.set({[core.keys.usage]:updated});
        this.usage=updated;
      }
      this.anchor=null;
    }
    async tick() {
      await this.settle();
      const now=this.now(); const tabId=await this.eligible();
      this.anchor=tabId===null?null:{tabId,at:now};
    }
    async hasNotifications() { this.notificationPermission=await this.api.permissions.contains({permissions:['contentSettings']}); return this.notificationPermission; }
    async syncNotifications() {
      const session=this.session?.ending ? null : this.session;
      const wanted=this.preferences.alwaysSilence || session?.requestedNotifications===true;
      const previousPermission=this.notificationPermission;
      this.notificationsBlocked=false;
      if (!(await this.hasNotifications())) {
        // Chrome removes the extension's rules when the permission is revoked.
        this.notificationRule=null;
        this.notificationCleanupPending=false;
        if (previousPermission || this.preferences.alwaysSilence) {
          const next=core.preferences({...this.preferences,alwaysSilence:false,silenceNotifications:false});
          await this.api.storage.local.set({[core.keys.preferences]:next});
          this.preferences=next;
        }
      } else if (wanted) {
        this.notificationCleanupPending=false;
        try {
          const api=this.api.contentSettings.notifications;
          if (this.notificationRule!==true) {
            await api.set({primaryPattern:pattern,setting:'block',scope:'regular'});
            this.notificationRule=true;
          }
          const result=await api.get({primaryUrl:'https://web.whatsapp.com/'});
          this.notificationsBlocked=result.setting==='block';
        } catch {
          this.notificationRule=null;
        }
      } else if (this.notificationRule!==false) {
        // One rule serves both modes. Removing our rule restores Chrome's underlying setting.
        this.notificationCleanupPending=true;
        await this.api.contentSettings.notifications.clear({scope:'regular'});
        this.notificationRule=false;
        this.notificationCleanupPending=false;
      }
      if (session) {
        const status=this.notificationsBlocked ? 'blocked' : wanted ? 'unavailable' : 'off';
        if (session.notificationState!==status) {
          session.notificationState=status;
          await this.persistSession();
        }
      }
    }
    async reconcile() {
      if (this.session) {
        if (this.session.ending || this.session.endsAt<=this.now()) { await this.finish(); return; }
        await this.api.alarms.create('what-the-focus-end',{when:this.session.endsAt});
      }
      await this.syncNotifications();
    }
    async muteTabs() {
      if (!this.session || this.session.ending) return;
      const tabs=await this.api.tabs.query({url:pattern});
      let audioUnavailable=false;
      for (const tab of tabs.filter(tab=>!tab.incognito)) {
        if (!Object.hasOwn(this.session.mutedTabs,tab.id)) {
          this.session.mutedTabs[tab.id]={wasMuted:tab.mutedInfo?.muted===true};
          // Journal before mutating the tab, so worker termination is recoverable.
          await this.persistSession();
        }
        if (!tab.mutedInfo?.muted) {
          try {await this.api.tabs.update(tab.id,{muted:true});}
          catch {if (await this.api.tabs.get(tab.id).catch(()=>null)) audioUnavailable=true;}
        }
      }
      if (this.session.audioUnavailable!==audioUnavailable) {this.session.audioUnavailable=audioUnavailable;await this.persistSession();}
    }
    async restoreTab(tabId, record) {
      if (record.wasMuted) return;
      const tab=await this.api.tabs.get(Number(tabId)).catch(()=>null);
      if (tab?.mutedInfo?.muted && tab.mutedInfo.reason==='extension' && tab.mutedInfo.extensionId===this.api.runtime.id) await this.api.tabs.update(Number(tabId),{muted:false});
    }
    async finish() {
      if (!this.session) return;
      this.session.ending=true; await this.persistSession();
      await this.syncNotifications();
      for (const [tabId,record] of Object.entries(this.session.mutedTabs)) await this.restoreTab(tabId,record);
      await this.api.alarms.clear('what-the-focus-end');
      this.session=null; this.anchor=null; await this.persistSession();
    }
    state() {
      const session=this.session && !this.session.ending && this.session.endsAt>this.now()?{id:this.session.id,startedAt:this.session.startedAt,endsAt:this.session.endsAt,notificationState:this.session.notificationState,audioUnavailable:this.session.audioUnavailable===true}:null;
      return {preferences:{...this.preferences},notificationsPermission:this.notificationPermission,notificationsBlocked:this.notificationsBlocked,
        summary:core.summary(this.usage,this.now()),session,recoveryPending:this.session?.ending===true || this.notificationCleanupPending};
    }
    handle(message, sender={}) {
      return this.run(async()=>{
        try { await this.reconcile(); }
        catch(error) { if (['getState','report'].includes(message?.command)) return this.state(); throw error; }
        const retained=core.usage(this.usage,this.now());
        if (Object.keys(retained.days).length!==Object.keys(this.usage.days).length) {
          await this.api.storage.local.set({[core.keys.usage]:retained});this.usage=retained;
        }
        switch(message?.command) {
          case 'report': {
            if (!sender.tab || sender.frameId!==0 || new URL(sender.url).origin!=='https://web.whatsapp.com') throw new Error('Invalid page');
            await this.settle();
            this.clients.set(sender.tab.id,{focused:message.focused===true,visible:message.visible===true,seen:this.now()});
            await this.tick(); break;
          }
          case 'getState': break;
          case 'setPreferences': {
            await this.tick();
            const allowed=['tracking','showCounter','silenceNotifications','alwaysSilence'];
            const update=Object.fromEntries(Object.entries(message.value || {}).filter(([key,value])=>allowed.includes(key)&&typeof value==='boolean'));
            if (update.alwaysSilence && !this.notificationPermission) throw new Error('Notification permission required');
            const next=core.preferences({...this.preferences,...update});
            await this.api.storage.local.set({[core.keys.preferences]:next});
            this.preferences=next; this.anchor=null;
            // The saved preference lets the next event retry if clearing Chrome's rule fails.
            await this.syncNotifications().catch(error=>{if(!this.notificationCleanupPending) throw error;});
            break;
          }
          case 'clearUsage': {
            if (message.confirmed!==true) throw new Error('Confirmation required');
            this.usage=core.usage(); this.anchor=null;
            await this.api.storage.local.set({[core.keys.usage]:this.usage}); break;
          }
          case 'start': {
            if (!core.durations.includes(message.minutes)) throw new Error('Invalid duration');
            if (this.session) throw new Error('Session already running');
            await this.tick(); this.anchor=null;
            const now=this.now();
            this.session={id:this.uuid(),startedAt:now,endsAt:now+message.minutes*60000,mutedTabs:{},requestedNotifications:this.preferences.silenceNotifications,notificationState:'off',ending:false};
            await this.persistSession();
            try {
              await this.api.alarms.create('what-the-focus-end',{when:this.session.endsAt});
              await this.syncNotifications(); await this.muteTabs();
            } catch(error) { await this.finish(); throw error; }
            break;
          }
          case 'end':
            if (message.confirmed!==true || !this.session || message.sessionId!==this.session.id) throw new Error('Session confirmation required');
            await this.finish(); break;
          default: throw new Error('Unknown command');
        }
        return this.state();
      });
    }
    event(kind,details) {
      return this.run(async()=>{
        await this.settle();
        await this.reconcile();
        if (kind==='removed') this.clients.delete(details);
        if (kind==='updated' && this.session) {
          const tab=await this.api.tabs.get(details).catch(()=>null);
          if (tab && !tab.url?.startsWith('https://web.whatsapp.com/') && this.session.mutedTabs[details]) {
            await this.restoreTab(details,this.session.mutedTabs[details]); delete this.session.mutedTabs[details]; await this.persistSession();
          }
          await this.muteTabs();
        }
        await this.tick();
      });
    }
  }
  globalThis.FocusController=FocusController;
})();
