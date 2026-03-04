import React from 'react';
import { Flame, Zap, Sparkles } from 'lucide-react';

const PHASE_GLUCOSE = 0;
const PHASE_FAT = 12 * 3600;   // 12h
const PHASE_AUTOPHAGY = 16 * 3600; // 16h

interface Phase {
  id: string;
  labelPt: string;
  labelEn: string;
  thresholdSeconds: number;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  colorActive: string;
  colorInactive: string;
}

const PHASES: Phase[] = [
  {
    id: 'glucose',
    labelPt: 'Queima de glicose',
    labelEn: 'Glucose burning',
    thresholdSeconds: PHASE_GLUCOSE,
    Icon: Zap,
    colorActive: 'text-amber-500',
    colorInactive: 'text-slate-400 dark:text-slate-500',
  },
  {
    id: 'fat',
    labelPt: 'Queima de gordura',
    labelEn: 'Fat burning',
    thresholdSeconds: PHASE_FAT,
    Icon: Flame,
    colorActive: 'text-orange-500',
    colorInactive: 'text-slate-400 dark:text-slate-500',
  },
  {
    id: 'autophagy',
    labelPt: 'Autofagia',
    labelEn: 'Autophagy',
    thresholdSeconds: PHASE_AUTOPHAGY,
    Icon: Sparkles,
    colorActive: 'text-purple-500',
    colorInactive: 'text-slate-400 dark:text-slate-500',
  },
];

interface FastingPhasesProps {
  elapsedSeconds: number;
  isDark: boolean;
  lang: 'pt' | 'en';
  /** Duração planejada em segundos; fases além disso (ex.: autofagia 16h) não são exibidas */
  plannedSeconds?: number;
}

const FastingPhases: React.FC<FastingPhasesProps> = ({ elapsedSeconds, isDark, lang, plannedSeconds }) => {
  const phasesToShow = plannedSeconds != null
    ? PHASES.filter((p) => p.thresholdSeconds <= plannedSeconds)
    : PHASES;
  const colClass = phasesToShow.length === 2 ? 'grid-cols-2' : 'grid-cols-3';
  return (
    <div className={`grid gap-2 sm:gap-3 ${colClass}`}>
      {phasesToShow.map((phase, index) => {
        const isActive = elapsedSeconds >= phase.thresholdSeconds;
        const label = lang === 'pt' ? phase.labelPt : phase.labelEn;
        return (
          <div
            key={phase.id}
            className={`
              rounded-2xl p-3 sm:p-4 flex flex-col items-center text-center transition-all duration-500
              ${isActive
                ? isDark
                  ? 'bg-slate-700/80 fasting-phase-green-border'
                  : 'bg-white dark:bg-slate-800 shadow-md fasting-phase-green-border'
                : isDark
                  ? 'bg-slate-800/50 ring-1 ring-slate-600/50'
                  : 'bg-slate-100 dark:bg-slate-800/50 ring-1 ring-slate-200 dark:ring-slate-600/50'
              }
            `}
            style={isActive ? { animationDelay: '0ms' } : { animationDelay: `${index * 80}ms` }}
          >
            <phase.Icon
              size={28}
              className={`mb-1 transition-colors duration-300 ${
                isActive ? phase.colorActive : phase.colorInactive
              }`}
            />
            <span
              className={`text-xs font-semibold leading-tight ${
                isActive
                  ? isDark
                    ? 'text-slate-200'
                    : 'text-slate-800 dark:text-slate-200'
                  : isDark
                    ? 'text-slate-500'
                    : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              {label}
            </span>
            {phase.thresholdSeconds > 0 && (
              <span className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {phase.thresholdSeconds / 3600}h+
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default FastingPhases;
