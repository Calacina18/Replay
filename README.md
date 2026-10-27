# Replay — seu canal de gameplay

App pessoal de vídeos de jogos em português. A interface continua sendo editada no VS Code. A versão publicada usa Cloudflare Pages Functions, D1, R2 privado e Cloudflare Access.

## O que fica sincronizado

- Vídeos, capas e legendas `.vtt` ficam em um bucket R2 privado.
- Nomes, jogos, curtidas e comentários ficam no banco D1.
- Os arquivos não são servidos por um endereço público do R2. O app entrega o vídeo pelo servidor autenticado; o envio usa um link de gravação temporário, limitado a um único arquivo e válido por 10 minutos.
- Curtidas e comentários são identificados pelo e-mail autenticado no Cloudflare Access.
- Favoritos e tema continuam sendo preferências locais do navegador.

## Desenvolvimento pelo VS Code

1. Instale Node.js LTS e abra esta pasta no VS Code.
2. Rode `npm install` no terminal integrado.
3. Copie `.dev.vars.example` para `.dev.vars`.
4. Rode `npm run dev` e abra o endereço local exibido pelo Wrangler.
5. A primeira vez, aplique as tabelas no banco local: `npx wrangler d1 migrations apply replay-db --local`.
6. Edite os arquivos normalmente e salve. Para alterar o app publicado, rode `npm run publish` depois da configuração inicial.

`npm run build` monta os arquivos do site em `dist/`. `npm run publish` publica a versão atual na Cloudflare Pages depois de configurar o projeto e autenticar o Wrangler (`npx wrangler login`). Assim você mantém o fluxo no VS Code; cada publicação atualiza o app instalado quando o navegador buscar a nova versão.

## Preparação inicial na Cloudflare

Faça estes passos uma vez, no terminal do VS Code:

1. **Não aprove o login OAuth do Wrangler com todas as permissões sugeridas.** O fluxo OAuth do Wrangler não permite escolher permissões granulares. Crie um token de API personalizado para sua conta e use-o como variável de ambiente no terminal do VS Code. A documentação oficial descreve as permissões de [Pages](https://developers.cloudflare.com/pages/configuration/api/) e [Workers](https://developers.cloudflare.com/workers/authorization/workers/).
2. No painel, crie o banco D1 `replay-db` e o bucket R2 `replay-media` (mantenha o bucket privado). Copie o ID do banco para `wrangler.toml`, substituindo o UUID `00000000-0000-0000-0000-000000000000`.
3. Aplique as tabelas no banco remoto: `npx wrangler d1 migrations apply replay-db --remote`.
4. Crie o projeto Pages `replay`: `npx wrangler pages project create replay`.
5. Crie a aplicação Cloudflare Access e o token S3 do R2. Guarde os segredos usando os comandos interativos abaixo; nunca os coloque no JavaScript, em `.dev.vars.example` ou em um commit.
6. Publique: `npm run publish`.

### Token de API para o Wrangler

Crie um **Account API token personalizado** com acesso à conta correta e somente estas permissões de conta: `Cloudflare Pages Edit`, `D1 Edit` e `Workers Scripts Edit`. O R2 deve ser criado pelo painel para evitar conceder ao Wrangler permissão de criação de buckets em toda a conta. Não escolha modelos amplos como “Edit Cloudflare Workers” sem revisar as permissões incluídas.

Depois de criar o token, defina-o e o ID da conta apenas no terminal atual do PowerShell do VS Code:

```powershell
. .\scripts\conectar-cloudflare.ps1
```

O script pede o token em um campo oculto e não grava nenhum valor no projeto. Não envie o token nesta conversa. Fechar o terminal remove essas variáveis da sessão.

### Segredos necessários no ambiente de produção

- `CF_ACCESS_TEAM_DOMAIN`: domínio da sua organização Zero Trust, sem `https://` (por exemplo, `nome-da-conta.cloudflareaccess.com`).
- `CF_ACCESS_AUD`: Audience (AUD) da aplicação Cloudflare Access que protege o app.
- `ALLOWED_EMAILS`: e-mails autorizados separados por vírgula, em minúsculas. Para você enviar vídeos e sua mulher assistir, autorize os dois e-mails.
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID` e `R2_SECRET_ACCESS_KEY`: credenciais de API S3 do R2 com leitura e gravação apenas no bucket `replay-media`.

Salve cada valor usando o Wrangler; ele pedirá o valor sem incluí-lo no comando:

```powershell
npx wrangler pages secret put CF_ACCESS_TEAM_DOMAIN --project-name replay
npx wrangler pages secret put CF_ACCESS_AUD --project-name replay
npx wrangler pages secret put ALLOWED_EMAILS --project-name replay
npx wrangler pages secret put R2_ACCOUNT_ID --project-name replay
npx wrangler pages secret put R2_ACCESS_KEY_ID --project-name replay
npx wrangler pages secret put R2_SECRET_ACCESS_KEY --project-name replay
```

No Cloudflare Access, crie uma aplicação Self-hosted para `replay.pages.dev` com política **Allow** só para os e-mails escolhidos. Proteja também os endereços de preview. O Pages pode criar uma regra apenas para previews; confira que a URL de produção `replay.pages.dev` também está protegida. Se usar domínio próprio, crie uma aplicação Access separada para ele. O servidor valida o JWT de Access e compara o e-mail com `ALLOWED_EMAILS` em cada chamada da API.

### CORS do R2 para os envios

O bucket precisa continuar **privado** e sem URL pública `r2.dev`. Em **R2 → replay-media → Settings → CORS policy**, permita apenas o endereço HTTPS exato do seu site (por exemplo, `https://replay.pages.dev`) e o método `PUT`, com o header `Content-Type`. Se adicionar domínio próprio, inclua esse endereço exato também. Não use `*` como origem.

## Atualizar o app

Depois da configuração inicial, edite os arquivos no VS Code e rode `npm run publish`. Para publicar automaticamente ao enviar commits, conecte um repositório Git privado ao Pages; mantenha o domínio de produção protegido pelo Access e proteja os previews também. O código não contém chaves de acesso.

## Limites e dados existentes

O envio direto ao R2 evita passar vídeos pelo limite de requisição do Worker. Um único envio aceita até 5 GiB; o app ainda não divide arquivos maiores em partes e não retoma um envio interrompido. O modo de desenvolvimento local usa a função Pages e limita cada arquivo a 100 MB.

Vídeos já salvos no navegador antigo não são enviados automaticamente para a nuvem. Depois que o app online estiver configurado, será necessário reenviar esses arquivos pela versão publicada. O banco remoto começa vazio; não apague os dados do navegador antigo até terminar essa transferência.

## Arquivos principais

- `index.html`, `styles.css`, `app.js`: interface e interações.
- `functions/api/[[path]].js`: API, validação do Cloudflare Access e entrega de mídia privada.
- `migrations/0001_initial.sql`: tabelas de vídeos, jogos, curtidas e comentários.
- `wrangler.toml`: Pages, binding D1 e binding R2.
- `service-worker.js`: cache offline da interface. Respostas da API e mídia privada não entram no cache offline.
