import React from 'react';
import { Play } from 'lucide-react';
import type { CurrentFast } from '../services/fastingService';

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

interface FastingTimerRingProps {
  currentFast: CurrentFast | null;
  elapsedSeconds: number;
  isDark: boolean;
  lang: 'pt' | 'en';
  onStartClick: () => void;
  suggestedCycleLabel: string;
  t: {
    elapsed: string;
    goal: string;
    min: string;
    startNow: string;
  };
}

const SIZE = 200;
const STROKE = 12;
const R = (SIZE - STROKE) / 2;
const CX = SIZE / 2;
const CY = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

const FastingTimerRing: React.FC<FastingTimerRingProps> = ({
  currentFast,
  elapsedSeconds,
  isDark,
  lang,
  onStartClick,
  suggestedCycleLabel,
  t,
}) => {
  const isActive = !!currentFast;
  const plannedSeconds = currentFast ? currentFast.plannedHours * 3600 : 3600;
  const progress = Math.min(1, elapsedSeconds / plannedSeconds);
  const goalReached = isActive && elapsedSeconds >= plannedSeconds;
  const remainingSeconds = Math.max(0, plannedSeconds - elapsedSeconds);
  const remainingHours = Math.floor(remainingSeconds / 3600);
  const remainingMins = Math.floor((remainingSeconds % 3600) / 60);

  const dashOffset = CIRCUMFERENCE * (1 - progress);

  return (
    <div
      className={`relative flex flex-col items-center justify-center animate-in fade-in duration-500 ${
        isActive ? 'animate-pulse-ring' : ''
      }`}
    >
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="transform -rotate-90"
      >
        {/* Background ring */}
        <circle
          cx={CX}
          cy={CY}
          r={R}
          fill="none"
          stroke={isDark ? 'rgba(71, 85, 105, 0.4)' : 'rgba(226, 232, 240, 0.8)'}
          strokeWidth={STROKE}
        />
        {/* Progress ring - gradient definition for active state */}
        {isActive && (
          <defs>
            <linearGradient id="fastingRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--brand-400)" />
              <stop offset="100%" stopColor="var(--brand-600)" />
            </linearGradient>
          </defs>
        )}
        <circle
          cx={CX}
          cy={CY}
          r={R}
          fill="none"
          stroke={goalReached ? 'rgb(34, 197, 94)' : isActive ? 'url(#fastingRingGradient)' : 'transparent'}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {isActive ? (
          <>
            <p
              className={`font-mono tabular-nums select-none ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
              style={{ fontSize: 'clamp(2rem, 10vw, 3.25rem)', lineHeight: 1.1 }}
            >
              {formatElapsed(elapsedSeconds)}
            </p>
            <p className={`text-xs uppercase tracking-wider mt-1 ${isDark ? 'text-brand-400' : 'text-brand-600'}`}>
              {t.elapsed}
            </p>
            {!goalReached && currentFast && currentFast.plannedHours >= 1 && (
              <p className={`text-sm mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {remainingHours > 0
                  ? `${remainingHours}h ${remainingMins}min ${lang === 'pt' ? 'restantes' : 'left'}`
                  : `${remainingMins} ${t.min} ${lang === 'pt' ? 'restantes' : 'left'}`}
              </p>
            )}
            {currentFast && currentFast.cycle !== 'custom' && (
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {t.goal}: {currentFast.plannedHours < 1
                  ? `${Math.round(currentFast.plannedHours * 60)} ${t.min}`
                  : `${currentFast.plannedHours}h`}
              </p>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 px-4">
            <p className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              {suggestedCycleLabel}
            </p>
            <button
              onClick={onStartClick}
              className="flex items-center justify-center gap-2 py-3 px-6 rounded-2xl font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/30 transition-all hover:scale-105 active:scale-100"
            >
              <Play size={20} fill="currentColor" />
              {t.startNow}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FastingTimerRing;
