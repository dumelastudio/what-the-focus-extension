from pathlib import Path
import json
ROOT=Path(__file__).parent
rules=['/* Appearance only. No chat filtering, private APIs or message processing. */']
nav={'status':['Status','Updates','Atualizações'],'channels':['Channels','Canais','Canales'],'communities':['Communities','Comunidades'],'metaAI':['Meta AI'],'media':['Media','Mídia'],'calls':['Calls','Chamadas']}
for key,names in nav.items():
    controls=[f'button[data-navbar-item][data-wf-ui="{key}"]']+[f'button[data-navbar-item][aria-label={json.dumps(label,ensure_ascii=False)}]' for label in names]
    selectors=[]
    for control in controls:
        selectors.extend([f'html.waf-{key} {control}',f'html.waf-{key} div:has(> {control}):not(:has(> [data-navbar-item] ~ [data-navbar-item]))'])
    rules.append(',\n'.join(selectors)+' { display:none !important; }')
standalone={
'archived':['Archived','Archived chats','Arquivadas','Conversas arquivadas','Archivados','Chats archivados','Discussions archivées','Archivierte Chats','Chat diarsipkan','संग्रहित चैट','الدردشات المؤرشفة','アーカイブ済み','已归档'],
'lockedChats':['Locked chats','Conversas bloqueadas','Conversas trancadas','Chats bloqueados','Discussions verrouillées','Gesperrte Chats','Chat terkunci','लॉक की गई चैट','الدردشات المقفلة','ロックされたチャット','已锁定聊天']}
for key,names in standalone.items():
    selectors=[]
    for name in names:
        for scope in ['#side','#pane-side']:
            for control in ['button','[role="button"]']:
                for op,label in [('=',name),('^=',name+',')]:
                    selectors.append(f'html.waf-{key} {scope} {control}[aria-label{op}{json.dumps(label,ensure_ascii=False)}]:not([role="row"] *):not([role="gridcell"] *)')
    if key=='archived':
        # The current chat list gives its archive entry a dedicated ID, independent of the label and icon.
        selectors.append('html.waf-archived button[data-testid="chatlist-panel-archived-button"]')
        for icon in ['archived','archive','wds-ic-archived','wds-ic-archive']:
            for scope in ['#side','#pane-side']:
                selectors.append(f'html.waf-archived {scope} :is(button,[role="button"]):has([data-icon="{icon}"]):not([role="row"] *):not([role="gridcell"] *)')
    rules.append(',\n'.join(selectors)+' { display:none !important; }')
rules.append('''
html.waf-metaAI [data-waf-ai-entry],
html.waf-metaAI :is(button,[role="button"])[aria-label="Ask Meta AI"]:not([role="row"] *) { display:none !important; }
''')
# Keep the avatar wrapper in place and suppress only its status decoration.
chat_list = ':is(#pane-side, [data-testid="chatlist-panel"])'
ring = f'html.waf-status :is([data-testid="chatlist-status-ring"], {chat_list} [data-testid="status-ring"])'
inner_ring = f'{ring} > div:not([role="img"])'
rules.append(f'''
{ring},
{inner_ring} {{
  background:none !important; border-color:transparent !important; box-shadow:none !important; outline:none !important;
}}
{ring}::before,
{ring}::after,
{inner_ring}::before,
{inner_ring}::after,
{ring}:is(svg,canvas) {{ display:none !important; }}
{ring} svg :is(circle,path):is([fill="none"][stroke], [stroke-dasharray]) {{ stroke:none !important; }}
{ring} [role="button"] {{ pointer-events:none !important; }}
''')
# The status avatar reserves four pixels inside its SVG for the ring. Give
# that space back to the photo while preserving its circular mask and crop.
inset_image = 'image[x="4"][y="4"]'
status_photo = (f'html.waf-status [data-testid="chatlist-status-ring"] svg'
                f':has(> mask > g[fill="white"] > circle):has(> g[mask] > {inset_image})')
rules.append(f'''
{status_photo} > g[mask] > {inset_image} {{
  x:0 !important; y:0 !important; width:100% !important; height:100% !important;
}}
{status_photo} > mask > g[fill="white"] > circle {{ r:50% !important; }}
{status_photo} > g[mask] > g[stroke="var(--WDS-components-outline-profile-photo)"] > circle {{
  r:calc(50% - 0.5px) !important;
}}
''')
(ROOT/'extension/rules.css').write_text('\n\n'.join(rules))
print('Appearance rules generated.')
