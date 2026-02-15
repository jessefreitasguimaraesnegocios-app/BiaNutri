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

### 4. Webhook no Mercado Pago (obrigatório para liberar acesso após assinatura)

1. Acesse o [painel do Mercado Pago](https://www.mercadopago.com.br/developers/panel/app) → sua aplicação → **Webhooks** (ou Notificações).
2. **URL de notificação** deve ser exatamente a URL da Edge Function:

   ```
   https://lypnxkbbxeagehrqpuoj.supabase.co/functions/v1/mercadopago-webhook
   ```

   (Use o ref do seu projeto se for outro.)
3. **Eventos**: ative **Planos e assinaturas** / **Plans and Subscriptions** (ou **subscription_preapproval**) para que o MP avise quando uma assinatura for autorizada. Se houver opção para **Pagamentos**, marque também para cobranças únicas.
4. A função `mercadopago-webhook` deve ser publicada **sem verificação JWT** para o MP conseguir chamar:

   ```bash
   npx supabase functions deploy mercadopago-webhook --no-verify-jwt
   ```

**Se a assinatura for aprovada mas não preencher em `subscriptions` e o app não liberar:**

1. **Retorno ao app:** ao voltar do MP com `?payment=success`, o app agora chama a função **mercadopago-sync-subscription** (sincroniza assinaturas do MP por e-mail) e em seguida revalida o acesso. O usuário deve ser liberado sem precisar tocar em "Verificar assinatura", desde que o **e-mail da conta no app seja o mesmo usado no pagamento no Mercado Pago**.
2. **Webhook:** confirme que a URL do webhook está correta e que o evento de assinaturas está ativo no painel do MP. No Supabase → **mercadopago-webhook** → **Logs**: veja se há chamadas e mensagens `[webhook]`. Se não houver chamadas, o MP não está notificando (URL ou evento errado).
3. **Sync manual:** peça ao usuário tocar em **"Verificar assinatura"** na paywall; isso chama **mercadopago-sync-subscription** e atualiza a tabela `subscriptions`. Veja os logs dessa função em Supabase para `[sync] MP search result` e `[sync] Subscription synced` ou erros de upsert.
4. **E-mail:** o e-mail do pagador no MP deve ser o mesmo do cadastro no app (`profiles.email` / conta de login). Se for diferente, a busca por e-mail no MP não encontra a assinatura.

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
