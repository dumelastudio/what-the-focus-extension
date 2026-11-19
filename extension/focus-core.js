(() => {
  'use strict';
  const keys = Object.freeze({ preferences: 'whatTheFocusPreferences', usage: 'whatTheFocusUsage', session: 'whatTheFocusSession' });
  const durations = Object.freeze([30, 60, 120, 240]);
  const dayKey = value => {
    const date = new Date(value);
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  };
  function preferences(value) {
    return { tracking: typeof value?.tracking === 'boolean' ? value.tracking : true, showCounter: value?.showCounter !== false, silenceNotifications: typeof value?.silenceNotifications === 'boolean' ? value.silenceNotifications : true, alwaysSilence: value?.alwaysSilence === true };
  }
  function usage(value, now = Date.now()) {
    const cutoff = new Date(now); cutoff.setDate(cutoff.getDate()-364);
    const oldest = dayKey(cutoff);
    return { days: Object.fromEntries(Object.entries(value?.days || {}).filter(([date, ms]) => /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= oldest && Number.isFinite(ms) && ms > 0 && ms <= 93600000)) };
  }
  function addUsage(value, from, to) {
    const result = usage(value, to);
    if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from || to-from > 30000) return result;
    let cursor = from;
    while (cursor < to) {
      const midnight = new Date(cursor); midnight.setHours(24,0,0,0);
      const end = Math.min(to, midnight.getTime());
      const key = dayKey(cursor);
      result.days[key] = Math.min(93600000, (result.days[key] || 0) + end-cursor);
      cursor = end;
    }
    return result;
  }
  function summary(value, now = Date.now()) {
    const days = usage(value, now).days;
    const today = dayKey(now);
    const monday = new Date(now); monday.setDate(monday.getDate()-((monday.getDay()+6)%7));
    const weekStart = dayKey(monday);
    const month = today.slice(0,7);
    const entries = Object.entries(days).filter(([date]) => date <= today);
    const total = predicate => entries.reduce((sum,[date,ms]) => sum+(predicate(date)?ms:0),0);
    const history = Array.from({length:7},(_,index) => {
      const date = new Date(now); date.setDate(date.getDate()-index);
      const key = dayKey(date); return { date:key, ms:days[key] || 0 };
    });
    return { today:days[today] || 0, week:total(date => date>=weekStart), month:total(date => date.startsWith(month)), history };
  }
  function session(value) {
    if (!value || typeof value.id !== 'string' || value.id.length>80 || !Number.isFinite(value.startedAt) || !Number.isFinite(value.endsAt) || value.endsAt<=value.startedAt || value.endsAt-value.startedAt>14400000) return null;
    const mutedTabs = Object.fromEntries(Object.entries(value.mutedTabs || {}).filter(([tabId,record]) => /^\d+$/.test(tabId) && typeof record?.wasMuted === 'boolean').map(([tabId,record]) => [tabId,{wasMuted:record.wasMuted}]));
    return { id:value.id, startedAt:value.startedAt, endsAt:value.endsAt, mutedTabs,
      requestedNotifications:typeof value.requestedNotifications==='boolean' ? value.requestedNotifications : value.notificationApplied===true || value.notificationState==='unavailable',
      notificationState:['blocked','off','unavailable'].includes(value.notificationState)?value.notificationState:'off', audioUnavailable:value.audioUnavailable===true, ending:value.ending===true };
  }
  const remaining = (endsAt, now=Date.now()) => Math.max(0,Math.ceil((endsAt-now)/1000));
  function clock(seconds) {
    const value = Math.max(0,Math.ceil(seconds));
    return `${String(Math.floor(value/3600)).padStart(2,'0')}:${String(Math.floor(value%3600/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`;
  }
  globalThis.FocusCore = Object.freeze({ keys, durations, dayKey, preferences, usage, addUsage, summary, session, remaining, clock });
})();
