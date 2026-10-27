# Replay — seu canal de gameplay

Site estático para GitHub Pages. Edite os arquivos pelo VS Code. Nenhuma alteração é publicada até você enviar os arquivos para o GitHub.

## Adicionar um vídeo que aparece no site publicado

1. Copie o vídeo para a pasta `videos/` (use um nome simples, como `valorant-ace.mp4`).
2. Abra `catalogo.js` no VS Code e copie o bloco de exemplo para dentro de `window.REPLAY_VIDEOS`.
3. Preencha `title`, `game`, `date`, `duration` e `description`. Em `url`, informe o caminho do arquivo, por exemplo `videos/valorant-ace.mp4`. `coverUrl` e `captionUrl` são opcionais.
4. Salve e confira a página com Live Server. Quando enviar a alteração para o GitHub, o Pages publica o novo vídeo junto com o site.

O site não mostra controles para adicionar, editar ou apagar partidas ou jogos. Essa manutenção é feita diretamente no VS Code: altere os itens em `catalogo.js`, onde também pode mudar título, jogo e caminhos de vídeo, capa e legenda. Para trocar a capa ou legenda, atualize o respectivo arquivo dentro de `videos/` e seu caminho no catálogo. Para remover um vídeo, remova seu bloco do catálogo; para remover ou adicionar um filtro de jogo, ajuste `window.REPLAY_GAMES`.

Curtidas, comentários e favoritos ficam no navegador em que foram feitos. O GitHub Pages não oferece um banco de dados para sincronizar esses dados entre aparelhos. A lista de jogos é definida no código em `catalogo.js`.

## Pastas e arquivos

- `catalogo.js`: lista dos jogos e dos vídeos que acompanham o site.
- `videos/`: vídeos, capas e legendas `.vtt` adicionados manualmente.
- `app.js`, `styles.css`, `index.html`: funcionamento e aparência.

## GitHub Pages e privacidade

O site do GitHub Pages é público na internet, mesmo quando o repositório é privado. Qualquer vídeo incluído no catálogo e no repositório também poderá ser visto por outras pessoas. Não coloque aqui vídeos que devam ficar privados. [Documentação do GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

O GitHub bloqueia arquivos maiores que 100 MiB e recomenda repositórios pequenos; o site publicado tem limite de 1 GB. Vídeos grandes podem tornar esse caminho imprático. [Limites de arquivos](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github) · [Limites do Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
