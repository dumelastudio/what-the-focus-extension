importScripts('focus-core.js','focus-controller.js');
const controller=new FocusController(chrome);
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
  if (message?.source!=='what-the-focus' || sender.id!==chrome.runtime.id) return;
  const isPage=Boolean(sender.tab);
  const trustedPage=sender.frameId===0 && sender.url?.startsWith('https://web.whatsapp.com/');
  const trustedExtension=!isPage && sender.url?.startsWith(chrome.runtime.getURL(''));
  const trustedHome=sender.frameId>0 && sender.url===chrome.runtime.getURL('home-panel.html') &&
    sender.tab?.url?.startsWith('https://web.whatsapp.com/');
  const pageCommands=['report','getState','end'];
  const homeCommands=['getState','setPreferences','clearUsage','start','end'];
  if (!(trustedExtension || (trustedPage && pageCommands.includes(message.command)) ||
    (trustedHome && homeCommands.includes(message.command)))) return;
  controller.handle(message,sender).then(state=>respond({ok:true,state})).catch(()=>respond({ok:false,error:'operationFailed'}));
  return true;
});
const event=(kind,details)=>controller.event(kind,details).catch(()=>{});
chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name==='what-the-focus-end') event('alarm');});
chrome.tabs.onActivated.addListener(()=>event('activation'));
chrome.tabs.onRemoved.addListener(tabId=>event('removed',tabId));
chrome.tabs.onUpdated.addListener((tabId,change)=>{if(change.url||change.status==='complete') event('updated',tabId);});
chrome.windows.onFocusChanged.addListener(()=>event('window'));
chrome.idle.setDetectionInterval(120);
chrome.idle.onStateChanged.addListener(()=>event('idle'));
chrome.permissions.onRemoved.addListener(()=>event('permission'));
chrome.runtime.onStartup.addListener(()=>event('startup'));
chrome.runtime.onInstalled.addListener(()=>event('installed'));
