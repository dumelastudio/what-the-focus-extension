(() => {
  "use strict";
  const query = new URLSearchParams(location.search);
  const demo = query.get("demo") === "1" || !globalThis.chrome?.runtime?.id;
  const listeners = new Set();
  const prefix = `whatsapp-focus-demo:${query.get("instance") || "standalone"}:`;
  const memory = new Map();
  const read = key => {
    try { return JSON.parse(localStorage.getItem(prefix + key) || "null") ?? undefined; }
    catch { return memory.get(key); }
  };
  const write = (key, value) => {
    memory.set(key, value);
    try { localStorage.setItem(prefix + key, JSON.stringify(value)); } catch { /* memory fallback */ }
  };
  if (demo) window.addEventListener("storage", event => {
    if (!event.key?.startsWith(prefix)) return;
    const key = event.key.slice(prefix.length);
    try { for (const listener of listeners) listener({ [key]: { oldValue: event.oldValue ? JSON.parse(event.oldValue) : undefined, newValue: event.newValue ? JSON.parse(event.newValue) : undefined } }, "local"); } catch {}
  });
  globalThis.FocusStorage = Object.freeze({
    demo,
    async get(key) { return demo ? { [key]: read(key) } : chrome.storage.local.get(key); },
    async set(values) {
      if (!demo) return chrome.storage.local.set(values);
      const changes = {};
      for (const [key, value] of Object.entries(values)) {
        changes[key] = { oldValue: read(key), newValue: structuredClone(value) };
        write(key, value);
      }
      for (const listener of listeners) listener(changes, "local");
    },
    async remove(keys) {
      if (!demo) return chrome.storage.local.remove(keys);
      for (const key of keys) { memory.delete(key); try { localStorage.removeItem(prefix + key); } catch {} }
    },
    subscribe(listener) {
      if (demo) listeners.add(listener); else chrome.storage.onChanged.addListener(listener);
      return () => { if (demo) listeners.delete(listener); else chrome.storage.onChanged.removeListener(listener); };
    }
  });
})();
