(() => {
  "use strict";
  const config = globalThis.WhatsAppFocus;
  const store = globalThis.FocusStorage;
  const i18n = globalThis.FocusI18n;
  const root = document.documentElement;
  const fields = document.getElementById("features");
  const master = document.getElementById("enabled");
  const themeButton = document.getElementById("theme-button");
  const languageButton = document.getElementById("language-button");
  const languageMenu = document.getElementById("language-menu");
  let settings = config.normalize();
  let appearance = config.normalizeAppearance();
  let feedbackKey = "loading";
  let ready = false;
  let pending = Promise.resolve();
  let writing = 0;
  let revision = 0;

  const automatic = document.createElement("button");
  automatic.type = "button";
  automatic.setAttribute("role", "menuitemradio");
  automatic.dataset.languageValue = "automatic";
  const automaticLabel = document.createElement("span");
  automaticLabel.dataset.i18n = "automatic";
  automatic.append(automaticLabel);
  languageMenu.append(automatic);
  for (const [code, name] of Object.entries(i18n.names)) {
    const option = document.createElement("button");
    option.type = "button";
    option.setAttribute("role", "menuitemradio");
    option.dataset.languageValue = code;
    const label = document.createElement("span");
    label.textContent = name;
    label.lang = code;
    option.append(label);
    languageMenu.append(option);
  }
  for (const option of languageMenu.querySelectorAll("button")) {
    const check = document.createElement("span");
    check.className = "choice-check";
    check.textContent = "✓";
    check.setAttribute("aria-hidden", "true");
    option.append(check);
  }

  function render() {
    root.dataset.theme = appearance.theme;
    i18n.apply(appearance.language);
    for (const key of Object.keys(config.defaults)) document.getElementById(key).checked = settings[key];
    master.disabled = !ready;
    fields.disabled = !ready || !settings.enabled;
    themeButton.disabled = languageButton.disabled = !ready;
    document.getElementById("focus-state").textContent = i18n.t(settings.enabled ? "enabledOn" : "enabledOff");
    document.getElementById("feedback").textContent = i18n.t(feedbackKey);
    for (const option of languageMenu.querySelectorAll("[data-language-value]")) option.setAttribute("aria-checked", String(option.dataset.languageValue === appearance.language));
    themeButton.dataset.tooltip = i18n.t(appearance.theme);
    themeButton.setAttribute("aria-label", `${i18n.t("theme")}: ${themeButton.dataset.tooltip}`);
    languageButton.setAttribute("aria-label", `${i18n.t("language")}: ${appearance.language === "automatic" ? i18n.t("automatic") : i18n.names[appearance.language]}`);
    document.dispatchEvent(new Event("focus-appearance"));
    const activeVersion = store.demo ? config.version : chrome.runtime.getManifest().version;
    document.getElementById("version").textContent = `v${activeVersion}`;
    document.getElementById("update-notice").hidden = activeVersion === config.version;
    document.getElementById("year").textContent = new Date().getFullYear();
    if (store.demo && window.parent !== window) {
      window.parent.postMessage({ source: "whatsapp-focus-demo", settings: { ...settings }, height: Math.ceil(document.body.getBoundingClientRect().height) }, location.origin);
    }
  }

  function save(key, value) {
    feedbackKey = "saving";
    writing += 1;
    render();
    const snapshot = structuredClone(value);
    pending = pending.catch(() => {}).then(() => store.set({ [key]: snapshot }));
    pending.then(() => {
      writing -= 1;
      if (!writing) { feedbackKey = settings.enabled ? "saved" : "paused"; render(); }
    }).catch(async () => {
      writing -= 1;
      feedbackKey = "errorSave";
      try {
        const data = await store.get(config.key);
        settings = config.normalize(data[config.key]);
      } catch { /* Leave the explicit error visible. */ }
      render();
    });
  }

  store.subscribe((changes, area) => {
    if (area !== "local" || writing || (!changes[config.key] && !changes[config.uiKey])) return;
    if (changes[config.key]) { revision += 1; settings = config.normalize(changes[config.key].newValue); }
    if (changes[config.uiKey]) appearance = config.normalizeAppearance(changes[config.uiKey].newValue);
    render();
  });

  render();
  const initialRevision = revision;
  Promise.all([store.get(config.key), store.get(config.uiKey)]).then(async ([rules, ui]) => {
    if (revision === initialRevision) settings = config.normalize(rules[config.key]);
    appearance = config.normalizeAppearance(ui[config.uiKey]);
    if (store.demo) {
      const query = new URLSearchParams(location.search);
      appearance = config.normalizeAppearance({ theme: query.get("theme") || appearance.theme, language: query.get("lang") || appearance.language });
    }
    ready = true;
    feedbackKey = settings.enabled ? "ready" : "paused";
    render();
    // The removed feature leaves no stored index, controls or runtime behavior.
    if (Object.hasOwn(rules[config.key] || {}, "groups")) await store.set({ [config.key]: settings });
    await store.remove(["whatsappFocusGroupStatus", "whatsappFocusGroupScan"]);
  }).catch(() => { feedbackKey = "errorLoad"; render(); });

  document.addEventListener("change", event => {
    const key = event.target.id;
    if (!ready || !Object.hasOwn(config.defaults, key)) return;
    settings = { ...settings, [key]: event.target.checked };
    save(config.key, settings);
  });
  const systemTheme = matchMedia("(prefers-color-scheme: dark)");
  themeButton.addEventListener("click", () => {
    appearance = { ...appearance, theme: FocusPreferences.nextTheme(appearance.theme, systemTheme.matches) };
    save(config.uiKey, appearance);
  });
  FocusPreferences.bindLanguageMenu(languageButton, languageMenu, option => {
    appearance = { ...appearance, language: option.dataset.languageValue };
    save(config.uiKey, appearance);
  });
  window.addEventListener("languagechange", render);
})();
