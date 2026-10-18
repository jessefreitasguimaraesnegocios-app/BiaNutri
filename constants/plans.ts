// Planos e preços para assinatura (Mercado Pago)

export type PlanId = 'monthly' | 'quarterly' | 'yearly';

export interface PlanOption {
  id: PlanId;
  /** R$ por mês (exibição) */
  pricePerMonth: number;
  /** Valor total cobrado (R$) - uma única cobrança */
  totalPrice: number;
  /** Duração em meses */
  durationMonths: number;
  /** Label curto: "1 mês", "3 meses", "1 ano" */
  labelShort: string;
  /** Destaque (melhor oferta) */
  featured?: boolean;
}

export const PLANS: Record<PlanId, PlanOption> = {
  monthly: {
    id: 'monthly',
    pricePerMonth: 39.9,
    totalPrice: 39.9,
    durationMonths: 1,
    labelShort: '1 mês',
  },
  quarterly: {
    id: 'quarterly',
    pricePerMonth: 29.9,
    totalPrice: 89.7,
    durationMonths: 3,
    labelShort: '3 meses',
  },
  yearly: {
    id: 'yearly',
    pricePerMonth: 17.99,
    totalPrice: 215.88,
    durationMonths: 12,
    labelShort: '1 ano',
    featured: true,
  },
};

/** Ordem de exibição na paywall: trimestral, anual (destaque), mensal */
export const PLANS_ORDER: PlanId[] = ['monthly', 'quarterly', 'yearly'];

/** Duração do teste grátis em minutos (12 horas). */
export const TRIAL_MINUTES = 12 * 60;

export const formatarDuracaoTeste = (minutos: number, idioma: 'pt' | 'en'): string => {
  if (minutos >= 60 && minutos % 60 === 0) {
    const horas = minutos / 60;
    if (idioma === 'pt') return horas === 1 ? '1 hora' : `${horas} horas`;
    return horas === 1 ? '1 hour' : `${horas} hours`;
  }
  if (idioma === 'pt') return `${minutos} minutos`;
  return `${minutos} minutes`;
};

export const formatarTempoRestante = (segundos: number): string => {
  const total = Math.max(0, Math.floor(segundos));
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const segs = total % 60;
  const mm = String(minutos).padStart(2, '0');
  const ss = String(segs).padStart(2, '0');
  if (horas > 0) return `${String(horas).padStart(2, '0')}:${mm}:${ss}`;
  return `${mm}:${ss}`;
};

/** Segundos de trial (derivado de TRIAL_MINUTES). */
export const TRIAL_SECONDS_LIMIT = TRIAL_MINUTES * 60;
