(async () => {
  const frame = document.getElementById('popup');
  const content = document.getElementById('content');
  const results = [];
  const assert = (name, pass) => results.push({ name, pass: Boolean(pass) });
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const loaded = iframe => new Promise(resolve => { if (iframe.contentDocument?.readyState === 'complete' && iframe.contentDocument.URL !== 'about:blank') resolve(); else iframe.addEventListener('load', resolve, { once:true }); });
  await loaded(frame); await wait(80);
  let doc = frame.contentDocument;
  let win = frame.contentWindow;
  let master = doc.getElementById('enabled');
  if (!master.checked) { doc.querySelector('.focus-control').click(); await wait(40); }
  assert('Main control is an accessible switch', master.getAttribute('role') === 'switch' && !master.disabled);
  assert('Group feature and scan controls absent', !doc.querySelector('#groups,#scan-groups'));
  assert('Nine feature choices include the optional fixed tab icon', doc.querySelectorAll('#features .feature-row').length === 9 && !doc.getElementById('favicon').checked);
  for (const panel of ['distractions','time','focus']) {
    doc.getElementById(`tab-${panel}`).click();
    assert(`${panel} keeps a fixed 560px popup and visible footer`, Math.round(doc.documentElement.getBoundingClientRect().height) === 560 && Math.round(doc.body.getBoundingClientRect().height) === 560 && doc.querySelector('.app-footer').getBoundingClientRect().bottom <= 560);
  }
  doc.getElementById('tab-time').click();
  const history = doc.querySelector('.time-history'); history.open = true;
  assert('Expanded time history scrolls internally without changing popup height', Math.round(doc.body.getBoundingClientRect().height) === 560 && win.getComputedStyle(doc.querySelector('main')).overflowY === 'auto' && doc.querySelector('.app-footer').getBoundingClientRect().bottom <= 560);
  history.open = false; doc.getElementById('tab-distractions').click();
  const headerButtons = Array.from(doc.querySelectorAll('.top-controls .icon-button'));
  assert('Top controls use two vector icons with no extra letters', headerButtons.length === 2 && headerButtons.every(button => button.querySelector('svg') && !button.textContent.trim()));
  assert('System title tooltips are absent from top controls', headerButtons.every(button => !button.hasAttribute('title') && !button.hasAttribute('data-i18n-title')));
  const tooltip = doc.getElementById('focus-tooltip');
  const themeTrigger = doc.getElementById('theme-button');
  themeTrigger.dispatchEvent(new win.PointerEvent('pointerover',{bubbles:true,pointerType:'mouse'}));
  assert('Custom tooltip appears synchronously on hover', !tooltip.hidden && tooltip.matches(':popover-open') && tooltip.textContent === themeTrigger.dataset.tooltip);
  const tooltipBox = tooltip.getBoundingClientRect();
  assert('Tooltip stays inside the popup viewport', tooltipBox.left >= 0 && tooltipBox.right <= Math.min(win.innerWidth,doc.documentElement.getBoundingClientRect().right) && tooltipBox.top >= 0);
  doc.dispatchEvent(new win.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert('Escape dismisses the custom tooltip and clears its description', tooltip.hidden && !themeTrigger.hasAttribute('aria-describedby'));
  themeTrigger.dispatchEvent(new win.PointerEvent('pointerout',{bubbles:true,pointerType:'mouse'}));
  themeTrigger.focus();
  assert('Keyboard focus shows an accessible tooltip', !tooltip.hidden && themeTrigger.getAttribute('aria-describedby') === tooltip.id);
  themeTrigger.dispatchEvent(new win.PointerEvent('pointerdown',{bubbles:true,pointerType:'mouse'}));
  assert('Pointer activation dismisses the tooltip', tooltip.hidden);
  const media = doc.getElementById('media');
  const originalMedia = media.checked;
  doc.querySelector('label:has(#media) span').click(); await wait(40);
  assert('Clicking row text toggles exactly once', media.checked === !originalMedia);
  doc.querySelector('label:has(#media)').click(); await wait(40);
  assert('Clicking row background restores exactly once', media.checked === originalMedia);
  doc.querySelector('.focus-control strong').click(); await wait(40);
  assert('Main box toggles and disables features', !master.checked && doc.getElementById('features').disabled);
  doc.querySelector('.focus-control').click(); await wait(40);
  assert('Master switch restores feature choices', master.checked && !doc.getElementById('features').disabled && media.checked === originalMedia);
  const systemDark = win.matchMedia('(prefers-color-scheme: dark)').matches;
  const opposite = systemDark ? 'light' : 'dark';
  const systemTheme = systemDark ? 'dark' : 'light';
  for (const theme of [opposite,systemTheme,'system']) {
    themeTrigger.click(); await wait(30);
    assert(`${theme} theme applies on click`, doc.documentElement.dataset.theme === theme);
    const buttonStyle=win.getComputedStyle(themeTrigger),rootStyle=win.getComputedStyle(doc.documentElement);
    assert(`${theme} top controls have a neutral fill and no border`, buttonStyle.backgroundColor !== rootStyle.backgroundColor && buttonStyle.borderTopWidth === '0px' && themeTrigger.offsetWidth === themeTrigger.offsetHeight);
  }
  themeTrigger.click(); await wait(30);
  const languageIds = ['pt','es','fr','de','id','hi','ar','ja','zh-CN','en'];
  for (const language of languageIds) {
    doc.getElementById('language-button').click();
    doc.querySelector(`[data-language-value="${language}"]`).click(); await wait(25);
    assert(`${language} manual language applies`, doc.documentElement.lang === (language === 'pt' ? 'pt-BR' : language) && doc.querySelector('[data-i18n="enabledTitle"]').textContent === win.FocusLocales[language].enabledTitle);
    if (language === 'ar') assert('Arabic uses right-to-left layout', doc.documentElement.dir === 'rtl');
  }
  doc.getElementById('language-button').click();
  doc.querySelector('[data-language-value="automatic"]').click(); await wait(25);
  const automaticLanguage = win.FocusI18n.resolve(win.navigator.language);
  assert('Automatic language follows browser language', doc.documentElement.lang === (automaticLanguage === 'pt' ? 'pt-BR' : automaticLanguage));
  doc.getElementById('language-button').click();
  doc.querySelector('[data-language-value="en"]').click(); await wait(25);
  const languageTrigger=doc.getElementById('language-button');
  languageTrigger.click();
  assert('Menu opens with focus on the selected item', languageTrigger.getAttribute('aria-expanded') === 'true' && doc.activeElement.getAttribute('role') === 'menuitemradio');
  doc.dispatchEvent(new win.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert('Escape closes menu and restores trigger focus', doc.getElementById('language-menu').hidden && doc.activeElement === languageTrigger);
  const stored = JSON.parse(win.localStorage.getItem('whatsapp-focus-demo:automated-tests:whatsappFocusAppearance'));
  assert('Theme and manual language persist locally', stored?.theme === opposite && stored?.language === 'en');
  const allLinks = Array.from(doc.querySelectorAll('a'));
  assert('Product and Dumela links present', allLinks.some(a => a.href.endsWith('/extension/product/index.html')) && allLinks.some(a => a.href === 'https://app.dumela.tv/'));
  assert('Unsupported browser language falls back to English', win.FocusI18n.resolve('ko-KR') === 'en');
  assert('Regional language variants normalize', win.FocusI18n.resolve('pt-PT') === 'pt' && win.FocusI18n.resolve('zh-TW') === 'zh-CN');
  await loaded(content);
  const deadline = Date.now()+3000;
  while (!content.contentDocument.body.dataset.result && Date.now()<deadline) await wait(50);
  assert('Content-script and group-removal integration passes', content.contentDocument.body.dataset.result === 'pass');
  const errorFrame = document.getElementById('storage-error');
  await loaded(errorFrame); await wait(30);
  const errorDoc = errorFrame.contentDocument;
  assert('Unavailable storage shows an explicit recoverable error', errorDoc.getElementById('feedback').textContent === errorFrame.contentWindow.FocusLocales.en.errorLoad);
  assert('Storage failure keeps controls disabled', errorDoc.getElementById('enabled').disabled && errorDoc.getElementById('features').disabled);
  const failed = results.filter(item => !item.pass);
  document.getElementById('result').textContent = `${results.length-failed.length}/${results.length} interface checks passed`;
  for (const result of results) { const li=document.createElement('li'); li.textContent=`${result.pass?'OK':'FAIL'}: ${result.name}`; document.getElementById('checks').append(li); }
  document.body.dataset.result = failed.length ? 'fail' : 'pass';
})();
