-- Tabela de e-mails com acesso admin (acesso total sem pagamento e sem trial).
-- Gerencie pelo Table Editor do Supabase: adicione/remova linhas para dar ou revogar acesso admin.

CREATE TABLE IF NOT EXISTS public.admin_emails (
  email TEXT PRIMARY KEY
);

ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;

-- Apenas service_role (Edge Functions) pode ler; usuários comuns não veem a lista.
DROP POLICY IF EXISTS "Service role can read admin_emails" ON public.admin_emails;
CREATE POLICY "Service role can read admin_emails"
  ON public.admin_emails
  FOR SELECT
  USING (auth.role() = 'service_role');

-- Service role pode inserir/atualizar/remover (para gestão via Dashboard ou SQL).
DROP POLICY IF EXISTS "Service role full access admin_emails" ON public.admin_emails;
CREATE POLICY "Service role full access admin_emails"
  ON public.admin_emails
  FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE public.admin_emails IS 'E-mails com acesso admin: sem paywall e sem trial (acesso total como assinante).';

-- Inserir primeiro admin (pode remover ou adicionar outros pelo Table Editor).
INSERT INTO public.admin_emails (email) VALUES ('admin@gmail.com')
ON CONFLICT (email) DO NOTHING;
