(() => {
  'use strict';

  const chatList = '[data-testid="chatlist-header"]';
  const chatPanel = '#main, [data-testid="conversation-panel-wrapper"], [data-testid="conversation-panel-messages"], [data-testid="conversation-header"], [contenteditable="true"][role="textbox"]';
  const intro = '[data-testid^="intro-panel-"], [data-testid^="intro-md-beta-logo-"], [data-asset-intro-image-light="true"], [data-asset-intro-image-dark="true"]';
  const nativeShortcut = 'button[data-navbar-item]';
  const chatEntry = '[role="row"],[role="gridcell"],[data-testid="cell-frame-container"]';
  const brand = 'What the Focus';
  const demo = FocusClient.demo;
  const page = new URL(location.href);
  const extensionRoot = demo ? new URL('../extension/', page).href : chrome.runtime.getURL('');
  const panelURL = new URL('home-panel.html', extensionRoot);
  if (demo) {
    panelURL.search = page.search;
    panelURL.searchParams.set('demo', '1');
  }
  const panelOrigin = demo ? page.origin : extensionRoot.replace(/\/$/, '');

  const make = (tag, attrs = {}) => {
    const node = document.createElement(tag);
    for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
    return node;
  };

  const shortcut = make('div', { id: 'wtf-home-shortcut' });
  const shortcutRoot = shortcut.attachShadow({ mode: 'open' });
  const button = make('button', { type: 'button', title: brand, 'aria-label': brand, 'aria-pressed': 'false' });
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('aria-hidden', 'true');
  const corners = document.createElementNS(icon.namespaceURI, 'path');
  corners.setAttribute('d', 'M4 9V4h5 M15 4h5v5 M20 15v5h-5 M9 20H4v-5');
  const dot = document.createElementNS(icon.namespaceURI, 'rect');
  dot.setAttribute('x', '9'); dot.setAttribute('y', '9');
  dot.setAttribute('width', '6'); dot.setAttribute('height', '6');
  dot.setAttribute('rx', '1');
  icon.append(corners, dot);
  button.append(icon);
  const iconStyle = make('style');
  iconStyle.textContent = `
    button{display:grid;place-items:center;width:40px;height:40px;padding:0;border:0;border-radius:50%;background:transparent;color:#16844b;cursor:pointer}
    button:hover{background:#16844b23}
    button[aria-pressed="true"]{background:#176842;color:#fff}
    button:focus-visible{outline:2px solid #16844b;outline-offset:2px}
    svg{width:23px;height:23px;fill:currentColor}
    path{fill:none;stroke:currentColor;stroke-width:2;stroke-linejoin:round;stroke-linecap:round}
    @media(prefers-color-scheme:dark){button:not([aria-pressed="true"]){color:#16844b}}
  `;
  shortcutRoot.append(iconStyle, button);

  const host = make('div', { id: 'wtf-home-view', hidden: '' });
  const frame = make('iframe', { title: brand, hidden: '' });
  const notice = make('div', { class: 'wtf-home-notice' });
  const status = make('p', { role: 'status' });
  const back = make('button', { type: 'button' });
  notice.append(status, back);
  host.append(frame, notice);
  let panel = null;
  let lockedPanel = null;
  let observedHeader = null;
  let observedPanel = null;
  let requested = false;
  let dismissed = false;
  let focusRequested = false;
  let frameState = 'loading';
  let queued = false;

  function visible(node) {
    return Boolean(node && node.getBoundingClientRect().width && node.getBoundingClientRect().height &&
      getComputedStyle(node).visibility === 'visible');
  }

  function findRail(root) {
    const first = root.querySelector(nativeShortcut);
    for (let node = first?.parentElement; node && node !== root; node = node.parentElement) {
      if (node.querySelectorAll(nativeShortcut).length < 2) continue;
      const { width, height } = node.getBoundingClientRect();
      if (width <= 120 && height > width) return node;
    }
    return null;
  }

  function chatsButton(rail) {
    return Array.from(rail?.querySelectorAll(nativeShortcut) || []).find(item =>
      /^(chats|conversas)$/i.test(item.getAttribute('aria-label')?.trim() || '') ||
      /^wds-ic-chat(?:-filled|-outline)?$/.test(item.querySelector('svg title')?.textContent || ''));
  }

  function fitsBeside(node, list, rtl) {
    if (!visible(node)) return false;
    const rect = node.getBoundingClientRect();
    const bounds = list.getBoundingClientRect();
    const gap = rtl ? bounds.left - rect.right : rect.left - bounds.right;
    return gap >= -4 && rect.width >= 250 && rect.height >= 240 &&
      rect.top <= bounds.top + 56 && rect.bottom >= bounds.bottom - 56;
  }

  function findPanel(root, header, list, rtl) {
    // Prefer the sibling of the chat list column. WhatsApp can change or omit
    // the contents of this pane without changing its position in the layout.
    for (let column = header; column !== root; column = column.parentElement) {
      if (list && !column.contains(list)) continue;
      for (const sibling of column.parentElement.children) {
        if (fitsBeside(sibling, column, rtl)) return sibling;
      }
    }
    const markers = root.querySelectorAll(`${intro}, ${chatPanel}`);
    for (const marker of markers) {
      if (!visible(marker)) continue;
      let match = null;
      for (let node = marker; node !== root && !node.contains(header); node = node.parentElement) {
        if (fitsBeside(node, list || header, rtl)) match = node;
      }
      if (match) return match;
    }
    return null;
  }

  function fallbackBounds(root, header, rtl) {
    const app = root.getBoundingClientRect();
    const list = header?.getBoundingClientRect();
    const left = Math.max(0, app.left, list && !rtl ? list.right : 0);
    const right = Math.min(innerWidth, app.right, list && rtl ? list.left : innerWidth);
    const top = Math.max(0, app.top);
    const height = Math.min(innerHeight, app.bottom) - top;
    if (right - left >= 250 && height >= 240) return { left, top, width: right - left, height };
    return { left: Math.max(0, app.left), top, width: Math.min(innerWidth, app.width), height };
  }

  function releasePanel() {
    if (!lockedPanel) return;
    lockedPanel.inert = false;
    lockedPanel = null;
  }

  function hide() {
    if (!host.hidden) host.hidden = true;
    button.setAttribute('aria-pressed', 'false');
    releasePanel();
  }

  function dismiss() {
    requested = false;
    focusRequested = false;
    dismissed = true;
    hide();
    button.focus();
  }

  function renderFrame() {
    const ready = frameState === 'ready';
    if (frame.hidden === ready) frame.hidden = !ready;
    if (notice.hidden !== ready) notice.hidden = ready;
    if (!ready) {
      const message = FocusI18n.t(frameState === 'loading' ? 'loading' : 'homeUnavailable');
      if (status.textContent !== message) status.textContent = message;
      const label = FocusI18n.t('homeDismiss');
      if (back.textContent !== label) back.textContent = label;
    }
    if (focusRequested && frameState !== 'loading' && !host.hidden) {
      focusRequested = false;
      (ready ? frame : back).focus();
    }
  }

  function paint() {
    queued = false;
    const root = document.getElementById('app');
    const header = root?.querySelector(chatList);
    const rail = root && findRail(root);
    if (rail && shortcut.parentElement !== rail) rail.append(shortcut);
    if (!rail) shortcut.remove();
    const inChats = visible(header);
    const rtl = root && getComputedStyle(root).direction === 'rtl';
    const list = inChats && root.querySelector('#pane-side');
    panel = inChats ? findPanel(root, header, list, rtl) : null;

    if (header !== observedHeader || panel !== observedPanel) {
      sizes.disconnect();
      if (header) sizes.observe(header);
      if (panel) sizes.observe(panel);
      observedHeader = header;
      observedPanel = panel;
    }

    const activeView = panel || root;
    const hasChat = Boolean(inChats && activeView && (activeView.matches(chatPanel) ||
      Array.from(activeView.querySelectorAll(chatPanel)).some(visible)));
    const hasIntro = Boolean(panel && (panel.matches(intro) ||
      Array.from(panel.querySelectorAll(intro)).some(visible)));
    if (hasChat) dismissed = false;
    if (!root || !rail || (!requested && (!inChats || hasChat || dismissed || !panel || (!hasIntro && !visible(list))))) {
      hide();
      return;
    }

    if (lockedPanel !== panel) {
      releasePanel();
      if (panel && !panel.inert) {
        panel.inert = true;
        lockedPanel = panel;
      }
    }
    const rect = panel?.getBoundingClientRect() || fallbackBounds(root, inChats ? list || header : null, rtl);
    for (const property of ['top', 'left', 'width', 'height']) host.style[property] = `${rect[property]}px`;
    if (!host.isConnected) document.body.append(host);
    if (host.hidden) host.hidden = false;
    if (!frame.hasAttribute('src')) {
      frame.src = panelURL.href;
      setTimeout(() => {
        if (frameState !== 'loading') return;
        frameState = 'unavailable';
        renderFrame();
      }, 5000);
    }
    button.setAttribute('aria-pressed', 'true');
    renderFrame();
  }

  function queue() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(paint);
  }
  const sizes = new ResizeObserver(queue);

  button.addEventListener('click', event => {
    if (!event.isTrusted) return;
    requested = true;
    focusRequested = true;
    dismissed = false;
    if (!visible(document.querySelector(chatList))) chatsButton(shortcut.parentElement)?.click();
    const chat = panel?.matches(chatPanel) ? panel : panel?.querySelector(chatPanel);
    if (visible(chat)) {
      // Ask WhatsApp to close the current view via its standard shortcut.
      // Some versions ignore synthetic keyboard events. The view can still open over the chat.
      chat.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true, cancelable: true
      }));
    }
    paint();
  });
  back.addEventListener('click', event => { if (event.isTrusted) dismiss(); });

  document.addEventListener('click', event => {
    if (!event.isTrusted || !(event.target instanceof Element)) return;
    const openedChat = event.target.closest('#pane-side') && event.target.closest(chatEntry);
    if (event.target.closest(nativeShortcut) || openedChat) {
      requested = false;
      focusRequested = false;
      dismissed = Boolean(openedChat);
      hide();
      queue();
    }
  }, true);

  window.addEventListener('message', event => {
    if (event.source !== frame.contentWindow || event.origin !== panelOrigin) return;
    if (event.data === 'wtf-home-ready') {
      frameState = 'ready';
      renderFrame();
    }
    if (event.data === 'wtf-home-dismiss') dismiss();
  });

  new MutationObserver(queue).observe(document, {
    childList: true, subtree: true, attributes: true,
    attributeFilter: ['aria-selected', 'aria-hidden', 'hidden', 'data-testid']
  });
  window.addEventListener('resize', queue);
  window.addEventListener('scroll', () => { if (!host.hidden) queue(); }, true);
  queue();
})();
