# Configuração do app pago (trial + Mercado Pago)

## O que foi implementado

1. **Trial de 30 minutos** (tempo acumulado de uso dentro do app; quando o usuário fecha o app o tempo para).
2. **Telefone obrigatório** antes de usar o trial; o mesmo número não pode usar o trial duas vezes (em contas diferentes).
3. **Paywall** com 3 planos após o fim do trial:
   - 1 mês: R$ 39,90
   - 3 meses: R$ 29,90/mês (R$ 89,70 total)
   - 1 ano: R$ 17,90/mês (R$ 214,80 total) — **destaque “Melhor custo-benefício”**
4. **Checkout Mercado Pago** (Checkout Pro) e **webhook** para liberar acesso após pagamento aprovado.

---

## Passos para ativar

### 1. Rodar a migration no Supabase

No **SQL Editor** do projeto Supabase, execute o conteúdo de:

`supabase/migrations/002_trial_and_subscriptions.sql`

(Se a tabela `profiles` já existir, as colunas de trial/telefone serão adicionadas; a tabela `subscriptions` será criada.)

### 2. Deploy das Edge Functions

No terminal, na pasta do projeto:

```bash
npx supabase functions deploy trial
npx supabase functions deploy mercadopago-subscription
npx supabase functions deploy mercadopago-cancel-subscription
npx supabase functions deploy mercadopago-webhook
```

Ou use o script: `npm run supabase:deploy:mp` (só as funções do Mercado Pago).

### 3. Secrets no Supabase (Edge Functions)

No **Dashboard do Supabase** → **Project Settings** → **Edge Functions** → **Secrets**, adicione:

| Nome                         | Valor                          |
|-----------------------------|---------------------------------|
| `MERCADOPAGO_ACCESS_TOKEN` | Access Token (produção) do MP  |

(O `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` já existem no ambiente das Edge Functions.)

### 4. Webhook no Mercado Pago

1. Acesse o [painel do Mercado Pago](https://www.mercadopago.com.br/developers/panel/app) → sua aplicação → **Webhooks**.
2. **URL de notificação** deve ser a URL da Edge Function `mercadopago-webhook`:

   ```
   https://<SEU_PROJECT_REF>.supabase.co/functions/v1/mercadopago-webhook
   ```

   Substitua `<SEU_PROJECT_REF>` pelo ref do projeto (ex.: `lypnxkbbxeagehrqpuoj`).
3. Eventos: marque **Pagamentos** e **Assinaturas** (preapproval), para cobranças únicas e assinaturas.

Assim, quando um pagamento/assinatura for aprovado, o MP chama essa URL e a função atualiza a tabela `subscriptions` (usando `external_reference = userId|planId`), liberando o acesso no app. O usuário também pode cancelar a assinatura pelo app (função `mercadopago-cancel-subscription`).

### 5. URLs de retorno (opcional)

O checkout já usa as URLs da própria página do app com `?payment=success` e `?payment=failure`. Se quiser páginas específicas, altere no front ao chamar `createSubscriptionCheckout` (parâmetro `backUrl`).

---

## Resumo do fluxo

1. Usuário faz login/cadastro.
2. Se não tiver **telefone** no perfil → tela para informar telefone (só continua após salvar).
3. Se o **telefone já tiver usado trial** em outra conta → mensagem de erro e não inicia trial.
4. Com telefone válido (e não usado) → **trial de 30 min** inicia; o app conta o tempo a cada 15 s enquanto estiver em uso.
5. Ao atingir **30 min** → trial encerra; na próxima abertura aparece a **paywall** (3 planos).
6. Usuário escolhe plano → abre o **Checkout Pro** do Mercado Pago.
7. Após **pagamento aprovado** → MP chama o webhook → a Edge Function grava/atualiza `subscriptions` → o app considera assinatura ativa e libera o conteúdo.

---

## O que você precisa do Mercado Pago

- **Access Token** (produção): em Credenciais da aplicação, use o token de produção e coloque em `MERCADOPAGO_ACCESS_TOKEN` nos secrets do Supabase.
- **Webhook**: configurar a URL da função `mercadopago-webhook` como indicado acima.

Não é necessário usar a Public Key no front para esse fluxo: o checkout é aberto via `init_point` (redirect) retornado pela Edge Function.
