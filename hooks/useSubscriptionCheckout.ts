import { useCallback, useRef, useState } from 'react';
import { createSubscriptionCheckout } from '../services/subscriptionService';
import type { PlanId } from '../constants/plans';

export interface UseSubscriptionCheckoutOptions {
  userId: string;
  backUrl: string;
  onSuccess?: () => void;
  onVerifySubscription?: () => Promise<void>;
  errorMessage?: string;
}

export function useSubscriptionCheckout({
  userId,
  backUrl,
  onSuccess,
  onVerifySubscription,
  errorMessage = 'Erro ao abrir checkout. Tente novamente.',
}: UseSubscriptionCheckoutOptions) {
  const [showCardModal, setShowCardModal] = useState(false);
  const [selectedPlanForCard, setSelectedPlanForCard] = useState<PlanId | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectedRef = useRef<PlanId | null>(null);
  selectedRef.current = selectedPlanForCard;

  const closeModal = useCallback(() => {
    setShowCardModal(false);
    setSelectedPlanForCard(null);
  }, []);

  /** Clica em Assinar: redireciona direto para o site do Mercado Pago (sem modal de cartão). */
  const handleSelectPlan = useCallback(
    async (planId: PlanId) => {
      setError(null);
      setLoadingPlan(planId);
      try {
        const { init_point, error: err } = await createSubscriptionCheckout(userId, planId, backUrl);
        if (err) {
          setError(errorMessage);
          return;
        }
        if (init_point) {
          window.location.href = init_point;
        } else {
          setError(errorMessage);
        }
      } catch {
        setError(errorMessage);
      } finally {
        setLoadingPlan(null);
      }
    },
    [userId, backUrl, errorMessage]
  );

  const handlePayWithCard = useCallback(
    async (_cardTokenId: string) => {
      const planId = selectedRef.current;
      if (!planId) return;
      const res = await createSubscriptionCheckout(userId, planId, backUrl, _cardTokenId);
      if (res.ok) {
        closeModal();
        onSuccess?.();
        await onVerifySubscription?.();
      } else if (res.init_point) {
        window.location.href = res.init_point;
      } else {
        throw new Error(res.error);
      }
    },
    [userId, backUrl, closeModal, onSuccess, onVerifySubscription]
  );

  const handlePayOnMP = useCallback(async () => {
    const planId = selectedRef.current;
    if (!planId) return;
    setLoadingPlan(planId);
    setError(null);
    try {
      const { init_point, error: err } = await createSubscriptionCheckout(userId, planId, backUrl);
      if (err) {
        setError(errorMessage);
        return;
      }
      if (init_point) {
        closeModal();
        window.location.href = init_point;
      } else {
        setError(errorMessage);
      }
    } catch {
      setError(errorMessage);
    } finally {
      setLoadingPlan(null);
    }
  }, [userId, backUrl, closeModal, errorMessage]);

  return {
    showCardModal,
    selectedPlanForCard,
    loadingPlan,
    error,
    setError,
    closeModal,
    handleSelectPlan,
    handlePayWithCard,
    handlePayOnMP,
  };
}
