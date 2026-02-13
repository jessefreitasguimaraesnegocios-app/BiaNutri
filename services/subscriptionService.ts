import { supabase } from './supabaseClient';
import type { TrialStatus, AccessStatus } from '../types';
import { TRIAL_SECONDS_LIMIT } from '../constants/plans';

const TRIAL_FUNCTION = 'trial';
const MERCADOPAGO_FUNCTION = 'mercadopago-checkout';
const MERCADOPAGO_SUBSCRIPTION_FUNCTION = 'mercadopago-subscription';
const MERCADOPAGO_CANCEL_FUNCTION = 'mercadopago-cancel-subscription';

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

/** Obtém headers com JWT da sessão para Edge Functions. Tenta atualizar a sessão antes para evitar 401 por token expirado. */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  let token = session.access_token;
  try {
    const { data: { session: refreshed } } = await supabase.auth.refreshSession({ refresh_token: session.refresh_token });
    if (refreshed?.access_token) token = refreshed.access_token;
  } catch {
    // Usa o token atual se o refresh falhar (ex.: offline)
  }
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

/** Inicia o trial (backend valida telefone e se já foi usado). */
export async function startTrial(userId: string): Promise<{
  ok: boolean;
  error?: string;
  trial_seconds_used?: number;
  trial_used_at?: string | null;
}> {
  const headers = await getAuthHeaders();
  const { data, error } = await supabase.functions.invoke(TRIAL_FUNCTION, {
    body: { action: 'start', user_id: userId },
    headers: Object.keys(headers).length ? headers : undefined,
  });
  if (error) return { ok: false, error: error.message };
  const body = data as any;
  if (body?.error) return { ok: false, error: body.error };
  return {
    ok: true,
    trial_seconds_used: body?.trial_seconds_used ?? 0,
    trial_used_at: body?.trial_used_at ?? null,
  };
}

/** Incrementa tempo de uso do trial (chamar a cada ~15s enquanto app em uso). */
export async function incrementTrialTime(
  userId: string,
  seconds: number
): Promise<{
  ok: boolean;
  trial_seconds_used: number;
  trial_used_at: string | null;
  exhausted: boolean;
}> {
  const headers = await getAuthHeaders();
  const { data, error } = await supabase.functions.invoke(TRIAL_FUNCTION, {
    body: { action: 'increment', user_id: userId, seconds },
    headers: Object.keys(headers).length ? headers : undefined,
  });
  if (error) {
    return {
      ok: false,
      trial_seconds_used: 0,
      trial_used_at: null,
      exhausted: false,
    };
  }
  const body = data as any;
  return {
    ok: true,
    trial_seconds_used: body?.trial_seconds_used ?? 0,
    trial_used_at: body?.trial_used_at ?? null,
    exhausted: !!body?.trial_used_at,
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

/** Define se o usuário tem acesso ao app (não precisa ver paywall). */
export async function getAccessStatus(
  userId: string,
  profile: {
    phone: string | null;
    trial_started_at: string | null;
    trial_seconds_used: number;
    trial_used_at: string | null;
  } | null
): Promise<AccessStatus> {
  const hasSubscription = await getSubscriptionActive(userId);
  if (hasSubscription) return 'allowed';

  if (!profile) return 'phone_required';
  if (!profile.phone) return 'phone_required';
  if (profile.trial_used_at) return 'paywall';
  if (
    profile.trial_started_at != null &&
    profile.trial_seconds_used < TRIAL_SECONDS_LIMIT
  ) {
    return 'allowed';
  }
  if (profile.trial_started_at != null) return 'paywall';
  return 'allowed';
}

/** Cria preferência no Mercado Pago (pagamento único) e retorna init_point. */
export async function createCheckout(
  userId: string,
  planId: string,
  successUrl: string,
  failureUrl: string
): Promise<{ init_point?: string; error?: string }> {
  const headers = await getAuthHeaders();
  const { data, error } = await supabase.functions.invoke(MERCADOPAGO_FUNCTION, {
    body: {
      user_id: userId,
      plan_id: planId,
      success_url: successUrl,
      failure_url: failureUrl,
    },
    headers: Object.keys(headers).length ? headers : undefined,
  });
  if (error) return { error: error.message };
  const body = data as any;
  if (body?.error) return { error: body.error };
  return { init_point: body?.init_point ?? body?.url };
}

/** Cria assinatura (recurring) via API com external_reference userId|planId e retorna init_point. */
export async function createSubscriptionCheckout(
  userId: string,
  planId: string,
  backUrl: string
): Promise<{ init_point?: string; error?: string }> {
  const headers = await getAuthHeaders();
  const { data, error } = await supabase.functions.invoke(MERCADOPAGO_SUBSCRIPTION_FUNCTION, {
    body: { user_id: userId, plan_id: planId, back_url: backUrl },
    headers: Object.keys(headers).length ? headers : undefined,
  });
  if (error) return { error: error.message };
  const body = data as any;
  if (body?.error) return { error: body.error };
  return { init_point: body?.init_point ?? body?.url };
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
  const headers = await getAuthHeaders();
  const { data, error } = await supabase.functions.invoke(MERCADOPAGO_CANCEL_FUNCTION, {
    body: { user_id: userId },
    headers: Object.keys(headers).length ? headers : undefined,
  });
  if (error) return { ok: false, error: error.message };
  const body = data as any;
  if (body?.error) return { ok: false, error: body.error };
  return { ok: true };
}
