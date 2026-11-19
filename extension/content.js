(() => {
  "use strict";
  const config = globalThis.WhatsAppFocus;
  let settings = config.normalize();
  let revision = 0;
  let queued = false;
  const faviconSelector = 'link[rel~="icon" i]';
  // The bundled 32px mark is inline so the site needs no network request or new access.
  const fixedIcon = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAA0ElEQVR42mNgQAMsLCwyfAIChZKy0scUVJX/UwODzAKZCTKbAR/g5uEJlVGUf0wti9ExyGyQHVgtF5UUX0Uri9ExyC4Mn9PLchiGhwQoXmgZ7PiiA5wmQImD3pbDMMhuBmqmdnJyB8NAWQ7DQ8MBmQf7/hddmY2CQWLEylPsAHTDiXEACFPdAcQG66gDqO4AUByjJyrkeMcmR9VESEzCpHs5QFcHDHgUjOaCQeOAASuKB7wyGt7tgQFvkg14o3TAm+UD3jEZFF2zQdE5HajuOQAhQNBszhoKHAAAAABJRU5ErkJggg==';
  const nativeIcons = new Map();
  let tabHead = null;
  let tabTitle = null;
  let titlePrefix = '';
  const unreadPrefix = /^[\s\u061c\u200e\u200f]*\(\p{Nd}+\+?\)[\s\u061c\u200e\u200f]*(?=[^\s\u061c\u200e\u200f])/u;
  const tabObserver = new MutationObserver(syncTab);
  const titleObserver = new MutationObserver(stripTitleCount);
  const labels = {
    status: ["status", "updates", "atualizações", "estados", "statut", "ステータス", "状态", "الحالة", "स्टेटस"],
    channels: ["channels", "canais", "canales", "chaînes", "kanäle", "saluran", "チャンネル", "频道", "القنوات", "चैनल"],
    communities: ["communities", "comunidades", "communautés", "communitys", "komunitas", "コミュニティ", "社群", "المجتمعات", "कम्युनिटी"],
    metaAI: ["meta ai"], media: ["media", "mídia", "mídias", "medien", "médias", "メディア", "媒体", "الوسائط", "मीडिया"],
    calls: ["calls", "chamadas", "ligações", "llamadas", "appels", "anrufe", "panggilan", "通話", "通话", "المكالمات", "कॉल"]
  };
  const icons = { "wds-ic-status": "status", "wds-ic-channels": "channels", "wds-ic-communities": "communities", "ic-filter": "media", "ic-call": "calls" };
  const aiNames = new Set(["ask meta ai", "perguntar à meta ai", "pergunte à meta ai", "preguntar a meta ai", "demander à meta ai", "meta ai fragen", "tanya meta ai", "meta ai से पूछें", "اسأل meta ai", "meta aiに質問", "询问 meta ai"]);

  function stripTitleCount() {
    const text = tabTitle.textContent;
    titlePrefix = text.match(unreadPrefix)?.[0] || '';
    if (!titlePrefix) return;
    tabTitle.textContent = text.slice(titlePrefix.length);
    titleObserver.takeRecords();
  }

  function watchTabTitle(head) {
    const next = head?.querySelector('title') || null;
    if (next === tabTitle) return;
    const changedBySite = titleObserver.takeRecords().length > 0;
    titleObserver.disconnect();
    // If WhatsApp already wrote a newer title, leave that title in place.
    if (tabTitle && titlePrefix && !changedBySite) tabTitle.textContent = titlePrefix + tabTitle.textContent;
    tabTitle = next;
    titlePrefix = '';
    if (tabTitle) {
      titleObserver.observe(tabTitle, { childList: true, subtree: true, characterData: true });
      stripTitleCount();
    }
  }

  function syncTab() {
    const head = settings.enabled && settings.favicon ? document.head : null;
    if (head !== tabHead) {
      tabObserver.disconnect();
      tabHead = head;
      if (head) tabObserver.observe(head, { childList: true, subtree: true, attributes: true, attributeFilter: ['href', 'rel'] });
    }
    watchTabTitle(head);
    for (const [link, originalHref] of nativeIcons) {
      if (head?.contains(link) && link.matches(faviconSelector)) continue;
      if (link.getAttribute('href') === fixedIcon) {
        if (originalHref === null) link.removeAttribute('href');
        else link.setAttribute('href', originalHref);
      }
      nativeIcons.delete(link);
    }
    for (const link of head?.querySelectorAll(faviconSelector) || []) {
      const href = link.getAttribute('href');
      if (href === fixedIcon) continue;
      // Keep the latest URL supplied by WhatsApp so pausing restores its current icon.
      nativeIcons.set(link, href);
      link.setAttribute('href', fixedIcon);
    }
  }

  function tagControls() {
    queued = false;
    if (settings.enabled && settings.favicon && document.head !== tabHead) syncTab();
    for (const button of document.querySelectorAll("button[data-navbar-item]")) {
      const label = (button.getAttribute("aria-label") || "").toLowerCase().trim();
      const icon = button.querySelector("svg title")?.textContent;
      const type = icons[icon] || Object.keys(labels).find(key => labels[key].includes(label));
      if (type) button.setAttribute("data-wf-ui", type);
      else button.removeAttribute("data-wf-ui");
    }
    for (const button of document.querySelectorAll('button, [role="button"]')) {
      if (button.closest('[role="row"], [role="gridcell"], [contenteditable="true"]')) continue;
      const label = (button.getAttribute("aria-label") || "").trim().toLowerCase();
      const ownText = Array.from(button.childNodes).filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join(" ").trim().toLowerCase();
      const textMatch = Array.from(button.querySelectorAll("span,div")).filter(node => !node.querySelector("button,[role='button']"))
        .some(node => aiNames.has(node.textContent.trim().toLowerCase()));
      if (aiNames.has(label) || aiNames.has(ownText) || textMatch) button.setAttribute("data-waf-ai-entry", "");
      else button.removeAttribute("data-waf-ai-entry");
    }
    // Restore remnants from an earlier version. There is no group indexing/filtering.
    for (const row of document.querySelectorAll("[data-waf-group]")) row.removeAttribute("data-waf-group");
    document.getElementById("waf-group-progress")?.remove();
  }
  function queue() { if (!queued) { queued = true; setTimeout(tagControls, 80); } }
  function apply() {
    const root = document.documentElement;
    if (!root) return;
    root.classList.remove("waf-groups");
    for (const key of Object.keys(config.defaults)) {
      if (key !== "enabled") root.classList.toggle(`waf-${key}`, settings.enabled && settings[key]);
    }
    syncTab();
    queue();
  }
  apply();
  document.addEventListener("DOMContentLoaded", apply, { once: true });
  new MutationObserver(queue).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-label", "title"] });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes[config.key]) return;
    revision += 1; settings = config.normalize(changes[config.key].newValue); apply();
  });
  const initial = revision;
  chrome.storage.local.get(config.key).then(async data => {
    if (initial === revision) { settings = config.normalize(data[config.key]); apply(); }
    if (Object.hasOwn(data[config.key] || {}, "groups")) await chrome.storage.local.set({ [config.key]: settings });
    await chrome.storage.local.remove(["whatsappFocusGroupStatus", "whatsappFocusGroupScan"]);
  }).catch(() => {});
})();
