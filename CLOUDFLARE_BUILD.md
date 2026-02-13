# Corrigir o check "Workers Builds: bianutri" (failed in 0s)

O BiaNutri é um **site estático** (Vite/React). O check que falha no GitHub vem de um projeto **Cloudflare Workers** conectado a este repositório. Workers esperam um script (entry-point); este projeto é para **Cloudflare Pages**.

## O que fazer no Cloudflare

### Opção A: Usar Pages (recomendado)

1. Acesse [Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages).
2. **Desconecte** o projeto **Worker** "bianutri" deste repositório:
   - Abra o projeto **bianutri** (se for Worker) → **Settings** → **Builds** → **Manage** (Git Repository) → **Disconnect** ou remova o repositório.
3. Crie um projeto **Pages** para este repo:
   - **Create application** → **Pages** → **Connect to Git**.
   - Escolha o repositório `jessefreitasguimaraesnegocios-app/BiaNutri`.
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - (Opcional) Em **Environment variables**, defina `NODE_VERSION` = `20` se o build falhar.
4. Faça o primeiro deploy. O check no GitHub passará a ser do Pages em vez do Workers.

### Opção B: Só remover o check

Se você **não** quiser usar Cloudflare para este app (por exemplo, já usa Vercel):

1. No GitHub: **Settings** → **Applications** → **Cloudflare Workers and Pages** → **Configure**.
2. Em **Repository access**, retire o repositório **BiaNutri** da lista (ou use "Only select repositories" e desmarque BiaNutri).
3. O check "Workers Builds: bianutri" deixará de aparecer nos commits.

---

**Resumo:** O "failed in 0s" ocorre porque um **Worker** está ligado a um repo que só tem site estático. Use um projeto **Pages** para este repo ou desconecte o Worker do repo.
