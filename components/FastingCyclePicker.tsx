import React from 'react';
import { Clock, Calendar } from 'lucide-react';
import type { FastingCycle } from '../types';
import type { CurrentFast } from '../services/fastingService';

const CYCLES: { id: FastingCycle; label: string; shortLabel: string; hours: number; hintPt: string; hintEn: string }[] = [
  { id: '14', label: '14h', shortLabel: '14:10', hours: 14, hintPt: 'Iniciante', hintEn: 'Starter' },
  { id: '16', label: '16h', shortLabel: '16:8', hours: 16, hintPt: 'Mais comum', hintEn: 'Most common' },
  { id: '18', label: '18h', shortLabel: '18:6', hours: 18, hintPt: 'Intermediário', hintEn: 'Intermediate' },
  { id: '20', label: '20h', shortLabel: '20:4', hours: 20, hintPt: 'Avançado', hintEn: 'Advanced' },
  { id: 'custom', label: 'Personalizado', shortLabel: 'Custom', hours: 0, hintPt: 'Defina as horas', hintEn: 'Set hours' },
];

interface FastingCyclePickerProps {
  /** When no active fast: selected cycle and handlers */
  cycle: FastingCycle;
  onCycleChange: (c: FastingCycle) => void;
  startTime: string;
  onStartTimeChange: (v: string) => void;
  endTime: string;
  onEndTimeChange?: (v: string) => void;
  customHours: number;
  onCustomHoursChange: (v: number) => void;
  computedHours: number;
  /** When active fast: current fast and change handler */
  currentFast: CurrentFast | null;
  onCycleChangeActive: (newCycle: FastingCycle, customHoursValue?: number) => void;
  showCustomCycleInput: boolean;
  setShowCustomCycleInput: (v: boolean) => void;
  switchCustomHours: number;
  setSwitchCustomHours: (v: number) => void;
  expectedEndStr: string;
  isDark: boolean;
  lang: 'pt' | 'en';
  t: {
    cycle: string;
    start: string;
    end: string;
    hours: string;
    expectedEnd: string;
    changeCycle: string;
    apply: string;
    timeSimulatorTitle?: string;
  };
}

const FastingCyclePicker: React.FC<FastingCyclePickerProps> = ({
  cycle,
  onCycleChange,
  startTime,
  onStartTimeChange,
  endTime,
  onEndTimeChange,
  customHours,
  onCustomHoursChange,
  computedHours,
  currentFast,
  onCycleChangeActive,
  showCustomCycleInput,
  setShowCustomCycleInput,
  switchCustomHours,
  setSwitchCustomHours,
  expectedEndStr,
  isDark,
  lang,
  t,
}) => {
  const isActive = !!currentFast;
  const hint = (hintPt: string, hintEn: string) => (lang === 'pt' ? hintPt : hintEn);

  if (isActive) {
    return (
      <div className={`rounded-2xl p-5 sm:p-6 space-y-6 ${isDark ? 'bg-slate-800/80' : 'bg-slate-100 dark:bg-slate-800/50'}`}>
        <div className="flex items-center gap-2">
          <Calendar className={isDark ? 'text-brand-400' : 'text-brand-600'} size={20} />
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{t.expectedEnd}</label>
            <p className={`text-xl sm:text-2xl font-bold font-mono tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {expectedEndStr}
            </p>
          </div>
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-3">{t.changeCycle}</label>
          <div className="flex flex-wrap gap-2">
            {CYCLES.filter((c) => c.id !== '1m').map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  if (c.id === 'custom') setShowCustomCycleInput(true);
                  else onCycleChangeActive(c.id);
                }}
                className={`
                  px-4 py-3 rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-100
                  ${currentFast?.cycle === c.id
                    ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30'
                    : isDark
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 shadow'
                  }
                `}
              >
                {c.label}
              </button>
            ))}
          </div>
          {showCustomCycleInput && (
            <div className="flex gap-2 items-center mt-4">
              <input
                type="number"
                min={1}
                max={24}
                value={switchCustomHours}
                onChange={(e) => setSwitchCustomHours(Number(e.target.value) || 16)}
                className={`flex-1 p-3 rounded-xl font-mono text-lg border-0 ${
                  isDark ? 'bg-slate-700 text-white' : 'bg-white dark:bg-slate-700 text-slate-900'
                }`}
              />
              <span className="text-sm text-slate-500">{t.hours}</span>
              <button
                onClick={() => onCycleChangeActive('custom', switchCustomHours)}
                className="px-5 py-3 rounded-xl font-bold text-sm bg-brand-500 text-white hover:bg-brand-600"
              >
                {t.apply}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{t.cycle}</label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {CYCLES.map((c) => (
          <button
            key={c.id}
            onClick={() => onCycleChange(c.id)}
            className={`
              rounded-2xl p-4 flex flex-col items-center text-center transition-all hover:scale-[1.02] active:scale-100
              border-2
              ${cycle === c.id
                ? 'border-brand-500 bg-brand-500/10 dark:bg-brand-500/20 shadow-md'
                : isDark
                ? 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
                : 'border-slate-200 bg-white dark:bg-slate-800/50 hover:border-slate-300'
              }
            `}
          >
            <Clock size={20} className={cycle === c.id ? 'text-brand-500' : isDark ? 'text-slate-400' : 'text-slate-500'} />
            <span className={`font-bold mt-1 ${cycle === c.id ? 'text-brand-600 dark:text-brand-400' : isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              {c.shortLabel}
            </span>
            <span className="text-[10px] mt-0.5 text-slate-500">{hint(c.hintPt, c.hintEn)}</span>
          </button>
        ))}
      </div>

      {t.timeSimulatorTitle && (
        <p className={`text-center text-xl font-bold mt-10 mb-1 ${isDark ? 'text-brand-400' : 'text-brand-600'}`}>
          {t.timeSimulatorTitle}
        </p>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase text-slate-500">{t.start}</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => onStartTimeChange(e.target.value)}
            className={`w-full p-3 rounded-xl font-mono text-lg border-0 ${
              isDark ? 'bg-slate-800 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-900'
            }`}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase text-slate-500">{t.end}</label>
          {cycle === 'custom' ? (
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min={1}
                max={24}
                value={customHours}
                onChange={(e) => onCustomHoursChange(Number(e.target.value) || 16)}
                className={`w-full p-3 rounded-xl font-mono text-lg border-0 ${
                  isDark ? 'bg-slate-800 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-900'
                }`}
              />
              <span className="text-sm text-slate-500">{t.hours}</span>
            </div>
          ) : (
            <input
              type="time"
              value={endTime}
              onChange={(e) => onEndTimeChange?.(e.target.value)}
              className={`w-full p-3 rounded-xl font-mono text-lg border-0 ${
                isDark ? 'bg-slate-800 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-900'
              }`}
            />
          )}
        </div>
      </div>

      {cycle !== 'custom' && (
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {computedHours.toFixed(1)} {t.hours}
        </p>
      )}
    </div>
  );
};

export default FastingCyclePicker;
