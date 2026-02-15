# Chaves e credenciais – Supabase e Mercado Pago

Este documento lista **todas as chaves e configurações** necessárias para o app (login, trial, pagamento e análise de alimentos) funcionar.

---

## 1. Supabase

### 1.1 Variáveis no frontend (arquivo `.env` na raiz do projeto)

O app React usa o cliente Supabase no navegador. Essas variáveis **precisam ter o prefixo `VITE_`** para o Vite expor no build.

| Variável | Obrigatória | Onde pegar | Uso |
|----------|-------------|------------|-----|
| `VITE_SUPABASE_URL` | Sim | Dashboard Supabase → **Project Settings** → **API** → **Project URL** | URL do projeto (ex.: `https://xxxxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Sim | Dashboard Supabase → **Project Settings** → **API** → **Project API keys** → **anon public** | Chave pública para auth, banco e chamada às Edge Functions |
| `VITE_MERCADOPAGO_PUBLIC_KEY` | Não* | Mercado Pago → [Credenciais](https://www.mercadopago.com.br/developers/panel/app) → **Chave pública** | Formulário de cartão no app (assinatura via API com `external_reference`). Sem ela, o usuário só pode pagar pelo link do Mercado Pago. |

\* Obrigatória apenas se quiser oferecer **pagamento com cartão dentro do app** (fluxo profissional). Sem ela, o botão "Assinar" abre um modal com opção "Pagar no site do Mercado Pago".

**Exemplo de `.env` na raiz do projeto:**

```env
VITE_SUPABASE_URL=https://lypnxkbbxeagehrqpuoj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# Opcional: para pagar com cartão no app
VITE_MERCADOPAGO_PUBLIC_KEY=APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**Importante:** não coloque a **service_role key** no `.env` do frontend. Ela só deve existir no backend (Edge Functions).

---

### 1.2 Secrets das Edge Functions (Supabase Dashboard)

As Edge Functions rodam no servidor do Supabase. Algumas variáveis já vêm preenchidas; outras você configura em **Secrets**.

**Onde configurar:** Dashboard Supabase → **Project Settings** → **Edge Functions** → **Secrets**.

#### Variáveis já fornecidas pelo Supabase (não precisa criar)

| Nome | Descrição |
|------|-----------|
| `SUPABASE_URL` | URL do projeto (igual à Project URL) |
| `SUPABASE_ANON_KEY` | Chave anon (igual à anon public do frontend) |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave com permissão total (usada no trial e no webhook) |

#### Secrets que você deve adicionar

| Nome | Obrigatória | Onde pegar | Uso |
|------|-------------|------------|-----|
| `GEMINI_API_KEY` | Sim (para análise de alimentos) | [Google AI Studio](https://aistudio.google.com/apikey) → criar API key | Edge Function **gemini**: análise de imagem da refeição |
| `MERCADOPAGO_ACCESS_TOKEN` | Sim (para pagamento) | Mercado Pago → credenciais de **produção** (veja seção 2) | Edge Functions **mercadopago-checkout** e **mercadopago-webhook** |

**Resumo – o que você precisa criar nos Secrets do Supabase:**

1. **`GEMINI_API_KEY`** – API key do Google (Gemini).
2. **`MERCADOPAGO_ACCESS_TOKEN`** – Access Token de **produção** do Mercado Pago.

Nada mais é obrigatório nas Edge Functions para o fluxo de trial + pagamento + análise de alimentos.

---

## 2. Mercado Pago

### 2.1 Onde achar as credenciais

1. Acesse: [https://www.mercadopago.com.br/developers/panel/app](https://www.mercadopago.com.br/developers/panel/app).
2. Abra sua **aplicação** (ou crie uma).
3. Vá em **Credenciais** (ou **Credenciais de produção**).

### 2.2 Chaves que você precisa

| Chave | Usar em | Descrição |
|-------|---------|-----------|
| **Access Token** (produção) | Supabase → Edge Functions → Secret `MERCADOPAGO_ACCESS_TOKEN` | Token longo (ex.: `APP_USR-...`). Usado pelas Edge Functions para criar o checkout e consultar pagamentos. **Não** coloque no frontend. |
| **Public Key** (produção) | Opcional neste projeto | Só seria necessária se o checkout fosse feito direto no frontend. No nosso fluxo o checkout é por redirect usando o `init_point` retornado pela Edge Function, então **não é obrigatória** para o que está implementado. |

**Resumo Mercado Pago para este app:**

- **Obrigatório:** **Access Token** de **produção** → colocado no Supabase como secret `MERCADOPAGO_ACCESS_TOKEN`.
- Para testes, você pode usar credenciais de **teste** no painel do MP e o mesmo nome de secret no Supabase; em produção troque pelo Access Token de produção.

### 2.3 Webhook (notificações de pagamento)

Para o app liberar acesso automaticamente após o pagamento aprovado, o Mercado Pago precisa chamar nossa Edge Function.

1. No painel do Mercado Pago: sua aplicação → **Webhooks** (ou **Notificações**).
2. **URL de notificação** deve ser a URL da Edge Function **mercadopago-webhook**:

   ```text
   https://<SEU_PROJECT_REF>.supabase.co/functions/v1/mercadopago-webhook
   ```

   Troque `<SEU_PROJECT_REF>` pelo **Reference ID** do projeto Supabase (ex.: `lypnxkbbxeagehrqpuoj`).  
   A URL completa fica em: Dashboard Supabase → **Project Settings** → **API** → **Project URL** (a parte antes de `.supabase.co` é o project ref).

3. Eventos: marque **Pagamentos** (payment created/updated).

Sem o webhook configurado, o pagamento pode ser aprovado no MP mas o app não vai liberar o acesso sozinho (a não ser que você implemente outra forma de conferir o pagamento).

---

## 3. Checklist rápido

### Supabase

- [ ] `.env` na raiz com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
- [ ] Edge Functions → Secrets: `GEMINI_API_KEY`
- [ ] Edge Functions → Secrets: `MERCADOPAGO_ACCESS_TOKEN` (Access Token de **produção** do MP)

### Mercado Pago

- [ ] Access Token de produção copiado e colado no Secret `MERCADOPAGO_ACCESS_TOKEN` do Supabase
- [ ] Webhook configurado com a URL da função `mercadopago-webhook`

### Banco (Supabase)

- [ ] Migration `002_trial_and_subscriptions.sql` executada no SQL Editor (tabelas `profiles` com colunas de trial/telefone e `subscriptions`)

### Deploy

- [ ] Edge Functions publicadas: `trial`, `mercadopago-checkout`, `mercadopago-webhook` (e `gemini` se usar análise de alimentos)

---

## 4. Segurança

- **Nunca** commite o arquivo `.env` no Git (ele já deve estar no `.gitignore`).
- **Nunca** coloque a **Service role key** do Supabase no frontend ou no `.env` do projeto; só as Edge Functions devem usá-la (via ambiente do Supabase).
- **Nunca** exponha o **Access Token** do Mercado Pago no frontend; use apenas nas Edge Functions como secret.

Com essas chaves no Supabase e no Mercado Pago (e o webhook configurado), o fluxo de trial, paywall e liberação após pagamento fica completo.
