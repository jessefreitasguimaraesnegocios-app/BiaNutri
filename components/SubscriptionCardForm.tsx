import React, { useEffect, useRef, useState } from 'react';
import { loadMercadoPago } from '@mercadopago/sdk-js';
import { Loader2 } from 'lucide-react';

const PUBLIC_KEY = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY ?? '';

export interface SubscriptionCardFormProps {
  amount: number;
  userEmail: string;
  planLabel: string;
  theme: 'light' | 'dark';
  lang: 'pt' | 'en';
  onToken: (cardTokenId: string) => Promise<void>;
  onCancel: () => void;
}

const texts = {
  pt: {
    title: 'Pagamento com cartão',
    pay: 'Assinar e pagar',
    cancel: 'Voltar',
    loading: 'Carregando...',
    noKey: 'Pagamento com cartão não configurado. Use o link abaixo para pagar no Mercado Pago.',
  },
  en: {
    title: 'Card payment',
    pay: 'Subscribe and pay',
    cancel: 'Back',
    loading: 'Loading...',
    noKey: 'Card payment not configured. Use the link below to pay on Mercado Pago.',
  },
};

export default function SubscriptionCardForm({
  amount,
  userEmail,
  planLabel,
  theme,
  lang,
  onToken,
  onCancel,
}: SubscriptionCardFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cardFormRef = useRef<{ getCardFormData: () => { token?: string } } | null>(null);
  const t = texts[lang];
  const isDark = theme === 'dark';

  useEffect(() => {
    if (!PUBLIC_KEY || !formRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        await loadMercadoPago();
        if (cancelled) return;
        const mp = (window as unknown as { MercadoPago: new (key: string) => { cardForm: (opts: unknown) => unknown } }).MercadoPago;
        if (!mp) {
          setError('Mercado Pago não carregou.');
          setLoading(false);
          return;
        }
        const instance = new mp(PUBLIC_KEY);
        const cardForm = instance.cardForm({
          amount: String(amount),
          iframe: true,
          form: {
            id: 'form-checkout',
            cardNumber: { id: 'form-checkout__cardNumber', placeholder: lang === 'pt' ? 'Número do cartão' : 'Card number' },
            expirationDate: { id: 'form-checkout__expirationDate', placeholder: 'MM/YY' },
            securityCode: { id: 'form-checkout__securityCode', placeholder: 'CVV' },
            cardholderName: { id: 'form-checkout__cardholderName', placeholder: lang === 'pt' ? 'Nome no cartão' : 'Cardholder name' },
            issuer: { id: 'form-checkout__issuer', placeholder: lang === 'pt' ? 'Banco' : 'Bank' },
            installments: { id: 'form-checkout__installments', placeholder: '1' },
            identificationType: { id: 'form-checkout__identificationType', placeholder: 'CPF' },
            identificationNumber: { id: 'form-checkout__identificationNumber', placeholder: lang === 'pt' ? 'CPF' : 'ID' },
            cardholderEmail: { id: 'form-checkout__cardholderEmail', placeholder: userEmail || 'email@exemplo.com' },
          },
          callbacks: {
            onFormMounted: (err: Error) => {
              if (err) console.warn('CardForm mounted error', err);
              if (!cancelled) setLoading(false);
            },
            onSubmit: (event: Event) => {
              event.preventDefault();
              const data = cardFormRef.current?.getCardFormData?.();
              const token = data?.token;
              if (!token) {
                setError(lang === 'pt' ? 'Dados do cartão inválidos.' : 'Invalid card data.');
                return;
              }
              setSubmitting(true);
              setError(null);
              onTokenRef.current(token).catch((e) => {
                setError(e?.message ?? (lang === 'pt' ? 'Erro ao processar. Tente novamente.' : 'Error. Try again.'));
              }).finally(() => {
                setSubmitting(false);
              });
            },
          },
        }) as { getCardFormData: () => { token?: string } };
        cardFormRef.current = cardForm;
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Erro ao carregar formulário.');
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [PUBLIC_KEY, amount, lang, userEmail]);

  if (!PUBLIC_KEY) {
    return (
      <div className={`rounded-xl p-6 ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-800 border border-slate-200'}`}>
        <p className="text-sm mb-4">{t.noKey}</p>
        <button
          type="button"
          onClick={onCancel}
          className="w-full py-2.5 rounded-lg font-medium border border-slate-300 dark:border-slate-600"
        >
          {t.cancel}
        </button>
      </div>
    );
  }

  return (
    <div className={`rounded-xl p-6 ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-800 border border-slate-200'}`}>
      <h3 className="font-bold text-lg mb-2">{t.title}</h3>
      <p className="text-sm opacity-90 mb-4">
        {planLabel} · R$ {amount.toFixed(2).replace('.', ',')}
      </p>
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/15 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}
      <form
        ref={formRef}
        id="form-checkout"
        className="flex flex-col gap-3 max-w-md"
        style={{ display: loading ? 'none' : 'flex' }}
      >
        <div id="form-checkout__cardNumber" className="min-h-[40px] border border-slate-300 dark:border-slate-600 rounded-lg" />
        <div className="grid grid-cols-2 gap-3">
          <div id="form-checkout__expirationDate" className="min-h-[40px] border border-slate-300 dark:border-slate-600 rounded-lg" />
          <div id="form-checkout__securityCode" className="min-h-[40px] border border-slate-300 dark:border-slate-600 rounded-lg" />
        </div>
        <div id="form-checkout__cardholderName" className="min-h-[40px] border border-slate-300 dark:border-slate-600 rounded-lg" />
        <div id="form-checkout__cardholderEmail" className="min-h-[40px] border border-slate-300 dark:border-slate-600 rounded-lg" />
        <div className="grid grid-cols-2 gap-3">
          <div id="form-checkout__identificationType" className="min-h-[40px] border border-slate-300 dark:border-slate-600 rounded-lg" />
          <div id="form-checkout__identificationNumber" className="min-h-[40px] border border-slate-300 dark:border-slate-600 rounded-lg" />
        </div>
        <div id="form-checkout__issuer" className="min-h-[40px] border border-slate-300 dark:border-slate-600 rounded-lg" />
        <div id="form-checkout__installments" className="min-h-[40px] border border-slate-300 dark:border-slate-600 rounded-lg" />
        <div className="flex gap-3 mt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 py-3 rounded-xl font-semibold border-2 border-slate-300 dark:border-slate-600"
          >
            {t.cancel}
          </button>
          <button
            type="submit"
            disabled={submitting || loading}
            className="flex-1 py-3 rounded-xl font-semibold bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 size={20} className="animate-spin" /> : null}
            {submitting ? (lang === 'pt' ? 'Processando...' : 'Processing...') : t.pay}
          </button>
        </div>
      </form>
      {loading && (
        <div className="flex items-center justify-center py-8 gap-2 text-slate-500">
          <Loader2 size={24} className="animate-spin" />
          <span>{t.loading}</span>
        </div>
      )}
    </div>
  );
}
