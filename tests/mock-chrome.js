(() => {
  const old = { enabled: true, status: false, channels: true, communities: true, metaAI: true,
    archived: true, lockedChats: true, media: true, calls: false, groups: true };
  const values = { whatsappFocus: old, whatsappFocusGroupStatus: { count: 24 }, whatsappFocusGroupScan: 1 };
  const listeners = [];
  globalThis.chrome = { storage: {
    onChanged: { addListener(listener) { listeners.push(listener); } },
    local: {
      async get(key) { return { [key]: structuredClone(values[key]) }; },
      async set(data) {
        const changes = {};
        for (const [key, value] of Object.entries(data)) {
          changes[key] = { newValue: structuredClone(value), oldValue: values[key] };
          values[key] = structuredClone(value);
        }
        for (const listener of listeners) listener(changes, 'local');
      },
      async remove(keys) { for (const key of keys) delete values[key]; }
    }
  } };
})();
