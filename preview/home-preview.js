(() => {
  'use strict';
  const workspace = document.getElementById('workspace');
  const intro = workspace.firstElementChild;
  const header = document.querySelector('[data-testid="chatlist-header"]');
  const params = new URLSearchParams(location.search);
  const language = params.get('lang');
  const translations = {
    en: ['Sample sidebar', 'Updates', 'Settings', 'Demo with sample data.', 'Sample project', 'Sample studio', 'Sample welcome page', 'Sample updates', 'Sample conversation', 'Local draft', 'Sample draft'],
    es: ['Barra lateral de ejemplo', 'Novedades', 'Ajustes', 'Demostración con datos ficticios.', 'Proyecto de ejemplo', 'Estudio de ejemplo', 'Pantalla de bienvenida de ejemplo', 'Novedades de ejemplo', 'Conversación de ejemplo', 'Borrador local', 'Borrador de ejemplo'],
    pt: ['Barra lateral fictícia', 'Atualizações', 'Configurações', 'Página de demonstração. Dados fictícios.', 'Projeto de exemplo', 'Estúdio de exemplo', 'Tela de abertura fictícia', 'Atualizações fictícias', 'Conversa fictícia para validar a navegação.', 'Rascunho local', 'Rascunho fictício'],
  };
  const [sidebarLabel, updatesLabel, settingsLabel, note, project, studio, welcome, updatesCopy, chatCopy, draftLabel, draftCopy] =
    Object.hasOwn(translations, language) ? translations[language] : translations.pt;
  const updates = document.getElementById('demo-updates');
  document.documentElement.lang = language === 'en' || language === 'es' ? language : 'pt-BR';
  document.documentElement.dataset.demoTheme = params.get('theme') === 'dark' ? 'dark' : 'light';
  document.querySelector('nav').setAttribute('aria-label', sidebarLabel);
  updates.setAttribute('aria-label', updatesLabel);
  document.getElementById('demo-settings').setAttribute('aria-label', settingsLabel);
  document.querySelector('#pane-side p').textContent = note;
  const triggers = document.querySelectorAll('[data-demo-chat]');
  triggers[0].firstElementChild.textContent = project;
  triggers[1].firstElementChild.textContent = studio;
  intro.textContent = welcome;
  const layout = params.get('layout');
  if (layout === 'updated' || layout === 'detached') {
    document.getElementById('app').dataset.layout = layout;
    intro.removeAttribute('data-testid');
  }
  if (layout === 'detached') {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'contents';
    workspace.before(wrapper);
    wrapper.append(workspace);
  }
  if (params.get('frame') === 'blocked') {
    const policy = document.createElement('meta');
    policy.httpEquiv = 'Content-Security-Policy';
    policy.content = "frame-src 'none'";
    document.head.append(policy);
  }
  const showIntro = () => {
    header.hidden = false;
    workspace.replaceChildren(intro);
  };
  updates.addEventListener('click', () => {
    header.hidden = true;
    workspace.textContent = updatesCopy;
  });
  for (const trigger of triggers) {
    trigger.addEventListener('click', () => {
      const chat = document.createElement('div');
      chat.id = 'main';
      const heading = document.createElement('strong');
      heading.textContent = trigger.textContent.trim();
      const description = document.createElement('p');
      description.textContent = chatCopy;
      const draft = document.createElement('input');
      draft.placeholder = draftLabel;
      draft.setAttribute('aria-label', draftLabel);
      if (trigger.dataset.demoChat === 'ignore-escape') draft.value = draftCopy;
      chat.append(heading, description, draft);
      chat.addEventListener('keydown', event => {
        if (event.key === 'Escape' && trigger.dataset.demoChat !== 'ignore-escape') showIntro();
      });
      workspace.replaceChildren(chat);
    });
  }
  document.querySelector('[aria-label="Chats"]').addEventListener('click', showIntro);
})();
