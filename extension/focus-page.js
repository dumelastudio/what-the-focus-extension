(() => {
  'use strict';
  if(document.getElementById('what-the-focus-overlay'))return;
  const client=FocusClient, core=FocusCore;
  let state=null, appearance={theme:'system',language:'automatic'}, confirmation=false, pending=false, oldFocus=null, sessionId=null, reporting=false, refreshQueued=false, reportQueued=false;
  const make=(tag,text,className)=>{const node=document.createElement(tag);if(text)node.textContent=text;if(className)node.className=className;return node;};
  const overlayHost=make('div');overlayHost.id='what-the-focus-overlay';
  const shadow=overlayHost.attachShadow({mode:'open'});
  const styles=make('style');
  styles.textContent=`
    :host{--bg:#f8f8f6;--text:#202222;--muted:#696c6b;--line:#dedfdd;--surface:#eeefed;--accent:#16844b;--ink:white;color-scheme:light;}
    :host([data-theme=dark]){--bg:#171918;--text:#f0f1ef;--muted:#a0a5a1;--line:#343a35;--surface:#252a26;--accent:#65cb91;--ink:#102118;color-scheme:dark;}
    @media(prefers-color-scheme:dark){:host([data-theme=system]){--bg:#171918;--text:#f0f1ef;--muted:#a0a5a1;--line:#343a35;--surface:#252a26;--accent:#65cb91;--ink:#102118;color-scheme:dark;}}
    *{box-sizing:border-box}dialog{position:fixed;inset:0;margin:0;padding:32px;width:100vw;height:100dvh;max-width:none;max-height:none;border:0;background:var(--bg);color:var(--text);font:15px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;overflow:auto;}
    dialog::backdrop{background:var(--bg)}dialog[open]{display:grid;place-items:center}.content{width:100%;max-width:440px;text-align:center;margin:auto;}.brand{font-size:13px;font-weight:600;color:var(--muted);margin-bottom:36px}.mark{display:block;color:var(--accent);font-size:46px;line-height:1;margin-bottom:14px}h1{font-size:clamp(27px,4vw,40px);line-height:1.15;font-weight:600;letter-spacing:-1.2px;margin:0 0 18px}p{color:var(--muted);margin:12px 0}time{display:block;font-size:clamp(42px,9vw,68px);font-weight:500;line-height:1.5;letter-spacing:-2px;font-variant-numeric:tabular-nums;margin:22px 0}.detail{font-size:12px}button{font:inherit;font-size:13px;font-weight:550;border-radius:10px;padding:12px 20px;cursor:pointer;border:1px solid var(--line);color:var(--text);background:var(--surface)}button:hover{filter:brightness(.95)}button:focus-visible{outline:3px solid var(--accent);outline-offset:4px}button:disabled{opacity:.5;cursor:wait}.primary{color:var(--ink);background:var(--accent);border-color:var(--accent)}.actions{display:grid;gap:10px;max-width:300px;margin:24px auto}.copyright{font-size:11px;margin-top:38px}.error{font-size:12px}[hidden]{display:none!important}
  `;
  const dialog=make('dialog');dialog.setAttribute('aria-labelledby','wtf-title');dialog.setAttribute('aria-describedby','wtf-body');
  const content=make('div',null,'content'),mark=make('span',null,'mark'),brand=make('div','What the Focus','brand');mark.setAttribute('aria-hidden','true');
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('width','36');svg.setAttribute('height','36');
  const corners=document.createElementNS('http://www.w3.org/2000/svg','path');corners.setAttribute('d','M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5');corners.setAttribute('fill','none');corners.setAttribute('stroke','currentColor');corners.setAttribute('stroke-width','2');
  const center=document.createElementNS('http://www.w3.org/2000/svg','rect');center.setAttribute('x','9');center.setAttribute('y','9');center.setAttribute('width','6');center.setAttribute('height','6');center.setAttribute('fill','currentColor');svg.append(corners,center);mark.append(svg);
  const title=make('h1');title.id='wtf-title';const body=make('p');body.id='wtf-body';
  const clock=make('time');clock.dir='ltr';const detail=make('p',null,'detail'),actions=make('div',null,'actions');
  const end=make('button'),keep=make('button',null,'primary'),proceed=make('button'),error=make('p',null,'error'),copyright=make('p',`© ${new Date().getFullYear()} Dumela`,'copyright');
  for(const button of [end,keep,proceed])button.type='button';
  actions.append(end,keep,proceed);content.append(mark,brand,title,body,clock,detail,actions,error,copyright);dialog.append(content);shadow.append(styles,dialog);
  const counterHost=make('span');counterHost.id='what-the-focus-counter';counterHost.style.cssText='display:inline-flex;flex:none;vertical-align:middle;line-height:1;';
  const counterShadow=counterHost.attachShadow({mode:'open'}),counterStyle=make('style'),counter=make('span');
  counterStyle.textContent=`:host([hidden]){display:none!important}:host{--bg:#f0f1ef;--text:#626963}:host([data-theme=dark]){--bg:#252a26;--text:#bec7c0}@media(prefers-color-scheme:dark){:host([data-theme=system]){--bg:#252a26;--text:#bec7c0}}span{display:inline-block;white-space:nowrap;font:500 13px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:var(--text);background:var(--bg);padding:4px 7px;border-radius:20px;letter-spacing:0;font-variant-numeric:tabular-nums;} :host([data-compact]) span{font-size:13px;padding:4px;}`;
  counterShadow.append(counterStyle,counter);
  const layoutStyle=make('style');layoutStyle.id='what-the-focus-counter-layout';
  layoutStyle.textContent='[data-wtf-counter-anchor]{display:flex!important;align-items:center;column-gap:8px;min-width:0}[data-wtf-counter-anchor]>h1,[data-wtf-counter-anchor]>h2{flex:1;min-width:0}';
  let anchorNode=null, fullCounterLabel='', shortCounterLabel='', measuredLabel='', fullCounterWidth=0;
  const headerResize=new ResizeObserver(()=>queueAttach());
  function attach() {
    if(!document.body)return;
    if(!overlayHost.isConnected)document.body.append(overlayHost);
    if(!layoutStyle.isConnected)(document.head||document.documentElement).append(layoutStyle);
    const heading=document.querySelector('[data-testid="chatlist-header"] [data-testid="drawer-title-body"] h2,[data-testid="chatlist-header"] [data-testid="drawer-title-body"] h1,#side header h1,#side header h2,#side h1,[data-wtf-header]');
    const parent=heading?.parentElement||null;
    if(anchorNode!==parent){
      anchorNode?.removeAttribute('data-wtf-counter-anchor');headerResize.disconnect();anchorNode=parent;
      if(parent)headerResize.observe(parent);
    }
    if(!heading||!parent){counterHost.remove();counterHost.hidden=true;return;}
    if(counterHost.parentElement!==parent)parent.append(counterHost);
    const wanted=state?.preferences.tracking&&state.preferences.showCounter&&!state.session;
    counterHost.hidden=!wanted;
    if(!wanted){parent.removeAttribute('data-wtf-counter-anchor');return;}
    parent.setAttribute('data-wtf-counter-anchor','');
    const available=parent.getBoundingClientRect().width;
    const logoWidth=heading.querySelector('svg')?.getBoundingClientRect().width||100;
    if(measuredLabel!==fullCounterLabel||!fullCounterWidth){
      counterHost.removeAttribute('data-compact');
      if(counter.textContent!==fullCounterLabel)counter.textContent=fullCounterLabel;
      fullCounterWidth=counterHost.getBoundingClientRect().width;measuredLabel=fullCounterLabel;
    }
    const compact=available<logoWidth+fullCounterWidth+8;
    counterHost.toggleAttribute('data-compact',compact);
    const label=compact?shortCounterLabel:fullCounterLabel;
    if(counter.textContent!==label)counter.textContent=label;
    if(available<logoWidth+counterHost.getBoundingClientRect().width+8){
      counterHost.hidden=true;parent.removeAttribute('data-wtf-counter-anchor');
    }
    counterHost.setAttribute('aria-label',fullCounterLabel);counterHost.title=fullCounterLabel;
  }
  const t=(key,values)=>FocusI18n.t(key,values);
  function render() {
    FocusI18n.select(appearance.language);
    for(const host of [overlayHost,counterHost]){host.dataset.theme=appearance.theme;host.dir=FocusI18n.current()==='ar'?'rtl':'ltr';}
    const minutes=Math.floor((state?.summary.today || 0)/60000),hours=Math.floor(minutes/60),number=new Intl.NumberFormat(FocusI18n.current());
    const time=hours?`${number.format(hours)} ${t('hoursShort')} ${number.format(minutes%60)} ${t('minutesShort')}`:`${number.format(minutes)} ${t('minutesShort')}`;
    fullCounterLabel=t('counterLabel',{time});shortCounterLabel=time;attach();
    const active=state?.session && state.session.endsAt>Date.now();
    if(!active) {
      if(dialog.open){dialog.close();oldFocus?.focus?.();}
      sessionId=null;confirmation=false;return;
    }
    if(sessionId!==state.session.id){confirmation=false;sessionId=state.session.id;}
    title.textContent=t(confirmation?'confirmEndTitle':'focusOverlayTitle');
    body.textContent=t(confirmation?'confirmEndBody':'focusOverlayBody');
    clock.textContent=core.clock(core.remaining(state.session.endsAt));
    detail.textContent=client.demo?t('demoNote'):t(state.session.notificationState==='blocked'?'notificationsOn':state.session.notificationState==='unavailable'?'notificationsUnavailable':'notificationsOff');
    if(!client.demo && state.session.audioUnavailable)detail.textContent+=' '+t('audioUnavailable');
    end.textContent=t('endEarly');keep.textContent=t('keepFocusing');proceed.textContent=t('endSession');
    end.hidden=confirmation;keep.hidden=proceed.hidden=!confirmation;
    for(const button of [end,keep,proceed])button.disabled=pending;
    if(!dialog.open){oldFocus=document.activeElement;dialog.showModal();end.focus();}
  }
  async function refresh(report=false) {
    if(reporting){refreshQueued=true;reportQueued=reportQueued||report;return;}
    reporting=true;
    try {state=await client.send(report?'report':'getState',{focused:document.hasFocus(),visible:document.visibilityState==='visible'});render();}catch { /* A disconnected old content script stops reporting until page reload. */ }
    reporting=false;
    if(refreshQueued){const again=reportQueued;refreshQueued=false;reportQueued=false;refresh(again);}
  }
  end.addEventListener('click',()=>{confirmation=true;render();keep.focus();});
  keep.addEventListener('click',()=>{confirmation=false;render();end.focus();});
  proceed.addEventListener('click',async()=>{
    if(pending)return;pending=true;render();
    try {state=await client.send('end',{sessionId:state.session.id,confirmed:true});error.textContent='';}
    catch {error.textContent=t('operationFailed');}
    pending=false;render();
  });
  dialog.addEventListener('cancel',event=>{
    event.preventDefault();if(confirmation){confirmation=false;render();end.focus();}
  });
  function changed(changes,area) {
    if(area!=='local')return;
    if(changes[WhatsAppFocus.uiKey]){appearance=WhatsAppFocus.normalizeAppearance(changes[WhatsAppFocus.uiKey].newValue);render();}
    if(Object.values(core.keys).some(key=>changes[key]))refresh();
  }
  if(client.demo) {
    const prefix=`whatsapp-focus-demo:${new URLSearchParams(location.search).get('instance')||'standalone'}:`;
    try {appearance=WhatsAppFocus.normalizeAppearance(JSON.parse(localStorage.getItem(prefix+WhatsAppFocus.uiKey)||'null'));}catch{}
    const query=new URLSearchParams(location.search);
    appearance=WhatsAppFocus.normalizeAppearance({...appearance,language:query.get('lang')||appearance.language,theme:query.get('theme')||appearance.theme});
    window.addEventListener('storage',event=>{
      if(!event.key?.startsWith(prefix))return;
      try{changed({[event.key.slice(prefix.length)]:{newValue:event.newValue?JSON.parse(event.newValue):null}},'local');}catch{}
    });
  } else {
    chrome.storage.local.get(WhatsAppFocus.uiKey).then(values=>{appearance=WhatsAppFocus.normalizeAppearance(values[WhatsAppFocus.uiKey]);render();}).catch(()=>{});
    chrome.storage.onChanged.addListener(changed);
  }
  let attachQueued=false;
  function queueAttach(){if(!attachQueued){attachQueued=true;requestAnimationFrame(()=>{attachQueued=false;attach();});}}
  new MutationObserver(queueAttach).observe(document,{subtree:true,childList:true});
  for(const event of ['focus','blur'])window.addEventListener(event,()=>refresh(true));
  document.addEventListener('visibilitychange',()=>refresh(true));
  document.addEventListener('DOMContentLoaded',()=>refresh(true),{once:true});
  setInterval(()=>{if(state?.preferences.tracking||state?.session)refresh(true);},10000);
  setInterval(()=>{
    if(!state?.session)return;
    clock.textContent=core.clock(core.remaining(state.session.endsAt));
    if(!core.remaining(state.session.endsAt)){render();refresh();}
  },1000);
  refresh(true);
})();
