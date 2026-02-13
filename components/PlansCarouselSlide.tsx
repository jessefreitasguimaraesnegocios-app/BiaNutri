import React, { useState, useEffect } from 'react';
import { Loader2, Zap, Shield, RefreshCw, XCircle } from 'lucide-react';
import { PLANS, PLANS_ORDER, type PlanId } from '../constants/plans';
import {
  createSubscriptionCheckout,
  getSubscription,
  cancelSubscription,
} from '../services/subscriptionService';

interface PlansCarouselSlideProps {
  userId: string;
  theme: 'light' | 'dark';
  lang: 'pt' | 'en';
  /** Exibe cronômetro do trial quando true */
  showTrialCountdown: boolean;
  trialDisplayRemainingSeconds: number;
  trialMinutes: number;
  onVerifySubscription?: () => Promise<void>;
}

const texts = {
  pt: {
    title: 'Planos',
    subtitle: 'Assine antes do tempo acabar e continue usando sem limites.',
    perMonth: '/mês',
    total: 'total',
    bestValue: 'Melhor custo-benefício',
    cta: 'Assinar',
    secure: 'Pagamento seguro',
    error: 'Erro ao abrir checkout. Tente novamente.',
    trialLabel: 'Teste grátis',
    trialOf: 'de',
    trialMin: 'min',
    verifySubscription: 'Verificar assinatura',
    verifying: 'Verificando...',
    yourSubscription: 'Sua assinatura',
    validUntil: 'Válida até',
    cancelSubscription: 'Cancelar assinatura',
    cancelConfirm: 'Tem certeza que deseja cancelar? Você perderá o acesso ao fim do período já pago.',
    cancelling: 'Cancelando...',
    cancelSuccess: 'Assinatura cancelada.',
    cancel: 'Não, manter',
  },
  en: {
    title: 'Plans',
    subtitle: 'Subscribe before time runs out and keep using without limits.',
    perMonth: '/mo',
    total: 'total',
    bestValue: 'Best value',
    cta: 'Subscribe',
    secure: 'Secure payment',
    error: 'Error opening checkout. Please try again.',
    trialLabel: 'Free trial',
    trialOf: 'of',
    trialMin: 'min',
    verifySubscription: 'Verify subscription',
    verifying: 'Verifying...',
    yourSubscription: 'Your subscription',
    validUntil: 'Valid until',
    cancelSubscription: 'Cancel subscription',
    cancelConfirm: 'Are you sure you want to cancel? You will lose access at the end of the paid period.',
    cancelling: 'Cancelling...',
    cancelSuccess: 'Subscription cancelled.',
    cancel: 'No, keep it',
  },
};

const PlansCarouselSlide: React.FC<PlansCarouselSlideProps> = ({
  userId,
  theme,
  lang,
  showTrialCountdown,
  trialDisplayRemainingSeconds,
  trialMinutes,
  onVerifySubscription,
}) => {
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [subscription, setSubscription] = useState<{
    plan_id: string;
    status: string;
    valid_until: string;
  } | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const t = texts[lang];
  const isDark = theme === 'dark';

  useEffect(() => {
    let cancelled = false;
    getSubscription(userId).then((sub) => {
      if (!cancelled && sub && sub.status === 'active' && new Date(sub.valid_until) > new Date()) {
        setSubscription({ plan_id: sub.plan_id, status: sub.status, valid_until: sub.valid_until });
      } else {
        setSubscription(null);
      }
    });
    return () => { cancelled = true; };
  }, [userId]);

  const handleVerifySubscription = async () => {
    if (!onVerifySubscription || isVerifying) return;
    setIsVerifying(true);
    setError(null);
    try {
      await onVerifySubscription();
      const sub = await getSubscription(userId);
      if (sub && sub.status === 'active' && new Date(sub.valid_until) > new Date()) {
        setSubscription({ plan_id: sub.plan_id, status: sub.status, valid_until: sub.valid_until });
      } else {
        setSubscription(null);
      }
    } catch {
      setError(lang === 'pt' ? 'Não foi possível verificar. Tente novamente.' : 'Could not verify. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!showCancelConfirm) {
      setShowCancelConfirm(true);
      return;
    }
    setIsCancelling(true);
    setError(null);
    try {
      const res = await cancelSubscription(userId);
      if (res.ok) {
        setSubscription(null);
        setShowCancelConfirm(false);
        if (onVerifySubscription) await onVerifySubscription();
      } else {
        setError(res.error ?? t.error);
      }
    } finally {
      setIsCancelling(false);
    }
  };

  const handleSelectPlan = async (planId: PlanId) => {
    setError(null);
    setLoadingPlan(planId);
    const origin = window.location.origin + window.location.pathname;
    const backUrl = `${origin}?payment=success`;
    try {
      // Assinatura via API: external_reference = userId|planId (webhook identifica 100% pelo ID)
      const { init_point, error: err } = await createSubscriptionCheckout(
        userId,
        planId,
        backUrl
      );
      if (err) {
        setError(t.error);
        setLoadingPlan(null);
        return;
      }
      if (init_point) {
        window.location.href = init_point;
        return;
      }
      setError(t.error);
    } catch {
      setError(t.error);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="w-full min-w-full max-w-md mx-auto px-4 py-4 pb-8 flex flex-col gap-5 overflow-y-auto">
      {/* Cronômetro do trial */}
      {showTrialCountdown && (
        <div className="rounded-2xl bg-brand-500/15 dark:bg-brand-500/20 border-2 border-brand-500/40 px-4 py-4 shadow-lg">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-sm font-semibold text-brand-700 dark:text-brand-300">
              {t.trialLabel}
            </span>
            <span className="text-2xl font-bold text-brand-700 dark:text-brand-200 tabular-nums tracking-wider">
              {String(Math.floor(trialDisplayRemainingSeconds / 60)).padStart(2, '0')}
              <span className="text-brand-500/80 mx-1">:</span>
              {String(trialDisplayRemainingSeconds % 60).padStart(2, '0')}
            </span>
            <span className="text-sm text-brand-600 dark:text-brand-400 tabular-nums">
              {t.trialOf} {trialMinutes} {t.trialMin}
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-500"
              style={{
                width: `${Math.min(100, ((trialMinutes * 60 - trialDisplayRemainingSeconds) / (trialMinutes * 60)) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      <div className="text-center">
        <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
          {t.title}
        </h2>
        <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {t.subtitle}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {PLANS_ORDER.map((planId) => {
          const plan = PLANS[planId];
          const featured = plan.featured === true;
          const isLoading = loadingPlan === planId;
          return (
            <div
              key={planId}
              className={`relative rounded-2xl border-2 overflow-hidden transition-all ${
                featured
                  ? 'border-brand-500 bg-brand-500/10 shadow-lg shadow-brand-500/20'
                  : isDark
                  ? 'border-slate-700 bg-slate-800/50'
                  : 'border-slate-200 bg-white'
              }`}
            >
              {featured && (
                <div className="absolute top-0 right-0 px-3 py-1 rounded-bl-xl bg-brand-500 text-white text-xs font-bold">
                  {t.bestValue}
                </div>
              )}
              <div className={featured ? 'p-6' : 'p-5'}>
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <span
                    className={`font-bold ${featured ? 'text-base' : ''} ${
                      featured ? 'text-brand-700 dark:text-brand-300' : isDark ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {plan.labelShort}
                  </span>
                  <div className="text-right">
                    {featured ? (
                      <>
                        <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          R$ {plan.totalPrice.toFixed(2).replace('.', ',')} {t.total}
                        </span>
                        <span
                          className={`block font-bold ${featured ? 'text-xl' : 'text-lg'} ${
                            featured ? 'text-brand-600 dark:text-brand-400' : isDark ? 'text-white' : 'text-slate-900'
                          }`}
                        >
                          R$ {plan.pricePerMonth.toFixed(2).replace('.', ',')}{t.perMonth}
                        </span>
                      </>
                    ) : (
                      <>
                        {plan.durationMonths > 1 && (
                          <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            R$ {plan.pricePerMonth.toFixed(2).replace('.', ',')}
                            {t.perMonth}
                          </span>
                        )}
                        <span
                          className={`block font-bold text-lg ${
                            featured ? 'text-brand-600 dark:text-brand-400' : isDark ? 'text-white' : 'text-slate-900'
                          }`}
                        >
                          R$ {plan.totalPrice.toFixed(2).replace('.', ',')}
                          {plan.durationMonths > 1 && (
                            <span className="text-xs font-normal opacity-80"> {t.total}</span>
                          )}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleSelectPlan(planId)}
                  disabled={!!loadingPlan}
                  className={`w-full mt-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                    featured
                      ? 'py-4 px-4 text-base bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/30'
                      : 'py-3.5 px-4 ' + (isDark
                      ? 'bg-slate-700 hover:bg-slate-600 text-white'
                      : 'bg-slate-900 hover:bg-slate-800 text-white')
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      {lang === 'pt' ? 'Abrindo...' : 'Opening...'}
                    </>
                  ) : (
                    <>
                      <Zap size={featured ? 20 : 18} />
                      {t.cta} – R$ {(featured ? plan.pricePerMonth : plan.totalPrice).toFixed(2).replace('.', ',')}
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div
          className={`p-3 rounded-xl text-sm ${
            isDark ? 'bg-red-900/20 text-red-300' : 'bg-red-50 text-red-700'
          }`}
        >
          {error}
        </div>
      )}

      {subscription && (
        <div className={`rounded-2xl p-4 border-2 ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}>
          <p className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {t.yourSubscription}
          </p>
          <p className={`mt-1 font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {PLANS[subscription.plan_id as PlanId]?.labelShort ?? subscription.plan_id}
          </p>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {t.validUntil}: {new Date(subscription.valid_until).toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </p>
          {!showCancelConfirm ? (
            <button
              type="button"
              onClick={handleCancelSubscription}
              disabled={isCancelling}
              className="w-full mt-3 py-3 rounded-xl font-bold flex items-center justify-center gap-2 border-2 border-red-500/50 text-red-600 dark:text-red-400 hover:bg-red-500/10"
            >
              {isCancelling ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {t.cancelling}
                </>
              ) : (
                <>
                  <XCircle size={18} />
                  {t.cancelSubscription}
                </>
              )}
            </button>
          ) : (
            <div className="mt-3 space-y-2">
              <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{t.cancelConfirm}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 py-3 rounded-xl font-bold border-2 border-slate-300 dark:border-slate-600"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleCancelSubscription}
                  disabled={isCancelling}
                  className="flex-1 py-3 rounded-xl font-bold bg-red-500 hover:bg-red-600 text-white flex items-center justify-center gap-2"
                >
                  {isCancelling ? <Loader2 size={18} className="animate-spin" /> : t.cancelSubscription}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {onVerifySubscription && (
        <button
          type="button"
          onClick={handleVerifySubscription}
          disabled={isVerifying}
          className={`w-full py-3.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 border-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            isDark
              ? 'border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-100'
              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
          }`}
        >
          {isVerifying ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              {t.verifying}
            </>
          ) : (
            <>
              <RefreshCw size={18} />
              {t.verifySubscription}
            </>
          )}
        </button>
      )}

      <div className="flex items-center justify-center gap-2 text-slate-500 text-xs">
        <Shield size={14} />
        <span>{t.secure}</span>
        <span className="font-semibold">Mercado Pago</span>
      </div>
    </div>
  );
};

export default PlansCarouselSlide;
