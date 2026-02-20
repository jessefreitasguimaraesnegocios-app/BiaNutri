import { supabase, supabaseUrl } from './supabaseClient';
import type { TrialStatus, AccessStatus } from '../types';
import { TRIAL_SECONDS_LIMIT } from '../constants/plans';

const TRIAL_FUNCTION = 'trial';
const MERCADOPAGO_FUNCTION = 'mercadopago-checkout';
const MERCADOPAGO_SUBSCRIPTION_FUNCTION = 'mercadopago-subscription';
const MERCADOPAGO_CANCEL_FUNCTION = 'mercadopago-cancel-subscription';
const MERCADOPAGO_SYNC_FUNCTION = 'mercadopago-sync-subscription';

/** Normaliza telefone: só dígitos (BR: 10 ou 11 dígitos) */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('55')) return digits;
  if (digits.length === 10 || digits.length === 11) return digits;
  return digits;
}

/** Busca perfil do usuário (trial + telefone) */
export async function getProfile(userId: string): Promise<{
  phone: string | null;
  trial_started_at: string | null;
  trial_seconds_used: number;
  trial_used_at: string | null;
} | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('phone, trial_started_at, trial_seconds_used, trial_used_at')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as any;
}

/** Atualiza telefone do perfil (apenas dígitos). Retorna erro se telefone já usado em outro usuário. */
export async function setPhone(userId: string, phone: string): Promise<{ error: string | null }> {
  const normalized = normalizePhone(phone);
  if (normalized.length < 10) {
    return { error: 'Telefone inválido. Use DDD + número.' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      phone: normalized,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) return { error: error.message };
  return { error: null };
}

/** Verifica se outro perfil já usou o trial com este telefone. */
export async function checkPhoneAlreadyUsed(
  phone: string,
  excludeUserId?: string
): Promise<boolean> {
  const normalized = normalizePhone(phone);
  let q = supabase
    .from('profiles')
    .select('id')
    .eq('phone', normalized)
    .not('trial_used_at', 'is', null);
  if (excludeUserId) q = q.neq('id', excludeUserId);
  const { data, error } = await q.limit(1);
  if (error || !data || data.length === 0) return false;
  return true;
}

/** Status do trial a partir do perfil (para UI). */
export function getTrialStatusFromProfile(profile: {
  phone: string | null;
  trial_started_at: string | null;
  trial_seconds_used: number;
  trial_used_at: string | null;
} | null): TrialStatus {
  if (!profile) return 'none';
  if (!profile.phone) return 'phone_required';
  if (profile.trial_used_at) return 'exhausted';
  if (profile.trial_started_at != null && profile.trial_seconds_used < TRIAL_SECONDS_LIMIT) {
    return 'active';
  }
  if (profile.trial_started_at != null) return 'exhausted';
  return 'none';
}

/** Obtém token JWT atualizado (refresh se necessário) para Edge Functions. */
async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return null;
  try {
    const { data: { session: refreshed } } = await supabase.auth.refreshSession({ refresh_token: session.refresh_token });
    return refreshed?.access_token ?? session.access_token;
  } catch {
    return session.access_token;
  }
}

/** Chama Edge Function com JWT no header (evita 401 por header não enviado pelo client). */
async function invokeWithAuth<T = unknown>(
  functionName: string,
  body: Record<string, unknown>
): Promise<{ data?: T; error?: string }> {
  const token = await getAccessToken();
  if (!token) {
    return { error: 'Faça login para continuar.' };
  }
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as T & { error?: string; message?: string };
    if (!res.ok) {
      const raw = data as { error?: string; message?: string };
      const msg = raw?.message ?? raw?.error ?? (res.status === 401 ? 'Sessão expirada. Faça login novamente.' : `Erro ${res.status}`);
      if (res.status >= 500) console.error(`[${functionName}] ${res.status}:`, raw);
      return { error: msg };
    }
    return { data };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro de conexão.' };
  }
}

/**
 * Retorna status do trial no servidor (time-based: remaining = LIMIT - (now - trial_started_at)).
 * Não usa localStorage. Exemplo:
 *   const { remaining_seconds, is_trial_active } = await getTrialStatus(userId);
 *   setDisplaySeconds(remaining_seconds);
 *   if (!is_trial_active) setAccessStatus('paywall');
 */
export async function getTrialStatus(userId: string): Promise<{
  remaining_seconds: number;
  is_trial_active: boolean;
  error?: string;
}> {
  const { data: body, error } = await invokeWithAuth<{
    remaining_seconds?: number;
    is_trial_active?: boolean;
    error?: string;
  }>(TRIAL_FUNCTION, { action: 'status', user_id: userId });
  if (error) return { remaining_seconds: 0, is_trial_active: false, error };
  return {
    remaining_seconds: Math.max(0, body?.remaining_seconds ?? 0),
    is_trial_active: !!body?.is_trial_active,
    error: body?.error,
  };
}

/** Inicia o trial na primeira vez (backend seta trial_started_at = NOW()). Retorna status atual. */
export async function startTrial(userId: string): Promise<{
  ok: boolean;
  error?: string;
  remaining_seconds?: number;
  is_trial_active?: boolean;
}> {
  const { data: body, error } = await invokeWithAuth<{
    remaining_seconds?: number;
    is_trial_active?: boolean;
    error?: string;
  }>(TRIAL_FUNCTION, { action: 'start', user_id: userId });
  if (error) return { ok: false, error };
  return {
    ok: !body?.error,
    error: body?.error,
    remaining_seconds: body?.remaining_seconds ?? 0,
    is_trial_active: body?.is_trial_active ?? false,
  };
}

/** Verifica se há assinatura ativa (valid_until > now). */
export async function getSubscriptionActive(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('id, valid_until, status')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return false;
  const sub = data as { valid_until: string; status: string };
  return sub.status === 'active' && new Date(sub.valid_until) > new Date();
}

/** Resultado de getAccessStatus quando inclui dados do trial (para exibir cronômetro). */
export type AccessStatusResult = {
  status: AccessStatus;
  remaining_seconds?: number;
  is_trial_active?: boolean;
  hasSubscription?: boolean;
};

/** Define se o usuário tem acesso (fonte: servidor). Retorna status + remaining_seconds para o cronômetro. */
export async function getAccessStatus(
  userId: string,
  profile: {
    phone: string | null;
    trial_started_at: string | null;
    trial_seconds_used?: number;
    trial_used_at: string | null;
  } | null
): Promise<AccessStatusResult> {
  const hasSubscription = await getSubscriptionActive(userId);
  if (hasSubscription) return { status: 'allowed', hasSubscription: true };

  if (!profile) return { status: 'phone_required' };
  if (!profile.phone) return { status: 'phone_required' };

  const trial = await getTrialStatus(userId);
  if (trial.error && trial.remaining_seconds <= 0) return { status: 'paywall' };
  const status: AccessStatus = trial.is_trial_active ? 'allowed' : 'paywall';
  return {
    status,
    remaining_seconds: trial.remaining_seconds,
    is_trial_active: trial.is_trial_active,
  };
}

/** URL de retorno após pagamento no Mercado Pago (assinatura). */
export function getSubscriptionBackUrl(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}${window.location.pathname}?payment=success`;
}

/** Cria preferência no Mercado Pago (pagamento único) e retorna init_point. */
export async function createCheckout(
  userId: string,
  planId: string,
  successUrl: string,
  failureUrl: string
): Promise<{ init_point?: string; error?: string }> {
  const { data: body, error } = await invokeWithAuth<{ init_point?: string; url?: string; error?: string }>(
    MERCADOPAGO_FUNCTION,
    { user_id: userId, plan_id: planId, success_url: successUrl, failure_url: failureUrl }
  );
  if (error) return { error };
  if (body?.error) return { error: body.error };
  return { init_point: body?.init_point ?? body?.url };
}

/** Cria assinatura (recurring). Com card_token_id: cria via API e pode retornar ok; sem: retorna init_point (redirect). */
export async function createSubscriptionCheckout(
  userId: string,
  planId: string,
  backUrl: string,
  cardTokenId?: string
): Promise<{ init_point?: string; ok?: boolean; error?: string }> {
  const payload: Record<string, unknown> = { user_id: userId, plan_id: planId, back_url: backUrl };
  if (cardTokenId) payload.card_token_id = cardTokenId;
  const { data: body, error } = await invokeWithAuth<{
    init_point?: string;
    url?: string;
    ok?: boolean;
    error?: string;
  }>(MERCADOPAGO_SUBSCRIPTION_FUNCTION, payload);
  if (error) return { error };
  if (body?.error) return { error: body.error };
  if (body?.ok) return { ok: true };
  return { init_point: body?.init_point ?? body?.url };
}

/** Sincroniza assinaturas do Mercado Pago para o DB (busca por e-mail do usuário). Use antes de "Verificar assinatura". */
export async function syncSubscriptionFromMP(userId: string): Promise<{ ok: boolean; error?: string }> {
  const { data: body, error } = await invokeWithAuth<{ ok?: boolean; synced?: boolean; error?: string }>(
    MERCADOPAGO_SYNC_FUNCTION,
    { user_id: userId }
  );
  if (error) return { ok: false, error };
  if (body?.error) return { ok: false, error: body.error };
  return { ok: true };
}

/** Retorna a assinatura atual do usuário (se houver). */
export async function getSubscription(userId: string): Promise<{
  id: string;
  plan_id: string;
  status: string;
  valid_until: string;
  mp_payment_id: string | null;
} | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('id, plan_id, status, valid_until, mp_payment_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as any;
}

/** Cancela a assinatura no MP e atualiza no Supabase. */
export async function cancelSubscription(userId: string): Promise<{ ok: boolean; error?: string }> {
  const { data: body, error } = await invokeWithAuth<{ error?: string }>(MERCADOPAGO_CANCEL_FUNCTION, { user_id: userId });
  if (error) return { ok: false, error };
  if (body?.error) return { ok: false, error: body.error };
  return { ok: true };
}
