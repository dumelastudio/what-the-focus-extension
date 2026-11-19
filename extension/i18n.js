(() => {
  "use strict";
  const names = { en: "English", pt: "Português", es: "Español", fr: "Français", de: "Deutsch",
    id: "Bahasa Indonesia", hi: "हिन्दी", ar: "العربية", ja: "日本語", "zh-CN": "简体中文" };
  let language = "en";
  function matchLanguage(code) {
    const base = String(code || "").replaceAll("_", "-").toLowerCase().split("-")[0];
    const result = base === "zh" ? "zh-CN" : base;
    return Object.hasOwn(names, result) ? result : undefined;
  }
  function resolve(code) { return matchLanguage(code) || "en"; }
  function t(key, values = {}) {
    const text = globalThis.FocusLocales[language]?.[key] ?? globalThis.FocusLocales.en[key] ?? key;
    return Object.entries(values).reduce((value, [name, replacement]) => value.replaceAll(`{${name}}`, String(replacement)), text);
  }
  function select(preference = "automatic") {
    const browserLanguages = [globalThis.chrome?.i18n?.getUILanguage?.(), ...(navigator.languages || [navigator.language])];
    language = preference === "automatic" ? browserLanguages.map(matchLanguage).find(Boolean) || "en" : resolve(preference);
    return language;
  }
  function apply(preference = "automatic") {
    select(preference);
    document.documentElement.lang = language === "pt" ? "pt-BR" : language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    for (const node of document.querySelectorAll("[data-i18n]")) node.textContent = t(node.dataset.i18n);
    for (const node of document.querySelectorAll("[data-i18n-label]")) node.setAttribute("aria-label", t(node.dataset.i18nLabel));
    for (const node of document.querySelectorAll("[data-i18n-title]")) node.title = t(node.dataset.i18nTitle);
    for (const node of document.querySelectorAll("[data-i18n-alt]")) node.alt = t(node.dataset.i18nAlt);
    for (const node of document.querySelectorAll("[data-i18n-frame-title]")) node.title = t(node.dataset.i18nFrameTitle);
    return language;
  }
  globalThis.FocusI18n = Object.freeze({ names, resolve, t, select, apply, current: () => language });
})();
