# Integração com o Google Agenda

1. Abra [script.google.com](https://script.google.com) com a conta que possui a agenda de plantões.
2. Abra o projeto que atualmente atende a URL usada em `api/agenda.js` ou crie um novo projeto.
3. Substitua o conteúdo por `Agenda.gs`.
4. Em **Implantar > Nova implantação > App da Web**, execute como você e permita acesso a qualquer pessoa com o link.
5. Se a implantação gerar uma URL diferente, substitua `AGENDA_URL` em `api/agenda.js`.

Os nomes e períodos configurados no site são enviados à função somente ao sincronizar. Para aceitar mais de uma forma de escrever um local nos eventos, separe os termos com `|`, por exemplo: `Leonor|Hospital Leonor`.
