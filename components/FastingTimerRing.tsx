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
const INNER_DIAMETER = R * 2; // 188px - diâmetro interno do anel
const BUTTON_SIZE = INNER_DIAMETER - 8; // botão ocupa quase toda a circunferência (margem 4px cada lado)
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
  const labelPathId = React.useId().replace(/:/g, '');
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
          <div className="relative flex flex-col items-center justify-center">
            {/* Label do ciclo em arco ao redor do botão (dinâmico) */}
            <svg
              className="absolute pointer-events-none"
              width={SIZE}
              height={SIZE}
              viewBox={`0 0 ${SIZE} ${SIZE}`}
            >
              <defs>
                <path
                  id={labelPathId}
                  d={`M ${CX - R + 6} ${CY} A ${R - 6} ${R - 6} 0 0 0 ${CX + R - 6} ${CY}`}
                />
              </defs>
              <text
                className="fill-current font-bold text-sm"
                style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
              >
                <textPath href={`#${labelPathId}`} startOffset="50%" textAnchor="middle">
                  {suggestedCycleLabel}
                </textPath>
              </text>
            </svg>
            <button
              onClick={onStartClick}
              style={{ width: BUTTON_SIZE, height: BUTTON_SIZE }}
              className="relative z-10 rounded-full flex flex-col items-center justify-center gap-0.5 font-bold bg-brand-500 hover:bg-brand-600 text-white transition-all hover:scale-[1.02] active:scale-[0.98] select-none shadow-[0_8px_0_0_rgba(0,0,0,0.18),0_14px_32px_-4px_rgba(0,0,0,0.22)] hover:shadow-[0_6px_0_0_rgba(0,0,0,0.18),0_16px_36px_-4px_rgba(0,0,0,0.28)] active:shadow-[0_2px_0_0_rgba(0,0,0,0.2)] border-2 border-brand-400/50 dark:border-brand-600/50"
            >
              <Play size={28} fill="currentColor" className="flex-shrink-0" />
              <span className="text-xl leading-tight font-bold px-3 text-center max-w-[85%]">
                {t.startNow}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FastingTimerRing;
