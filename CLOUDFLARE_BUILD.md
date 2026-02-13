# Corrigir o check "Workers Builds: bianutri" (failed in 0s)

O **commit e o push estão corretos** — o Vercel passa. O que falha é só o check do **Cloudflare** (projeto configurado como Worker em vez de Pages). Não é erro de código.

---

## ✅ Rápido: fazer o commit mostrar só sucesso (já usa Vercel)

Se você **só usa Vercel** e quer que o commit não mostre mais "1 failing check":

1. No **GitHub**: repositório **BiaNutri** → **Settings** (da organização ou do repo).
2. Menu lateral: **Integrations** → **Applications** → **Installed GitHub Apps** (ou acesse: [github.com/settings/installations](https://github.com/settings/installations) — se for organização: **Switch settings context** → sua org → **Installed GitHub Apps**).
3. Clique em **Cloudflare Workers and Pages** → **Configure**.
4. Em **Repository access**: **Only select repositories** → desmarque **BiaNutri** (ou remova da lista). Salve.
5. Pronto. Nos próximos commits só o Vercel rodará e não haverá check falhando.

---

**Diagnóstico:** BiaNutri é **A) App React/Vite frontend** (site estático). O check falha porque no Cloudflare foi criado um **Worker** em vez de um **Pages Project**.

- **Worker** espera: `main = "src/index.ts"` (script com entry-point).
- **Pages** espera: `pages_build_output_dir = "dist"` (saída do `npm run build`).
- Este repo tem só frontend → deve ser **Pages**, não Workers. Se misturar os dois → falha em 0s (o Cloudflare nem tenta rodar o build).

---

## Solução: usar Pages (recomendado)

1. Acesse [Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages).
2. **Apague** o **Worker** chamado **bianutri** (ou desconecte o repo: Worker → Settings → Builds → Manage → Disconnect).
3. Vá em **Pages** → **Create project** → **Connect to Git**.
4. Conecte o repositório `jessefreitasguimaraesnegocios-app/BiaNutri`.
5. Configure:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Node version:** em Environment variables, defina `NODE_VERSION` = `20` (recomendado).
6. Salve e faça o deploy. O check no GitHub passará a ser do Pages e deve passar.

### Opção B: Só remover o check

Se você **não** quiser usar Cloudflare para este app (por exemplo, já usa Vercel):

1. No GitHub: **Settings** → **Applications** → **Cloudflare Workers and Pages** → **Configure**.
2. Em **Repository access**, retire o repositório **BiaNutri** da lista (ou use "Only select repositories" e desmarque BiaNutri).
3. O check "Workers Builds: bianutri" deixará de aparecer nos commits.

---

**Resumo:** O erro não é de código, é de configuração no Cloudflare. Foi criado um **Worker** quando deveria ser **Pages**. Delete o Worker "bianutri" e crie um projeto **Pages** conectado ao mesmo repo, com `npm run build` e output `dist`.
