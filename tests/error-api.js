/* Fault injection for the test page only. Never packaged. */
globalThis.chrome = {
  runtime: { id: 'local-test', getManifest: () => ({ version: '0.3.12' }) },
  i18n: { getUILanguage: () => 'en' },
  storage: {
    onChanged: { addListener() {}, removeListener() {} },
    local: { get: () => Promise.reject(new Error('Storage unavailable')), set: () => Promise.reject(new Error('Storage unavailable')), remove: () => Promise.resolve() }
  }
};
