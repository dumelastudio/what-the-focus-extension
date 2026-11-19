(() => {
  "use strict";
  const i18n = globalThis.FocusI18n;
  const key = "whatsapp-focus-site-appearance";
  const query = new URLSearchParams(location.search);
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(key) || "{}"); } catch {}
  let theme = ["system", "light", "dark"].includes(query.get("theme") || saved.theme) ? query.get("theme") || saved.theme : "system";
  let language = query.get("lang") || saved.language || "automatic";
  if (language !== "automatic" && !Object.hasOwn(i18n.names, language)) language = "automatic";
  let previewTheme = "light";
  const systemTheme = matchMedia("(prefers-color-scheme: dark)");
  const themeButton = document.getElementById("site-theme");
  const tooltip = document.getElementById("site-theme-tooltip");
  const languageButton = document.getElementById("site-language");
  const languageMenu = document.getElementById("site-language-menu");

  for (const [value, label] of [["automatic", "automatic"], ...Object.entries(i18n.names)]) {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("role", "menuitemradio");
    button.dataset.value = value;
    const name = document.createElement("span");
    if (value === "automatic") name.dataset.i18n = label;
    else name.textContent = label;
    const check = document.createElement("span");
    check.className = "choice-check";
    check.textContent = "✓";
    check.setAttribute("aria-hidden", "true");
    button.append(name, check);
    languageMenu.append(button);
  }
  function persist() {
    try { localStorage.setItem(key, JSON.stringify({ theme, language })); } catch {}
  }

  function setPreview(frame, chosenTheme) {
    if (!frame) return;
    const src = new URL(frame.getAttribute("src"), location.href);
    src.searchParams.set("theme", chosenTheme); src.searchParams.set("lang", i18n.current());
    if (src.href !== frame.src) frame.src = src.href;
  }
  function apply() {
    document.documentElement.dataset.theme = theme;
    i18n.apply(language);
    document.title = `WhatsApp Focus · ${i18n.t(document.body.dataset.page === "privacy" ? "privacyLink" : document.body.dataset.page === "support" ? "supportLink" : "tagline")}`;
    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = i18n.t("heroBody");
    tooltip.textContent = i18n.t(theme);
    themeButton.setAttribute("aria-label", `${i18n.t("theme")}: ${tooltip.textContent}`);
    languageButton.setAttribute("aria-label", `${i18n.t("language")}: ${language === "automatic" ? i18n.t("automatic") : i18n.names[language]}`);
    for (const button of languageMenu.querySelectorAll("button")) button.setAttribute("aria-checked", String(button.dataset.value === language));
    for (const node of document.querySelectorAll("[data-year]")) node.textContent = new Date().getFullYear();
    const resolvedTheme = theme === "system" ? (systemTheme.matches ? "dark" : "light") : theme;
    setPreview(document.getElementById("hero-preview"), resolvedTheme);
    setPreview(document.getElementById("theme-preview"), previewTheme);
    for (const button of document.querySelectorAll("[data-preview-theme]")) button.setAttribute("aria-pressed", String(button.dataset.previewTheme === previewTheme));
  }
  function updatePreference(parameter, value) {
    if (query.has(parameter)) {
      query.set(parameter, value);
      history.replaceState(null, "", `?${query}${location.hash}`);
    }
    persist();
    apply();
  }
  themeButton.addEventListener("click", () => {
    theme = FocusPreferences.nextTheme(theme, systemTheme.matches);
    updatePreference("theme", theme);
  });
  FocusPreferences.bindLanguageMenu(languageButton, languageMenu, option => {
    language = option.dataset.value;
    updatePreference("lang", language);
  });
  window.addEventListener("languagechange", () => { if (language === "automatic") apply(); });
  for (const button of document.querySelectorAll("[data-preview-theme]")) button.addEventListener("click", () => { previewTheme = button.dataset.previewTheme; apply(); });
  systemTheme.addEventListener("change", () => { if (theme === "system") apply(); });
  if (document.documentElement.dataset.installedProduct === "true") {
    for (const link of document.querySelectorAll("[data-download],[data-primary-cta]")) {
      link.href = "https://web.whatsapp.com/"; link.removeAttribute("download"); link.dataset.i18n = "openWhatsApp";
    }
    document.querySelector(".install-note")?.remove();
  }
  window.addEventListener("message", event => {
    if (event.origin !== location.origin || event.data?.source !== "whatsapp-focus-demo" || !Number.isFinite(event.data.height)) return;
    const frame = Array.from(document.querySelectorAll("iframe")).find(item => item.contentWindow === event.source);
    if (frame) frame.height = String(Math.max(540, Math.min(820, event.data.height + 2)));
  });
  apply();
})();
