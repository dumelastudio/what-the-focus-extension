globalThis.WhatsAppFocus = Object.freeze({
  version: "0.3.13",
  key: "whatsappFocus",
  uiKey: "whatsappFocusAppearance",
  defaults: Object.freeze({ enabled: true, status: true, channels: true, communities: true,
    metaAI: true, archived: true, lockedChats: true, media: true, calls: false, favicon: false }),
  normalize(value) {
    return Object.fromEntries(Object.entries(this.defaults).map(([key, fallback]) =>
      [key, typeof value?.[key] === "boolean" ? value[key] : fallback]));
  },
  normalizeAppearance(value) {
    const themes = ["system", "light", "dark"];
    const languages = ["automatic", "en", "pt", "es", "fr", "de", "id", "hi", "ar", "ja", "zh-CN"];
    return { theme: themes.includes(value?.theme) ? value.theme : "system",
      language: languages.includes(value?.language) ? value.language : "automatic" };
  }
});
