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
    pricePerMonth: 17.9,
    totalPrice: 214.8,
    durationMonths: 12,
    labelShort: '1 ano',
    featured: true,
  },
};

/** Ordem de exibição na paywall: trimestral, anual (destaque), mensal */
export const PLANS_ORDER: PlanId[] = ['monthly', 'quarterly', 'yearly'];

/** Links diretos do checkout (Mercado Pago – preapproval_plan_id). O webhook avisará quando o pagamento for realizado. */
export const MONTHLY_PLAN_CHECKOUT_URL =
  'https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=926ccca97394458e8f88b54d0d64388d';
export const QUARTERLY_PLAN_CHECKOUT_URL =
  'https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=3925655a3e1e43c6984ab3d40c1bf771';
export const YEARLY_PLAN_CHECKOUT_URL =
  'https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=ef440dc0caf747a8a8c1face5028f644';

/** Duração do teste grátis em minutos – altere aqui para mudar o tempo (ex.: 15, 30, 60). */
export const TRIAL_MINUTES = 30;

/** Segundos de trial (derivado de TRIAL_MINUTES). */
export const TRIAL_SECONDS_LIMIT = TRIAL_MINUTES * 60;
