(() => {
  'use strict';
  const core=FocusCore, client=FocusClient, t=(key,values)=>FocusI18n.t(key,values);
  const $=id=>document.getElementById(id);
  let state=null, busy=false, messageKey='', confirmAction=null, returnFocus=null, confirmationKeys=null;
  let alwaysMessage='';
  const controls=['tracking','show-counter','silence-notifications','always-silence','clear-history','start-focus','end-focus'];
  const format=ms=>{
    const minutes=Math.floor(ms/60000); const hours=Math.floor(minutes/60);
    const number=new Intl.NumberFormat(FocusI18n.current());
    return hours?`${number.format(hours)} ${t('hoursShort')} ${number.format(minutes%60)} ${t('minutesShort')}`:`${number.format(minutes)} ${t('minutesShort')}`;
  };
  function panel(name,focus=false) {
    for(const id of ['distractions','time','focus']) {
      const selected=id===name;
      $(`panel-${id}`).hidden=!selected; $(`tab-${id}`).setAttribute('aria-selected',String(selected)); $(`tab-${id}`).tabIndex=selected?0:-1;
    }
    if(focus) $(`tab-${name}`).focus();
  }
  for(const name of ['distractions','time','focus']) {
    $(`tab-${name}`).addEventListener('click',()=>{panel(name);refresh();});
    $(`tab-${name}`).addEventListener('keydown',event=>{
      if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) {
        event.preventDefault();const order=['distractions','time','focus'];
        const move=(event.key==='ArrowRight')!==(document.documentElement.dir==='rtl')?1:-1;
        panel(event.key==='Home'?'distractions':event.key==='End'?'focus':order[(order.indexOf(name)+move+3)%3],true);
      }
    });
  }
  function renderClock() {
    if(!state?.session) return;
    const seconds=core.remaining(state.session.endsAt);
    $('session-clock').textContent=core.clock(seconds);
    $('session-until').textContent=t('untilTime',{time:new Intl.DateTimeFormat(FocusI18n.current(),{hour:'2-digit',minute:'2-digit'}).format(state.session.endsAt)});
    if(!seconds) refresh();
  }
  function render() {
    const ready=Boolean(state)&&!busy;
    for(const id of controls) $(id).disabled=!ready;
    $('durations').disabled=!ready;
    $('demo-note').hidden=!client.demo;
    if(!state) {$('focus-feedback').textContent=messageKey?t(messageKey):t('loading');return;}
    $('tracking').checked=state.preferences.tracking;
    $('show-counter').checked=state.preferences.showCounter; $('show-counter').disabled=!ready||!state.preferences.tracking;
    $('silence-notifications').checked=state.preferences.silenceNotifications;
    $('always-silence').checked=state.preferences.alwaysSilence;
    const alwaysKey=alwaysMessage || (state.preferences.alwaysSilence ? (state.notificationsBlocked?'notificationsOn':'notificationsUnavailable') : '');
    $('always-silence-feedback').hidden=!alwaysKey;
    $('always-silence-feedback').textContent=alwaysKey?t(alwaysKey):'';
    $('permission-hint').textContent=t(state.notificationsPermission?'notificationsGranted':'permissionOnStart');
    for(const key of ['today','week','month']) $(`time-${key}`).textContent=format(state.summary[key]);
    $('history-days').replaceChildren();
    const max=Math.max(60000,...state.summary.history.map(day=>day.ms));
    for(const day of state.summary.history) {
      const row=document.createElement('li'),label=document.createElement('span'),value=document.createElement('span'),bar=document.createElement('i');
      label.textContent=new Intl.DateTimeFormat(FocusI18n.current(),{weekday:'short',day:'numeric',month:'short'}).format(new Date(`${day.date}T12:00:00`));
      value.textContent=format(day.ms);bar.style.setProperty('--progress',`${day.ms/max*100}%`);bar.setAttribute('aria-hidden','true');
      row.append(label,value,bar);$('history-days').append(row);
    }
    $('session-setup').hidden=Boolean(state.session);$('session-running').hidden=!state.session;
    $('focus-feedback').textContent=state.recoveryPending?t('recoveryPending'):messageKey?t(messageKey):'';
    if(state.recoveryPending) $('start-focus').disabled=true;
    if(state.session) {
      $('session-notifications').textContent=t(state.session.notificationState==='blocked'?'notificationsOn':state.session.notificationState==='unavailable'?'notificationsUnavailable':'notificationsOff');$('session-audio-warning').hidden=!state.session.audioUnavailable;renderClock();
    }
    if(confirmationKeys) {
      $('confirm-title').textContent=t(confirmationKeys[0]);$('confirm-body').textContent=t(confirmationKeys[1]);
      $('confirm-cancel').textContent=t(confirmationKeys[2]);$('confirm-proceed').textContent=t(confirmationKeys[3]);
    }
  }
  async function refresh() {
    if(busy) return;
    try {state=await client.send('getState');} catch {messageKey='operationFailed';}
    render();
  }
  async function act(command,value={}) {
    if(busy)return;
    busy=true;messageKey='';render();
    try {state=await client.send(command,value);} catch {messageKey='operationFailed';}
    busy=false;render();
    if(command==='end' && !state?.session && !messageKey) $('start-focus').focus();
  }
  function confirm(keys,action,trigger) {
    confirmationKeys=keys;confirmAction=action;returnFocus=trigger;render();
    $('action-confirm').showModal();$('confirm-cancel').focus();
  }
  function closeConfirm() {
    $('action-confirm').close();confirmationKeys=null;confirmAction=null;returnFocus?.focus();returnFocus=null;
  }
  $('action-confirm').addEventListener('cancel',event=>{event.preventDefault();closeConfirm();});
  $('confirm-cancel').addEventListener('click',closeConfirm);
  $('confirm-proceed').addEventListener('click',()=>{const action=confirmAction;closeConfirm();action?.();});
  $('tracking').addEventListener('change',()=>act('setPreferences',{value:{tracking:$('tracking').checked}}));
  $('show-counter').addEventListener('change',()=>act('setPreferences',{value:{showCounter:$('show-counter').checked}}));
  $('silence-notifications').addEventListener('change',()=>act('setPreferences',{value:{silenceNotifications:$('silence-notifications').checked}}));
  $('always-silence').addEventListener('change',async()=>{
    if(busy||!state)return;
    const alwaysSilence=$('always-silence').checked;
    busy=true;alwaysMessage='';
    try {
      // Request the optional permission directly from this explicit user gesture.
      const permission=alwaysSilence&&!state.notificationsPermission ? client.requestNotifications() : true;
      render();
      if(await permission) state=await client.send('setPreferences',{value:{alwaysSilence}});
      else alwaysMessage='alwaysSilenceDenied';
    } catch {alwaysMessage='operationFailed';}
    busy=false;render();$('always-silence').focus();
  });
  $('start-focus').addEventListener('click',async()=>{
    if(busy||!state)return;
    const minutes=Number(document.querySelector('[name="duration"]:checked').value);
    if(!state.preferences.silenceNotifications||state.notificationsPermission){await act('start',{minutes});return;}
    // An optional permission must be requested from this explicit Start gesture.
    const permission=client.requestNotifications();busy=true;messageKey='';render();
    let granted=false;
    try{granted=await permission;}catch{}
    try{
      if(!granted)await client.send('setPreferences',{value:{silenceNotifications:false}});
      state=await client.send('start',{minutes});
      messageKey=granted?'':'notificationsDenied';
    }catch{messageKey='operationFailed';}
    busy=false;render();
  });
  $('end-focus').addEventListener('click',()=>{
    const id=state?.session?.id;
    confirm(['confirmEndTitle','confirmEndBody','keepFocusing','endSession'],()=>act('end',{sessionId:id,confirmed:true}),$('end-focus'));
  });
  $('clear-history').addEventListener('click',()=>confirm(['clearTitle','clearBody','cancel','clearConfirm'],()=>act('clearUsage',{confirmed:true}),$('clear-history')));
  document.addEventListener('focus-appearance',render);
  FocusStorage.subscribe((changes,area)=>{if(area==='local'&&Object.values(core.keys).some(key=>changes[key])) refresh();});
  const chosenPanel=new URLSearchParams(location.search).get('panel');
  if(['time','focus'].includes(chosenPanel))panel(chosenPanel);
  client.send('getState').then(value=>{state=value;if(state.session)panel('focus');render();}).catch(()=>{messageKey='operationFailed';render();});
  setInterval(renderClock,1000);
  setInterval(()=>{if(!$('panel-focus').hidden||!$('panel-time').hidden)refresh();},15000);
})();
