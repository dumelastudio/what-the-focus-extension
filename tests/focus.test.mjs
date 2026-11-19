import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const context=vm.createContext({Date,URL,Map,Set,Promise,Object,Array,Number,Math,Boolean,String,Error});
for(const file of ['focus-core.js','focus-controller.js'])vm.runInContext(fs.readFileSync(root+'extension/'+file,'utf8'),context);
const core=context.FocusCore;
const plain=value=>JSON.parse(JSON.stringify(value));
function fixture(initial={},options={}) {
  let time=new Date(2026,9,30,10).getTime();
  const values=structuredClone(initial),tabs=new Map([
    [1,{id:1,windowId:1,url:'https://web.whatsapp.com/',incognito:false,mutedInfo:{muted:false}}],
    [2,{id:2,windowId:1,url:'https://web.whatsapp.com/',incognito:false,mutedInfo:{muted:true,reason:'user'}}],
    [3,{id:3,windowId:1,url:'https://example.com/',incognito:false,mutedInfo:{muted:false}}]
  ]);
  const flags={permission:false,active:1,focused:true,idle:'active',notificationBlock:false,failSet:false,failClear:false,failAlarm:false,...options};
  const calls={set:[],clear:0,mute:[],alarms:new Map(),writes:[]};
  const api={runtime:{id:'test-extension'},
    storage:{local:{async get(keys){return Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(key=>[key,structuredClone(values[key])]));},async set(data){Object.assign(values,structuredClone(data));calls.writes.push(structuredClone(data));}}},
    permissions:{async contains(){return flags.permission;}},
    tabs:{async query(query){return query.url?[...tabs.values()].filter(tab=>tab.url.startsWith('https://web.whatsapp.com/')):[tabs.get(flags.active)].filter(Boolean);},async get(id){if(!tabs.has(id))throw Error('Tab closed');return structuredClone(tabs.get(id));},async update(id,update){if(!tabs.has(id))throw Error('Tab closed');Object.assign(tabs.get(id),{mutedInfo:{muted:update.muted,reason:'extension',extensionId:'test-extension'}});calls.mute.push({id,...update});}},
    windows:{async get(){return {focused:flags.focused};}},idle:{async queryState(){return flags.idle;}},
    alarms:{async create(name,value){if(flags.failAlarm)throw Error('Alarm failure');calls.alarms.set(name,value);},async clear(name){calls.alarms.delete(name);}},
    contentSettings:{notifications:{async set(value){calls.set.push(value);if(flags.failSet)throw Error('Permission lost');flags.notificationBlock=true;},async get(){return {setting:flags.notificationBlock?'block':'ask'};},async clear(){calls.clear++;if(flags.failClear)throw Error('Temporary failure');flags.notificationBlock=false;}}}
  };
  const controller=new context.FocusController(api,{now:()=>time,uuid:()=>`session-${time}`});
  const sender=id=>({tab:tabs.get(id),url:'https://web.whatsapp.com/',frameId:0});
  return {controller,api,flags,calls,values,tabs,advance:ms=>time+=ms,now:()=>time,setTime:value=>time=value,
    report:(id=1,focused=true,visible=true)=>controller.handle({command:'report',focused,visible},sender(id)),
    preferences:value=>controller.handle({command:'setPreferences',value}),
    start:minutes=>controller.handle({command:'start',minutes}),
    end:()=>controller.handle({command:'end',sessionId:controller.session?.id,confirmed:true})};
}
test('new installs enable time and notifications intent, preserving explicit false',()=>{
  assert.deepEqual(plain(core.preferences()),{tracking:true,showCounter:true,silenceNotifications:true,alwaysSilence:false});
  assert.deepEqual(plain(core.preferences({tracking:false,showCounter:false,silenceNotifications:false})),{tracking:false,showCounter:false,silenceNotifications:false,alwaysSilence:false});
  assert.deepEqual(plain(core.preferences({tracking:'yes',showCounter:false,secret:'ignored'})),{tracking:true,showCounter:false,silenceNotifications:true,alwaysSilence:false});
});
test('midnight splits a short active interval into local calendar days',()=>{
  const from=new Date(2026,9,30,23,59,55).getTime(),to=from+10000;
  assert.deepEqual(plain(core.addUsage(null,from,to).days),{'2026-10-30':5000,'2026-10-31':5000});
});
test('sleep gaps and backwards clock changes add no usage',()=>{
  assert.deepEqual(plain(core.addUsage(null,0,31000).days),{});
  assert.deepEqual(plain(core.addUsage(null,100,0).days),{});
});
test('week starts Monday, month follows calendar, future days excluded',()=>{
  const now=new Date(2026,10,2,12).getTime();
  const totals=core.summary({days:{'2026-10-31':1000,'2026-11-01':2000,'2026-11-02':3000,'2026-11-03':9000}},now);
  assert.equal(totals.today,3000);assert.equal(totals.week,3000);assert.equal(totals.month,5000);assert.equal(totals.history.length,7);
});
test('retention is 365 days and invalid values are discarded',()=>{
  const usage=core.usage({days:{'2020-01-01':1000,'2026-10-30':2000,bad:55,'2026-10-29':-2,'2026-10-28':Infinity}},new Date(2026,9,30).getTime());
  assert.deepEqual(plain(usage.days),{'2026-10-30':2000});
});
test('retention deletes expired data from storage even when tracking is disabled',async()=>{
  const f=fixture({[core.keys.usage]:{days:{'2020-01-01':1000,'2026-10-30':2000}}});await f.controller.ready;
  assert.deepEqual(f.values[core.keys.usage].days,{'2026-10-30':2000});
});
test('countdown never becomes negative and supports four hours',()=>{
  assert.equal(core.clock(14400),'04:00:00');assert.equal(core.remaining(100,1000),0);assert.equal(core.clock(59),'00:00:59');
});
test('saved disabled tracking remains off after update',async()=>{
  const f=fixture({[core.keys.preferences]:{tracking:false}});await f.report();f.advance(10000);await f.report();assert.equal(f.controller.state().summary.today,0);
});
test('active usage records intervals once across multiple tabs',async()=>{
  const f=fixture();await f.preferences({tracking:true});await f.report();f.advance(10000);await f.report();await f.report(2,false,false);
  assert.equal(f.controller.state().summary.today,10000);
  await f.controller.handle({command:'getState'});assert.equal(f.controller.state().summary.today,10000);
});
test('focus loss settles previous use then pauses',async()=>{
  const f=fixture();await f.preferences({tracking:true});await f.report();f.advance(4000);await f.report(1,false,false);f.advance(10000);await f.report(1,false,false);
  assert.equal(f.controller.state().summary.today,4000);
});
test('inactive Chrome window is not counted',async()=>{
  const f=fixture();await f.preferences({tracking:true});await f.report();f.advance(1000);f.flags.focused=false;await f.controller.event('window');f.advance(10000);await f.report();
  assert.equal(f.controller.state().summary.today,1000);
});
test('locked machine and long sleep do not inflate totals',async()=>{
  const f=fixture();await f.preferences({tracking:true});await f.report();f.advance(3600000);f.flags.idle='locked';await f.controller.event('idle');await f.report();
  assert.equal(f.controller.state().summary.today,0);
});
test('showing the counter is independent of recording',async()=>{
  const f=fixture();await f.preferences({tracking:true,showCounter:false});await f.report();f.advance(10000);await f.report();
  assert.equal(f.controller.state().summary.today,10000);assert.equal(f.controller.state().preferences.showCounter,false);
});
test('turning tracking off retains totals and prevents later increments',async()=>{
  const f=fixture();await f.preferences({tracking:true});await f.report();f.advance(5000);await f.preferences({tracking:false});f.advance(10000);await f.report();
  assert.equal(f.controller.state().summary.today,5000);
});
test('clear requires confirmation and clears all aggregates',async()=>{
  const f=fixture({[core.keys.usage]:{days:{'2026-10-30':2000}}});await f.controller.ready;
  await assert.rejects(f.controller.handle({command:'clearUsage'}));
  await f.controller.handle({command:'clearUsage',confirmed:true});assert.equal(f.controller.state().summary.today,0);
});
test('page reports reject non-WhatsApp and subframe senders',async()=>{
  const f=fixture();await assert.rejects(f.controller.handle({command:'report'},{tab:{id:1},url:'https://evil.test/',frameId:0}));
  await assert.rejects(f.controller.handle({command:'report'},{tab:{id:1},url:'https://web.whatsapp.com/',frameId:1}));
});
for(const minutes of [30,60,120,240])test(`session supports ${minutes} minutes`,async()=>{
  const f=fixture();const state=await f.start(minutes);assert.equal(state.session.endsAt-f.now(),minutes*60000);assert.equal(f.calls.alarms.get('what-the-focus-end').when,state.session.endsAt);
});
test('invalid durations and duplicate start are rejected',async()=>{
  const f=fixture();await assert.rejects(f.start(15));await f.start(30);await assert.rejects(f.start(60));
});
test('session mutes WhatsApp tabs only and remembers previously muted tabs',async()=>{
  const f=fixture();await f.start(30);assert.equal(f.tabs.get(1).mutedInfo.muted,true);assert.equal(f.tabs.get(3).mutedInfo.muted,false);
  await f.end();assert.equal(f.tabs.get(1).mutedInfo.muted,false);assert.equal(f.tabs.get(2).mutedInfo.muted,true);
});
test('manual user mute during a session is preserved on end',async()=>{
  const f=fixture();await f.start(30);f.tabs.get(1).mutedInfo={muted:true,reason:'user'};await f.end();assert.equal(f.tabs.get(1).mutedInfo.muted,true);
});
test('another extension taking over mute is respected',async()=>{
  const f=fixture();await f.start(30);f.tabs.get(1).mutedInfo={muted:true,reason:'extension',extensionId:'someone-else'};await f.end();assert.equal(f.tabs.get(1).mutedInfo.muted,true);
});
test('reconciliation and restart preserve a manual mute made during the session',async()=>{
  const f=fixture();await f.start(30);f.tabs.get(1).mutedInfo={muted:true,reason:'user'};
  await f.controller.event('updated',2);
  const restarted=new context.FocusController(f.api,{now:f.now});await restarted.ready;
  await restarted.handle({command:'end',sessionId:restarted.session.id,confirmed:true});
  assert.equal(f.tabs.get(1).mutedInfo.muted,true);assert.equal(f.tabs.get(1).mutedInfo.reason,'user');
});
test('new WhatsApp tab is muted and restored with the current session',async()=>{
  const f=fixture();await f.start(30);f.tabs.set(4,{id:4,windowId:1,url:'https://web.whatsapp.com/',mutedInfo:{muted:false}});await f.controller.event('updated',4);
  assert.equal(f.tabs.get(4).mutedInfo.muted,true);await f.end();assert.equal(f.tabs.get(4).mutedInfo.muted,false);
});
test('a tab leaving WhatsApp has the owned mute restored',async()=>{
  const f=fixture();await f.start(30);f.tabs.get(1).url='https://example.com/';await f.controller.event('updated',1);
  assert.equal(f.tabs.get(1).mutedInfo.muted,false);assert(!Object.hasOwn(f.controller.session.mutedTabs,1));
});
test('closed tabs do not prevent cleanup',async()=>{
  const f=fixture();await f.start(30);f.tabs.delete(1);await f.end();assert.equal(f.controller.state().session,null);
});
test('mute failure on a live tab is visible instead of claiming complete silence',async()=>{
  const f=fixture();f.api.tabs.update=async()=>{throw Error('Mute unavailable');};
  const state=await f.start(30);assert.equal(state.session.audioUnavailable,true);await f.end();
});
test('notifications intent never grants permission automatically',async()=>{
  const f=fixture();await f.start(30);assert.equal(f.calls.set.length,0);await f.end();assert.equal(f.calls.clear,0);
});
test('requested notifications without permission never claim silence',async()=>{
  const f=fixture();await f.preferences({silenceNotifications:true});assert.equal(f.controller.preferences.silenceNotifications,true);await f.start(30);assert.equal(f.controller.state().session.notificationState,'unavailable');
});
test('notification block is restricted to WhatsApp and clears rather than forcing allow',async()=>{
  const f=fixture({}, {permission:true});await f.preferences({silenceNotifications:true});await f.start(30);
  assert.equal(f.calls.set[0].primaryPattern,'https://web.whatsapp.com/*');assert.equal(f.calls.set[0].setting,'block');assert.equal(f.controller.state().session.notificationState,'blocked');
  const clears=f.calls.clear;await f.end();assert.equal(f.calls.clear,clears+1);assert(f.calls.set.every(call=>call.setting!=='allow'));
});
test('permission removal updates the preference and running session status',async()=>{
  const f=fixture({}, {permission:true});await f.preferences({silenceNotifications:true});await f.start(30);f.flags.permission=false;await f.controller.event('permission');
  assert.equal(f.controller.preferences.silenceNotifications,false);assert.equal(f.controller.state().session.notificationState,'unavailable');
});
test('notification API failure is reported without claiming silence',async()=>{
  const f=fixture({}, {permission:true,failSet:true});await f.preferences({silenceNotifications:true});await f.start(30);assert.equal(f.controller.state().session.notificationState,'unavailable');await f.end();
});
test('continuous silencing requires permission and only blocks browser notifications',async()=>{
  const f=fixture();
  await assert.rejects(f.preferences({alwaysSilence:true}));
  assert.equal(f.controller.state().preferences.alwaysSilence,false);
  assert.equal(f.calls.set.length,0);
  f.flags.permission=true;
  const state=await f.preferences({alwaysSilence:true});
  assert.equal(state.notificationsBlocked,true);
  assert.equal(state.session,null);
  assert.equal(f.calls.mute.length,0);
  assert.equal(f.values[core.keys.preferences].alwaysSilence,true);
  assert.deepEqual(plain(f.calls.set[0]),{primaryPattern:'https://web.whatsapp.com/*',setting:'block',scope:'regular'});
});
test('continuous silencing persists on restart and across expiry of a session',async()=>{
  const f=fixture({}, {permission:true});
  await f.preferences({alwaysSilence:true,silenceNotifications:false});
  const session=await f.start(30);
  assert.equal(session.session.notificationState,'blocked');
  const clears=f.calls.clear;
  const restarted=new context.FocusController(f.api,{now:f.now});
  await restarted.ready;
  f.advance(1800001);await restarted.event('alarm');
  assert.equal(restarted.state().session,null);
  assert.equal(restarted.state().notificationsBlocked,true);
  assert.equal(f.calls.clear,clears);
  assert.equal(f.tabs.get(1).mutedInfo.muted,false);
});
test('disabling continuous silencing leaves a running session in control of its rule',async()=>{
  const f=fixture({}, {permission:true});
  await f.start(30);await f.preferences({alwaysSilence:true});
  const clears=f.calls.clear;
  assert.equal((await f.preferences({alwaysSilence:false})).session.notificationState,'blocked');
  assert.equal(f.calls.clear,clears);
  await f.end();assert.equal(f.flags.notificationBlock,false);
});
test('a failed continuous cleanup is retried after restart without forcing allow',async()=>{
  const f=fixture({}, {permission:true});
  await f.preferences({alwaysSilence:true});f.flags.failClear=true;
  const state=await f.preferences({alwaysSilence:false});
  assert.equal(state.preferences.alwaysSilence,false);
  assert.equal(state.recoveryPending,true);
  f.flags.failClear=false;
  const restarted=new context.FocusController(f.api,{now:f.now});
  await restarted.ready;
  assert.equal(f.flags.notificationBlock,false);
  assert.equal(restarted.state().recoveryPending,false);
  assert(f.calls.set.every(call=>call.setting==='block'));
});
test('revoking permission disables continuous silencing and updates the session status',async()=>{
  const f=fixture({}, {permission:true});
  await f.preferences({alwaysSilence:true});await f.start(30);
  f.flags.permission=false;await f.controller.event('permission');
  assert.equal(f.values[core.keys.preferences].alwaysSilence,false);
  assert.equal(f.controller.state().notificationsBlocked,false);
  assert.equal(f.controller.state().session.notificationState,'unavailable');
});
test('a session saved by the previous version continues to block notifications after upgrade',async()=>{
  const now=new Date(2026,9,30,10).getTime();
  const f=fixture({[core.keys.session]:{id:'legacy',startedAt:now,endsAt:now+1800000,notificationApplied:true,notificationState:'blocked'}},{permission:true});
  await f.controller.ready;
  assert.equal(f.controller.state().session.notificationState,'blocked');
  await f.end();assert.equal(f.flags.notificationBlock,false);
});
test('early end needs confirmation and current session ID',async()=>{
  const f=fixture();const value=await f.start(30);
  await assert.rejects(f.controller.handle({command:'end',sessionId:value.session.id}));
  await assert.rejects(f.controller.handle({command:'end',sessionId:'stale',confirmed:true}));await f.end();assert.equal(f.controller.state().session,null);
});
test('usage is paused during a focus session',async()=>{
  const f=fixture();await f.preferences({tracking:true});await f.report();f.advance(5000);await f.start(30);f.advance(10000);await f.report();assert.equal(f.controller.state().summary.today,5000);
});
test('timer expiry restores resources even with no page reporting',async()=>{
  const f=fixture();await f.start(30);f.advance(1800001);await f.controller.event('alarm');assert.equal(f.controller.state().session,null);assert.equal(f.tabs.get(1).mutedInfo.muted,false);
});
test('worker restart restores active session and recreates its alarm',async()=>{
  const f=fixture();const state=await f.start(60);f.calls.alarms.clear();const restarted=new context.FocusController(f.api,{now:f.now,uuid:()=>''});await restarted.ready;
  assert.equal(restarted.state().session.id,state.session.id);assert.equal(f.calls.alarms.get('what-the-focus-end').when,state.session.endsAt);
});
test('restart after expiry performs cleanup instead of extending the session',async()=>{
  const f=fixture();await f.start(30);f.advance(7200000);const restarted=new context.FocusController(f.api,{now:f.now});await restarted.ready;
  assert.equal(restarted.state().session,null);assert.equal(f.tabs.get(1).mutedInfo.muted,false);
});
test('a failed alarm setup rolls back the session',async()=>{
  const f=fixture({}, {failAlarm:true});await assert.rejects(f.start(30));assert.equal(f.controller.state().session,null);assert.equal(f.tabs.get(1).mutedInfo.muted,false);
});
test('cleanup failure stays journaled, reports recovery and can be retried',async()=>{
  const f=fixture({}, {permission:true});await f.preferences({silenceNotifications:true});await f.start(30);f.flags.failClear=true;
  await assert.rejects(f.end());const state=await f.controller.handle({command:'getState'});assert.equal(state.session,null);assert.equal(state.recoveryPending,true);assert(f.values[core.keys.session].ending);
  f.flags.failClear=false;await f.controller.event('startup');assert.equal(f.controller.state().recoveryPending,false);assert.equal(f.tabs.get(1).mutedInfo.muted,false);
});
test('notification cleanup recovery survives worker restart',async()=>{
  const f=fixture({}, {permission:true});await f.preferences({silenceNotifications:true});await f.start(30);f.flags.failClear=true;await assert.rejects(f.end());
  const restarted=new context.FocusController(f.api,{now:f.now});await restarted.ready;
  assert.equal((await restarted.handle({command:'getState'})).recoveryPending,true);f.flags.failClear=false;await restarted.event('startup');assert.equal(restarted.state().recoveryPending,false);
});
test('incognito tabs are excluded from muting',async()=>{
  const f=fixture();f.tabs.get(2).incognito=true;await f.start(30);assert(!f.calls.mute.some(call=>call.id===2));
});
test('stored data contains no page titles, URLs, contacts or messages',async()=>{
  const f=fixture();await f.preferences({tracking:true});await f.report();f.advance(10000);await f.report();await f.start(30);
  const text=JSON.stringify(f.values);assert(!/https:|title|message|contact|cookie|token/i.test(text));
});

test('only the WhatsApp home frame can use home commands from a tab', () => {
  const hook = () => ({addListener() {}});
  let receive;
  const calls = [];
  const extension = 'chrome-extension://test-extension/';
  const whatsapp = 'https://web.whatsapp.com/';
  const browser = {
    runtime: {
      id: 'test-extension',
      getURL: pathname => extension + pathname,
      onMessage: {addListener(listener) { receive = listener; }},
      onStartup: hook(),
      onInstalled: hook(),
    },
    alarms: {onAlarm: hook()},
    tabs: {onActivated: hook(), onRemoved: hook(), onUpdated: hook()},
    windows: {onFocusChanged: hook()},
    idle: {setDetectionInterval() {}, onStateChanged: hook()},
    permissions: {onRemoved: hook()},
  };
  vm.runInNewContext(fs.readFileSync(root + 'extension/background.js', 'utf8'), {
    chrome: browser,
    importScripts() {},
    FocusController: class {
      async handle(message) { calls.push(message.command); }
    },
  });
  const send = (command, sender) => receive({source: 'what-the-focus', command},
    {id: browser.runtime.id, ...sender}, () => {});
  const home = {frameId: 1, url: extension + 'home-panel.html', tab: {url: whatsapp}};
  const page = {frameId: 0, url: whatsapp, tab: {url: whatsapp}};

  assert.equal(send('start', page), undefined);
  assert.equal(send('start', {...home, id: 'another-extension'}), undefined);
  assert.equal(send('start', {...home, tab: {url: 'https://example.com/'}}), undefined);
  assert.equal(send('start', {...home, url: extension + 'popup.html'}), undefined);
  assert.equal(send('report', home), undefined);
  assert.equal(send('setPreferences', home), true);
  assert.equal(send('start', home), true);
  assert.equal(send('report', page), true);
  assert.equal(send('start', {url: extension + 'popup.html'}), true);
  assert.deepEqual(calls, ['setPreferences', 'start', 'report', 'start']);
});
