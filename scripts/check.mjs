import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const extension=path.join(root,'extension');
const manifest=JSON.parse(fs.readFileSync(path.join(extension,'manifest.json'),'utf8'));
assert.equal(manifest.version,'0.3.13');
assert.equal(manifest.default_locale,'en');
assert.deepEqual(manifest.optional_permissions,['contentSettings']);
assert.deepEqual(manifest.host_permissions,['https://web.whatsapp.com/*']);
assert.equal(manifest.background.service_worker,'background.js');
assert.deepEqual(manifest.permissions,['storage','alarms','idle']);
assert.deepEqual(manifest.content_scripts[0].matches,['https://web.whatsapp.com/*']);
assert.deepEqual(manifest.content_scripts[0].js,['settings.js','content.js','locale-data.js','i18n.js','focus-core.js','runtime-client.js','focus-page.js','home.js']);
assert.deepEqual(manifest.web_accessible_resources,[{resources:['home-panel.html'],matches:['https://web.whatsapp.com/*']}]);
assert(!fs.existsSync(path.join(extension,'groups.js')));
const context=vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(extension,'settings.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(extension,'locale-data.js'),'utf8'),context);
assert(!Object.hasOwn(context.WhatsAppFocus.defaults,'groups'));
assert.equal(context.WhatsAppFocus.normalize({enabled:false,status:false,groups:true}).status,false);
assert(!Object.hasOwn(context.WhatsAppFocus.normalize({groups:true}),'groups'));
assert.equal(context.WhatsAppFocus.normalizeAppearance({theme:'invalid',language:'not-real'}).theme,'system');
const data=context.FocusLocales;
assert.equal(Object.keys(data).length,10);
assert(!fs.existsSync(path.join(extension,'_locales','pt')),'Chrome Web Store requires pt_BR');
const keys=Object.keys(data.en).sort();
for (const [language,strings] of Object.entries(data)) {
  assert.deepEqual(Object.keys(strings).sort(),keys,`Incomplete language: ${language}`);
  for (const [key,value] of Object.entries(strings)) {
    assert.equal(typeof value,'string'); assert(value.trim(),`Empty ${language}.${key}`);
    assert(!/[\u2013\u2014]/u.test(value),`Prohibited dash in ${language}.${key}`);
  }
  const dir={'zh-CN':'zh_CN',pt:'pt_BR'}[language] ?? language;
  const messages=JSON.parse(fs.readFileSync(path.join(extension,'_locales',dir,'messages.json'),'utf8'));
  assert.equal(messages.extensionName.message,'What the Focus');
  assert(messages.extensionDescription.message.length<=132);
}
for (const size of [16,32,48,128]) {
  const png=fs.readFileSync(path.join(extension,'icons',`icon${size}.png`));
  assert.equal(png.readUInt32BE(16),size); assert.equal(png.readUInt32BE(20),size);
}
for (const name of ['tooltips.js','popup.js','storage.js','content.js','i18n.js','focus-core.js','focus-controller.js','focus-popup.js','focus-page.js','runtime-client.js','background.js','home.js','home-panel.js']) {
  const source=fs.readFileSync(path.join(extension,name),'utf8');
  new vm.Script(source,{filename:name});
  assert(!/\b(fetch|XMLHttpRequest|WebSocket|eval)\s*\(/.test(source),`Unexpected network or execution in ${name}`);
}
const contentSource=fs.readFileSync(path.join(extension,'content.js'),'utf8');
assert(!/scrollTop|\.click\(|cell-frame-title|new Set\(\).*groups|WhatsAppFocusGroups/.test(contentSource));
const favicon=fs.readFileSync(path.join(extension,'icons','icon32.png')).toString('base64');
assert(contentSource.includes(`data:image/png;base64,${favicon}`));
const popup=fs.readFileSync(path.join(extension,'popup.html'),'utf8');
assert(!/id="groups"|scan-groups|group-status/.test(popup));
assert(popup.includes('role="switch"'));
assert(!/on(click|load|change)=/.test(popup));
assert(fs.existsSync(path.join(extension,'product','privacy.html')));
assert(fs.existsSync(path.join(extension,'product','support.html')));
console.log(`PASS: manifest, migration, ${Object.keys(data).length} complete locales × ${keys.length} strings, icons, permission and network boundaries.`);
