(() => {
  'use strict';
  const core=globalThis.FocusCore;
  const query=new URLSearchParams(location.search);
  const demo=query.get('demo')==='1' || !globalThis.chrome?.runtime?.id;
  const prefix=`whatsapp-focus-demo:${query.get('instance') || 'standalone'}:`;
  let anchor=null;
  let demoPermission=readPermission();
  function readPermission(){try{return localStorage.getItem(prefix+'notification-permission')==='granted';}catch{return false;}}
  const read=key=>{try{return JSON.parse(localStorage.getItem(prefix+key)||'null');}catch{return null;}};
  const write=(key,value)=>{
    if (globalThis.FocusStorage?.demo) return FocusStorage.set({[key]:value});
    localStorage.setItem(prefix+key,JSON.stringify(value));
  };
  async function send(command,value={}) {
    if (!demo) {
      const response=await chrome.runtime.sendMessage({source:'what-the-focus',command,...value});
      if (!response?.ok) throw new Error('operationFailed');
      return response.state;
    }
    let preferences=core.preferences(read(core.keys.preferences));
    demoPermission=readPermission();
    let usage=core.usage(read(core.keys.usage));
    let session=core.session(read(core.keys.session));
    if (session?.endsAt<=Date.now()) {session=null;await write(core.keys.session,null);}
    if (command==='setPreferences') {
      if (value.value?.alwaysSilence && !demoPermission) throw new Error('operationFailed');
      preferences=core.preferences({...preferences,...value.value}); await write(core.keys.preferences,preferences); anchor=null;
    }
    if (command==='report') {
      if (preferences.tracking && !session && value.focused && value.visible) {
        if (anchor) {usage=core.addUsage(usage,anchor,Date.now()); await write(core.keys.usage,usage);}
        anchor=Date.now();
      } else anchor=null;
    }
    if (command==='clearUsage' && value.confirmed===true) {usage=core.usage(); anchor=null;await write(core.keys.usage,usage);}
    if (command==='start') {
      if (!core.durations.includes(value.minutes)||session) throw new Error('operationFailed');
      session={id:crypto.randomUUID(),startedAt:Date.now(),endsAt:Date.now()+value.minutes*60000,mutedTabs:{},requestedNotifications:preferences.silenceNotifications};
      session.notificationState=session.requestedNotifications||preferences.alwaysSilence?(demoPermission?'blocked':'unavailable'):'off';
      await write(core.keys.session,session);
    }
    if (command==='end') {
      if (!session || session.id!==value.sessionId || value.confirmed!==true) throw new Error('operationFailed');
      session=null;await write(core.keys.session,null);
    }
    const wanted=preferences.alwaysSilence || session?.requestedNotifications===true;
    const notificationState=wanted?(demoPermission?'blocked':'unavailable'):'off';
    if(session && session.notificationState!==notificationState) {
      session.notificationState=notificationState;await write(core.keys.session,session);
    }
    return {preferences,notificationsPermission:demoPermission,notificationsBlocked:notificationState==='blocked',summary:core.summary(usage),session,recoveryPending:false};
  }
  async function requestNotifications() {
    if (demo) {demoPermission=true;try{localStorage.setItem(prefix+'notification-permission','granted');}catch{}return true;}
    return chrome.permissions.request({permissions:['contentSettings']});
  }
  globalThis.FocusClient=Object.freeze({demo,send,requestNotifications});
})();
