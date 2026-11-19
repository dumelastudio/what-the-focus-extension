# What the Focus

Extensão da Dumela para ocultar distrações, acompanhar seu tempo ativo e fazer pausas no WhatsApp Web.

[Demo interativa](https://app.dumela.tv/what-the-focus/) · [Privacidade](https://app.dumela.tv/what-the-focus/privacy.html) · [Suporte](https://app.dumela.tv/what-the-focus/support.html) · [Documentação em inglês](../README.md)

## Instalação pelo código-fonte

No Google Chrome 120 ou superior, baixe e extraia o código, abra `chrome://extensions` e ative **Developer mode**. Clique em **Load unpacked** e selecione `extension/`. Recarregue o WhatsApp Web e abra a extensão pelo ícone na barra do Chrome ou na lateral do WhatsApp. Para atualizar, mantenha a mesma pasta, use **Reload** no card da extensão e recarregue o WhatsApp Web.

Também é possível baixar o ZIP de uma versão em [GitHub Releases](https://github.com/dumelastudio/what-the-focus-extension/releases). Nesse caso, o manifesto já fica na raiz da pasta extraída.

## Como usar

- **Distrações**. Escolha quais atalhos e indicadores ocultar. O modo de ícone fixo também esconde a contagem de não lidas no título da aba. A chave principal pausa todas as mudanças visuais.
- **Tempo**. Veja os totais do dia, da semana e do mês e o histórico dos últimos sete dias. Em instalações novas, o registro e o contador começam ligados. Você pode desligar cada opção ou apagar o histórico.
- **Foco**. Cubra a página com um contador e silencie o áudio das abas do WhatsApp Web por 30 minutos, 1 hora, 2 horas ou 4 horas. As mensagens continuam chegando. Use **Encerrar antes** para voltar à página. O silenciamento de notificações do Chrome é opcional e pode funcionar também fora das sessões.

Tema e idioma seguem o dispositivo por padrão. Alterne o tema pelo botão de aparência e abra o globo para escolher outro idioma. As preferências são salvas no perfil do Chrome.

## Privacidade e compatibilidade

O tempo mede uso ativo com a aba visível, em primeiro plano e na janela ativa. O registro pausa com o dispositivo ocioso ou bloqueado e durante sessões de foco. Totais por dia ficam neste perfil do Chrome por até 365 dias. A extensão não armazena conversas, contatos, URLs visitadas ou títulos de páginas. O silenciamento atua apenas no WhatsApp Web deste perfil. As notificações do celular e do app nativo dependem das configurações desses dispositivos.

O WhatsApp Web pode alterar a interface e mover controles ou trocar seus identificadores. Para colaborar, consulte o [guia de contribuição](../CONTRIBUTING.md) e a [arquitetura](ARCHITECTURE.md). Ao relatar uma falha, compartilhe a versão, o sistema e a opção afetada. Use exemplos fictícios para evitar expor contatos e conversas.

O What the Focus é uma extensão independente da Dumela, sem vínculo com WhatsApp ou Meta.
