(() => {
  'use strict';

  const demo = new URLSearchParams(location.search).get('demo') === '1' && !globalThis.chrome?.runtime?.id;
  const parentOrigin = demo ? location.origin : 'https://web.whatsapp.com';
  const embedded = window.parent !== window && window.parent === window.top &&
    location.ancestorOrigins?.[0] === parentOrigin;
  let inView = false;
  const observer = new IntersectionObserver(([entry]) => {
    inView = entry.intersectionRatio >= 0.9;
  }, { threshold: [0, 0.9, 1] });
  const viewport = document.createElement('div');
  viewport.className = 'home-viewport';
  viewport.setAttribute('aria-hidden', 'true');
  document.body.append(viewport);
  observer.observe(viewport);

  // Accept only browser-generated input in the expected, substantially visible frame.
  for (const type of ['click', 'change', 'keydown']) {
    document.addEventListener(type, event => {
      if (event.isTrusted && embedded && inView &&
          innerWidth >= 250 && innerHeight >= 240) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
  }

  function dismiss() {
    window.parent.postMessage('wtf-home-dismiss', parentOrigin);
  }
  document.getElementById('home-dismiss').addEventListener('click', dismiss);
  window.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || event.defaultPrevented || document.querySelector('dialog[open]')) return;
    event.preventDefault();
    dismiss();
  });
  if (embedded) window.parent.postMessage('wtf-home-ready', parentOrigin);
})();
