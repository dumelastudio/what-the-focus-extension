from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json, shutil, subprocess

ROOT = Path(__file__).resolve().parents[1]
VERSION = json.loads((ROOT / 'extension/manifest.json').read_text())['version']

for script in ['locales.py', 'icons.py']:
    subprocess.run(['python3', str(ROOT / 'scripts' / script)], check=True)
subprocess.run(['python3', str(ROOT / 'build_rules.py')], check=True)

product = ROOT / 'extension/product'
product.mkdir(exist_ok=True)
for name in ['index.html', 'privacy.html', 'support.html', 'site.css', 'site.js']:
    text = (ROOT / 'site' / name).read_text()
    if name.endswith('.html'):
        text = text.replace('data-theme="system"', 'data-theme="system" data-installed-product="true"', 1)
        text = text.replace('../extension/', '../')
    if name == 'privacy.html':
        text = text.replace('data-i18n="privacyBody"', 'data-i18n="focusPrivacyBody"')
    (product / name).write_text(text)
(product / 'assets').mkdir(exist_ok=True)
shutil.copy2(ROOT / 'site/assets/editorial.png', product / 'assets/editorial.png')

error_html=(ROOT / 'extension/popup.html').read_text().replace('<meta charset="utf-8">','<meta charset="utf-8"><base href="../extension/">',1).replace('<script src="storage.js" defer>', '<script src="../tests/error-api.js" defer></script><script src="storage.js" defer>',1)
(ROOT / 'tests/storage-error.html').write_text(error_html)

permission_html=(ROOT / 'extension/popup.html').read_text().replace('<meta charset="utf-8">','<meta charset="utf-8"><base href="../extension/">',1).replace('<script src="focus-popup.js" defer>', '<script src="../tests/permission-probe.js" defer></script><script src="focus-popup.js" defer>',1)
(ROOT / 'tests/permission-popup.html').write_text(permission_html)

home = (ROOT / 'extension/popup.html').read_text()
welcome = '''
  <button type="button" id="home-dismiss" class="home-dismiss quiet-button" data-i18n="homeDismiss">Back to WhatsApp</button>
  <section class="home-welcome" aria-labelledby="home-title">
    <img src="icons/mark.svg" width="76" height="76" alt="">
    <h1 id="home-title" data-i18n="homeTitle">Welcome to What the Focus</h1>
    <p data-i18n="homeBody">Make WhatsApp Web your own, see your time and take a break when you need one.</p>
  </section>
  <div class="home-controls">'''
home = home.replace('data-theme="system"','data-theme="system" data-home-panel',1)
home = home.replace('<link rel="stylesheet" href="popup.css">','<link rel="stylesheet" href="popup.css">\n  <link rel="stylesheet" href="home-panel.css">\n  <script src="home-panel.js" defer></script>',1)
home = home.replace('<body>', '<body>'+welcome,1).replace('</body>', '  </div>\n</body>',1)
home = home.replace('<div class="brand-copy"><h1>What the Focus</h1>', '<div class="brand-copy"><h2>What the Focus</h2>',1)
(ROOT / 'extension/home-panel.html').write_text(home)

download = ROOT / 'site/downloads'
download.mkdir(exist_ok=True)
archive = download / f'what-the-focus-{VERSION}.zip'
with ZipFile(archive, 'w', ZIP_DEFLATED) as package:
    for file in sorted((ROOT / 'extension').rglob('*')):
        if file.is_file() and not file.name.startswith('.'):
            package.write(file, file.relative_to(ROOT / 'extension'))
    for notice in ['LICENSE', 'NOTICE.md']:
        package.write(ROOT / notice, notice)
print(f'Built extension and packaged product page: {archive.name}')
