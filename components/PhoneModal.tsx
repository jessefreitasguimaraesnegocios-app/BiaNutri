import React, { useState } from 'react';
import { Smartphone, Loader2, ArrowRight, LogOut } from 'lucide-react';
import { setPhone as savePhone, checkPhoneAlreadyUsed, normalizePhone } from '../services/subscriptionService';
import { TRIAL_MINUTES } from '../constants/plans';

/** Aplica máscara BR: (XX) XXXXX-XXXX celular ou (XX) XXXX-XXXX fixo */
function formatPhoneMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) {
    return digits.length === 0 ? '' : digits.length === 1 ? `(${digits}` : `(${digits})`;
  }
  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  const isMobile = rest[0] === '9';
  if (isMobile) {
    if (rest.length <= 5) return `(${ddd}) ${rest}`;
    return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
  }
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
}

interface PhoneModalProps {
  isOpen: boolean;
  userId: string;
  theme: 'light' | 'dark';
  lang: 'pt' | 'en';
  onSuccess: () => void;
  onBackToLogin?: () => void;
}

const getTexts = (trialMinutes: number) => ({
  pt: {
    title: 'Quase lá!',
    subtitle: `Informe seu número de telefone para começar seu período de teste de ${trialMinutes} minutos.`,
    placeholder: '(31) 99999-9999',
    label: 'Telefone (com DDD)',
    button: 'Continuar',
    backToLogin: 'Voltar ao login',
    errorInvalid: 'Digite um telefone válido com DDD.',
    errorAlreadyUsed: 'Este número já utilizou o período de teste em outra conta.',
    errorGeneric: 'Não foi possível salvar. Tente novamente.',
  },
  en: {
    title: 'Almost there!',
    subtitle: `Enter your phone number to start your ${trialMinutes}-minute free trial.`,
    placeholder: '(31) 99999-9999',
    label: 'Phone (with area code)',
    button: 'Continue',
    backToLogin: 'Back to login',
    errorInvalid: 'Enter a valid phone number with area code.',
    errorAlreadyUsed: 'This number has already used the free trial.',
    errorGeneric: 'Could not save. Please try again.',
  },
});

const PhoneModal: React.FC<PhoneModalProps> = ({
  isOpen,
  userId,
  theme,
  lang,
  onSuccess,
  onBackToLogin,
}) => {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const texts = getTexts(TRIAL_MINUTES);

  if (!isOpen) return null;

  const t = texts[lang];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const normalized = normalizePhone(phone);
    if (normalized.length < 10) {
      setError(t.errorInvalid);
      return;
    }
    setLoading(true);
    try {
      const alreadyUsed = await checkPhoneAlreadyUsed(phone, userId);
      if (alreadyUsed) {
        setError(t.errorAlreadyUsed);
        setLoading(false);
        return;
      }
      const { error: saveError } = await savePhone(userId, phone);
      if (saveError) {
        setError(saveError === 'phone_required' ? t.errorInvalid : t.errorGeneric);
        setLoading(false);
        return;
      }
      onSuccess();
    } catch {
      setError(t.errorGeneric);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className={`relative w-full max-w-md rounded-2xl shadow-2xl ${
          theme === 'dark'
            ? 'bg-slate-800 border border-slate-700'
            : 'bg-white border border-slate-200'
        }`}
      >
        <div className="p-6 pt-8">
          <div className="flex justify-center mb-6">
            <div
              className={`p-4 rounded-2xl ${
                theme === 'dark' ? 'bg-brand-500/20' : 'bg-brand-100'
              }`}
            >
              <Smartphone
                className={theme === 'dark' ? 'text-brand-400' : 'text-brand-600'}
                size={48}
              />
            </div>
          </div>
          <h2
            className={`text-2xl font-bold text-center mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            }`}
          >
            {t.title}
          </h2>
          <p
            className={`text-center text-sm mb-6 ${
              theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            {t.subtitle}
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                {t.label}
              </label>
              <div className="relative">
                <Smartphone
                  className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                  }`}
                  size={20}
                />
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatPhoneMask(e.target.value))}
                  placeholder={t.placeholder}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border ${
                    theme === 'dark'
                      ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'
                  } focus:outline-none focus:ring-2 focus:ring-brand-500`}
                />
              </div>
            </div>
            {error && (
              <div
                className={`p-3 rounded-xl text-sm ${
                  theme === 'dark'
                    ? 'bg-red-900/20 border border-red-800 text-red-300'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}
              >
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-semibold bg-brand-500 hover:bg-brand-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  {lang === 'pt' ? 'Salvando...' : 'Saving...'}
                </>
              ) : (
                <>
                  {t.button}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
            {onBackToLogin && (
              <button
                type="button"
                onClick={onBackToLogin}
                className={`w-full mt-3 py-2.5 px-4 rounded-xl font-medium border transition-colors flex items-center justify-center gap-2 ${
                  theme === 'dark'
                    ? 'border-slate-600 text-slate-300 hover:bg-slate-700'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <LogOut size={18} />
                {t.backToLogin}
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default PhoneModal;
