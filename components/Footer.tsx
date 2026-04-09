import React from 'react';
import { Calendar, ShieldAlert, Sparkles } from 'lucide-react';
import { Translation } from '../types';

interface FooterProps {
  texts: Translation;
  onCalendar: () => void;
  onRestrictions: () => void;
  onDietSuggestions: () => void;
}

/** Botões laterais: mesmo “card” (borda, sombra, altura, cantos). */
const footerSideCardBase =
  'flex-1 min-w-0 flex flex-col sm:flex-row items-center justify-center gap-1.5 px-3 py-3 rounded-2xl border shadow-sm min-h-[3.25rem] font-semibold text-[10px] sm:text-xs transition-colors active:scale-[0.98]';

const footerRestrictionsCard =
  `${footerSideCardBase} border-red-200 dark:border-red-900/50 bg-red-50/90 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/50`;

const footerDietCard =
  `${footerSideCardBase} border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/90 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/50`;

const Footer: React.FC<FooterProps> = ({
  texts,
  onCalendar,
  onRestrictions,
  onDietSuggestions,
}) => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 sm:px-4 py-3">
      <div className="max-w-md mx-auto flex items-center justify-between gap-1 sm:gap-2">
        <button
          type="button"
          onClick={onRestrictions}
          className={footerRestrictionsCard}
          aria-label={texts.dietaryRestrictionsBtn}
        >
          <ShieldAlert size={18} className="shrink-0" aria-hidden />
          <span className="truncate text-center leading-tight max-w-[5rem] sm:max-w-none">
            {texts.footerRestrictionsBtn}
          </span>
        </button>

        <button
          type="button"
          onClick={onCalendar}
          className="flex-shrink-0 flex items-center justify-center gap-1.5 px-4 sm:px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-full shadow-lg shadow-brand-500/30 transition-all active:scale-95 text-sm"
          aria-label={texts.calendar}
        >
          <Calendar size={20} aria-hidden />
          <span className="hidden sm:inline">{texts.calendar}</span>
        </button>

        <button
          type="button"
          onClick={onDietSuggestions}
          className={footerDietCard}
          aria-label={texts.dietSuggestionsBtn}
        >
          <Sparkles size={18} className="shrink-0" aria-hidden />
          <span className="truncate text-center leading-tight max-w-[5rem] sm:max-w-none">
            {texts.dietSuggestionsBtn}
          </span>
        </button>
      </div>
    </footer>
  );
};

export default Footer;
