import React from 'react';
import { PLANS, type PlanId } from '../constants/plans';
import SubscriptionCardForm from './SubscriptionCardForm';

interface SubscriptionPaymentModalProps {
  show: boolean;
  planId: PlanId | null;
  loadingPlan: PlanId | null;
  userEmail: string;
  theme: 'light' | 'dark';
  lang: 'pt' | 'en';
  payOnMPLabel: string;
  onPayWithCard: (cardTokenId: string) => Promise<void>;
  onPayOnMP: () => void;
  onClose: () => void;
}

/** Modal único de pagamento: cartão no app ou link para Mercado Pago. */
export default function SubscriptionPaymentModal({
  show,
  planId,
  loadingPlan,
  userEmail,
  theme,
  lang,
  payOnMPLabel,
  onPayWithCard,
  onPayOnMP,
  onClose,
}: SubscriptionPaymentModalProps) {
  if (!show || !planId) return null;

  const plan = PLANS[planId];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl bg-slate-100 dark:bg-slate-900 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <SubscriptionCardForm
          amount={plan.totalPrice}
          userEmail={userEmail}
          planLabel={plan.labelShort}
          theme={theme}
          lang={lang}
          onToken={onPayWithCard}
          onCancel={onClose}
        />
        <div className="mt-4">
          <button
            type="button"
            onClick={onPayOnMP}
            disabled={!!loadingPlan}
            className="w-full py-2.5 text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline disabled:opacity-50"
          >
            {payOnMPLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
