# Como publicar no Cloudflare Pages (com o backend funcionando)

## O que mudou
As rotas que antes só existiam em `server.ts` (Express/Node) agora também existem
em `functions/api/*.ts`, no formato que o Cloudflare Pages entende nativamente
(**Pages Functions**). O Cloudflare detecta automaticamente qualquer arquivo
dentro de `/functions` e publica como endpoint — sem precisar de um servidor
Node rodando o tempo todo.

Rotas convertidas:
- `functions/api/health.ts` → `GET /api/health`
- `functions/api/fetch-sheet-records.ts` → `POST /api/fetch-sheet-records` (a que estava dando 405)
- `functions/api/test-google-integration.ts` → `POST /api/test-google-integration`
- `functions/api/upload-drive-proxy.ts` → `POST /api/upload-drive-proxy`

O `server.ts` continua no projeto e funcionando normalmente para `npm run dev`
(desenvolvimento local) — ele não é mais usado no deploy do Cloudflare Pages.

**Removido de propósito:** a extração de dados por IA (Gemini) que existia em
`/api/extract-receipt` e `/api/process-receipt-flow` foi retirada do código.
O app agora só envia a foto crua pro Google Drive via Apps Script — a leitura
dos dados da nota é feita fora deste projeto.

## Passo a passo no Cloudflare Pages

1. **Configurações de build do projeto** (Settings → Builds & deployments):
   - Build command: `npm run build:pages`
   - Build output directory: `dist`
   - (Se estiver usando Framework preset "Vite", ele já usa `vite build` por
     padrão — só garanta que NÃO está rodando o script antigo `build`, que
     tenta empacotar o `server.ts` com esbuild.)

2. **Variáveis de ambiente** (Settings → Environment variables), tanto em
   Production quanto em Preview:
   - `GOOGLE_APPS_SCRIPT_URL` → a URL do Web App do Apps Script (a mesma que
     está em Configurações no painel)

3. Faça commit/push da pasta `functions/` inteira junto com o resto do
   repositório (ela precisa estar na raiz do projeto, no mesmo nível de
   `src/` e `package.json`).

4. Publique um novo deploy. O Cloudflare deve mostrar no log de build que
   detectou "Functions" e listar as rotas.

5. Teste: abra `https://SEU-APP.pages.dev/api/health` — deve responder
   `{"status":"ok", ...}` em JSON. Se isso funcionar, o `/api/fetch-sheet-records`
   também vai funcionar e o erro "Não foi possível carregar registros do
   Google Sheets" deve sumir ao clicar em "Atualizar Planilha".

## Se preferir manter o Node/Express de verdade
Alternativa (não recomendada só pra esse caso, mas válida): hospedar o
`server.ts` num serviço que rode Node continuamente (Render, Railway, Fly.io,
Cloud Run) e manter o Cloudflare Pages servindo só o front-end estático,
apontando as chamadas `fetch('/api/...')` do `driveService.ts` para a URL
completa desse outro serviço. As Pages Functions acima evitam esse segundo
serviço — fique com elas a menos que precise de algo que Workers não suporte
(processamento muito pesado, dependências Node-only, etc.).
