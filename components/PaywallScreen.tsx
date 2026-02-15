import React, { useState } from 'react';
import { Sparkles, Check, Loader2, Shield, Zap, CheckCircle2, XCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { PLANS, PLANS_ORDER, type PlanId } from '../constants/plans';
import { getSubscriptionBackUrl } from '../services/subscriptionService';
import { useSubscriptionCheckout } from '../hooks/useSubscriptionCheckout';
import SubscriptionPaymentModal from './SubscriptionPaymentModal';

interface PaywallScreenProps {
  userId: string;
  userEmail?: string;
  theme: 'light' | 'dark';
  lang: 'pt' | 'en';
  paymentReturn?: 'success' | 'failure' | null;
  onSuccess?: () => void;
  onVerifySubscription?: () => Promise<void>;
  /** Voltar à tela de login (faz logout) */
  onBackToLogin?: () => void | Promise<void>;
}

const paymentBannerTexts = {
  pt: {
    success: 'Pagamento aprovado',
    successHint: 'Sua assinatura está sendo ativada. Se o acesso não liberar em segundos, toque em "Verificar assinatura" abaixo.',
    failure: 'Pagamento não concluído',
    failureHint: 'Nenhuma cobrança foi feita. Você pode tentar outro plano ou pagar novamente quando quiser.',
    verifySubscription: 'Verificar assinatura',
    verifying: 'Verificando...',
  },
  en: {
    success: 'Payment approved',
    successHint: 'Your subscription is being activated. If access doesn\'t unlock in a few seconds, tap "Verify subscription" below.',
    failure: 'Payment not completed',
    failureHint: 'No charge was made. You can try another plan or pay again whenever you\'re ready.',
    verifySubscription: 'Verify subscription',
    verifying: 'Verifying...',
  },
};

const paywallTexts = {
  pt: {
    title: 'Desbloqueie tudo',
    subtitle: 'Seu período de teste acabou. Escolha um plano e continue cuidando da sua nutrição.',
    perMonth: '/mês',
    total: 'total',
    bestValue: 'Melhor custo-benefício',
    popular: 'Mais popular',
    cta: 'Assinar',
    benefits: [
      'Análise de refeições com IA',
      'Histórico ilimitado',
      'Meta de calorias personalizada',
      'Acompanhamento de peso e água',
    ],
    secure: 'Pagamento seguro',
    error: 'Erro ao abrir checkout. Tente novamente.',
    payOnMP: 'Prefere pagar no site do Mercado Pago?',
    backToLogin: 'Voltar ao login',
  },
  en: {
    title: 'Unlock everything',
    subtitle: 'Your trial has ended. Choose a plan and keep managing your nutrition.',
    perMonth: '/mo',
    total: 'total',
    bestValue: 'Best value',
    popular: 'Most popular',
    cta: 'Subscribe',
    benefits: [
      'AI meal analysis',
      'Unlimited history',
      'Personalized calorie goal',
      'Weight and water tracking',
    ],
    secure: 'Secure payment',
    error: 'Error opening checkout. Please try again.',
    payOnMP: 'Prefer to pay on Mercado Pago website?',
    backToLogin: 'Back to login',
  },
};

const PaywallScreen: React.FC<PaywallScreenProps> = ({
  userId,
  userEmail,
  theme,
  lang,
  paymentReturn = null,
  onSuccess,
  onVerifySubscription,
  onBackToLogin,
}) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const t = paywallTexts[lang];
  const bt = paymentBannerTexts[lang];
  const isDark = theme === 'dark';
  const backUrl = getSubscriptionBackUrl();

  const payment = useSubscriptionCheckout({
    userId,
    backUrl,
    errorMessage: t.error,
    onSuccess,
    onVerifySubscription,
  });

  const handleVerifySubscription = async () => {
    if (!onVerifySubscription || isVerifying) return;
    setIsVerifying(true);
    try {
      await onVerifySubscription();
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div
      className={`min-h-screen ${
        isDark ? 'bg-slate-950' : 'bg-gradient-to-b from-slate-50 to-white'
      } flex flex-col items-center p-4 pb-12`}
    >
      <div className="w-full max-w-md flex flex-col gap-6">
        {onBackToLogin && (
          <div className="w-full flex justify-start -mt-1 mb-2">
            <button
              type="button"
              onClick={() => onBackToLogin()}
              className={`inline-flex items-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium transition-colors ${
                isDark
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ArrowLeft size={18} />
              {t.backToLogin}
            </button>
          </div>
        )}
        {/* Banner: Pagamento aprovado / falhou */}
        {paymentReturn === 'success' && (
          <div
            className={`rounded-2xl p-4 flex gap-4 shadow-md ${
              isDark
                ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-100'
                : 'bg-emerald-50 border border-emerald-200 text-emerald-900'
            }`}
          >
            <div
              className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                isDark ? 'bg-emerald-500/30' : 'bg-emerald-500/20'
              }`}
            >
              <CheckCircle2 className={isDark ? 'text-emerald-400' : 'text-emerald-600'} size={26} />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="font-bold text-lg leading-tight">{bt.success}</p>
              <p className={`text-sm mt-1.5 leading-snug ${isDark ? 'text-emerald-200/90' : 'text-emerald-800/90'}`}>
                {bt.successHint}
              </p>
            </div>
          </div>
        )}
        {paymentReturn === 'failure' && (
          <div
            className={`rounded-2xl p-4 flex gap-4 shadow-md ${
              isDark
                ? 'bg-amber-950/40 border border-amber-500/30 text-amber-100'
                : 'bg-amber-50 border border-amber-200 text-amber-900'
            }`}
          >
            <div
              className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                isDark ? 'bg-amber-500/25' : 'bg-amber-500/20'
              }`}
            >
              <XCircle className={isDark ? 'text-amber-400' : 'text-amber-600'} size={26} />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="font-bold text-lg leading-tight">{bt.failure}</p>
              <p className={`text-sm mt-1.5 leading-snug ${isDark ? 'text-amber-200/90' : 'text-amber-800/90'}`}>
                {bt.failureHint}
              </p>
            </div>
          </div>
        )}

        <div className="text-center pt-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500/20 mb-4">
            <Sparkles className="text-brand-500" size={28} />
          </div>
          <h1
            className={`text-2xl sm:text-3xl font-bold ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            {t.title}
          </h1>
          <p
            className={`mt-2 text-sm ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            {t.subtitle}
          </p>
        </div>

        <ul className={`space-y-3 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
          {t.benefits.map((item, i) => (
            <li key={i} className="flex items-center gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="text-green-500" size={14} />
              </span>
              <span className="text-sm font-medium">{item}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-4">
          {PLANS_ORDER.map((planId) => {
            const plan = PLANS[planId];
            const featured = plan.featured === true;
            const isLoading = payment.loadingPlan === planId;

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
                <div className="p-5">
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <span
                      className={`font-bold ${
                        featured ? 'text-brand-700 dark:text-brand-300' : isDark ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {plan.labelShort}
                    </span>
                    <div className="text-right">
                      {plan.durationMonths > 1 && (
                        <span
                          className={`text-xs ${
                            isDark ? 'text-slate-400' : 'text-slate-500'
                          }`}
                        >
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
                    </div>
                  </div>
                  <button
                    onClick={() => payment.handleSelectPlan(planId)}
                    disabled={!!payment.loadingPlan}
                    className={`w-full mt-4 py-3.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                      featured
                        ? 'bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/30'
                        : isDark
                        ? 'bg-slate-700 hover:bg-slate-600 text-white'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    } disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        {lang === 'pt' ? 'Abrindo...' : 'Opening...'}
                      </>
                    ) : (
                      <>
                        <Zap size={18} />
                        {t.cta} – R$ {plan.totalPrice.toFixed(2).replace('.', ',')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {payment.error && (
          <div
            className={`p-3 rounded-xl text-sm ${
              isDark ? 'bg-red-900/20 text-red-300' : 'bg-red-50 text-red-700'
            }`}
          >
            {payment.error}
          </div>
        )}

        {/* Botão Verificar assinatura */}
        {onVerifySubscription && (
          <button
            type="button"
            onClick={handleVerifySubscription}
            disabled={isVerifying}
            className={`w-full py-3.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all border-2 shadow-sm ${
              isDark
                ? 'border-slate-600 bg-slate-800 hover:bg-slate-700 hover:border-slate-500 text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed'
                : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {isVerifying ? (
              <>
                <Loader2 size={20} className="animate-spin flex-shrink-0" />
                <span>{bt.verifying}</span>
              </>
            ) : (
              <>
                <RefreshCw size={18} className="flex-shrink-0" />
                <span>{bt.verifySubscription}</span>
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

      <SubscriptionPaymentModal
        show={payment.showCardModal}
        planId={payment.selectedPlanForCard}
        loadingPlan={payment.loadingPlan}
        userEmail={userEmail ?? ''}
        theme={theme}
        lang={lang}
        payOnMPLabel={t.payOnMP}
        onPayWithCard={payment.handlePayWithCard}
        onPayOnMP={payment.handlePayOnMP}
        onClose={payment.closeModal}
      />
    </div>
  );
};

export default PaywallScreen;
