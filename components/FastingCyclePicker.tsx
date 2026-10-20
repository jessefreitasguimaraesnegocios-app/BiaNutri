import React, { useEffect, useState } from 'react';
import { Clock, Calendar } from 'lucide-react';
import type { FastingCycle } from '../types';
import type { CurrentFast } from '../services/fastingService';

const CYCLES: { id: FastingCycle; label: string; shortLabel: string; hours: number; hintPt: string; hintEn: string }[] = [
  { id: '14', label: '14h', shortLabel: '14:10', hours: 14, hintPt: 'Iniciante', hintEn: 'Starter' },
  { id: '16', label: '16h', shortLabel: '16:8', hours: 16, hintPt: 'Mais comum', hintEn: 'Most common' },
  { id: '18', label: '18h', shortLabel: '18:6', hours: 18, hintPt: 'Intermediário', hintEn: 'Intermediate' },
  { id: '20', label: '20h', shortLabel: '20:4', hours: 20, hintPt: 'Avançado', hintEn: 'Advanced' },
  { id: 'custom', label: 'Personalizado', shortLabel: 'Personalizado', hours: 0, hintPt: 'Defina as horas', hintEn: 'Set hours' },
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
    customCycle?: string;
  };
}

/** Personalizado: mínimo 30 min, máximo 5 dias (120h). */
const HORAS_MIN_PERSONALIZADO = 0.5;
const HORAS_MAX_PERSONALIZADO = 5 * 24;

function limitarHorasPersonalizado(horas: number): number {
  return Math.min(HORAS_MAX_PERSONALIZADO, Math.max(HORAS_MIN_PERSONALIZADO, Math.round(horas * 100) / 100));
}

function lerHorasDigitadas(bruto: string): number | null {
  const limpo = bruto.trim().replace(',', '.');
  if (limpo === '' || limpo === '.' || limpo === ':') return null;
  // Aceita até 120:00 (5 dias em horas:minutos)
  const comDoisPontos = limpo.match(/^(\d{1,3}):(\d{1,2})$/);
  if (comDoisPontos) {
    const horas = Number(comDoisPontos[1]);
    const minutos = Number(comDoisPontos[2]);
    if (!Number.isFinite(horas) || !Number.isFinite(minutos) || minutos > 59) return null;
    return horas + minutos / 60;
  }
  const num = Number(limpo);
  return Number.isFinite(num) ? num : null;
}

function CampoHorasEditavel({
  valor,
  onChange,
  isDark,
  classe,
}: {
  valor: number;
  onChange: (v: number) => void;
  isDark: boolean;
  classe?: string;
}) {
  const [texto, setTexto] = useState(String(valor));

  useEffect(() => {
    setTexto(String(valor));
  }, [valor]);

  const aplicar = (bruto: string) => {
    const num = lerHorasDigitadas(bruto);
    if (num == null) {
      setTexto(String(valor));
      return;
    }
    const limitado = limitarHorasPersonalizado(num);
    setTexto(String(limitado));
    onChange(limitado);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      maxLength={6}
      value={texto}
      onChange={(e) => {
        let proximo = e.target.value.replace(/[^\d.,:]/g, '');
        if (proximo.includes(':')) {
          // Limita digitação tipo 120:59
          const partes = proximo.split(':');
          const h = (partes[0] ?? '').slice(0, 3);
          const m = (partes[1] ?? '').slice(0, 2);
          proximo = partes.length > 1 ? `${h}:${m}` : h.includes(':') ? h : `${h}:`;
          if (Number(h) > HORAS_MAX_PERSONALIZADO) {
            setTexto(String(HORAS_MAX_PERSONALIZADO));
            onChange(HORAS_MAX_PERSONALIZADO);
            return;
          }
          setTexto(proximo);
          return;
        }
        if (proximo === '' || proximo === '.' || proximo === ',') {
          setTexto(proximo);
          return;
        }
        const num = lerHorasDigitadas(proximo);
        if (num != null && num > HORAS_MAX_PERSONALIZADO) {
          setTexto(String(HORAS_MAX_PERSONALIZADO));
          onChange(HORAS_MAX_PERSONALIZADO);
          return;
        }
        setTexto(proximo);
        if (num != null && num >= HORAS_MIN_PERSONALIZADO) onChange(Math.round(num * 100) / 100);
      }}
      onBlur={() => aplicar(texto)}
      className={
        classe ??
        `flex-1 p-3 rounded-xl font-mono text-lg border-0 ${
          isDark ? 'bg-slate-700 text-white' : 'bg-white dark:bg-slate-700 text-slate-900'
        }`
      }
    />
  );
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
            {CYCLES.filter((c) => c.id !== '1m').map((c) => {
              const personalizadoAtivo = c.id === 'custom' && (currentFast?.cycle === 'custom' || showCustomCycleInput);
              const cicloAtivo = c.id !== 'custom' && currentFast?.cycle === c.id && !showCustomCycleInput;
              const selecionado = personalizadoAtivo || cicloAtivo;
              return (
              <button
                key={c.id}
                onClick={() => {
                  if (c.id === 'custom') {
                    setShowCustomCycleInput(true);
                  } else {
                    setShowCustomCycleInput(false);
                    onCycleChangeActive(c.id);
                  }
                }}
                className={`
                  px-4 py-3 rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-100
                  ${selecionado
                    ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30'
                    : isDark
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 shadow'
                  }
                `}
              >
                {c.id === 'custom' ? (t.customCycle ?? c.label) : c.label}
              </button>
              );
            })}
          </div>
          {showCustomCycleInput && (
            <div className="mt-4 space-y-2">
              <div className="flex gap-2 items-center">
                <CampoHorasEditavel
                  valor={switchCustomHours}
                  onChange={setSwitchCustomHours}
                  isDark={isDark}
                />
                <span className="text-sm text-slate-500">{t.hours}</span>
                <button
                  onClick={() => onCycleChangeActive('custom', limitarHorasPersonalizado(switchCustomHours))}
                  className="px-5 py-3 rounded-xl font-bold text-sm bg-brand-500 text-white hover:bg-brand-600"
                >
                  {t.apply}
                </button>
              </div>
              <p className="text-xs text-slate-500">
                {lang === 'pt' ? 'Máx. 5 dias (120h). Ex.: 5:40 ou 120' : 'Max 5 days (120h). Ex.: 5:40 or 120'}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label className="text-sm font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 block text-center">{t.cycle}</label>
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
              {c.id === 'custom' ? (t.customCycle ?? c.shortLabel) : c.shortLabel}
            </span>
            <span className="text-[10px] mt-0.5 text-slate-500">{hint(c.hintPt, c.hintEn)}</span>
          </button>
        ))}
      </div>

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
            <div className="space-y-1">
              <div className="flex gap-2 items-center">
                <CampoHorasEditavel
                  valor={customHours}
                  onChange={onCustomHoursChange}
                  isDark={isDark}
                  classe={`w-full p-3 rounded-xl font-mono text-lg border-0 ${
                    isDark ? 'bg-slate-800 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-900'
                  }`}
                />
                <span className="text-sm text-slate-500 shrink-0">{t.hours}</span>
              </div>
              <p className="text-[10px] text-slate-500">
                {lang === 'pt' ? 'Máx. 5 dias (120h)' : 'Max 5 days (120h)'}
              </p>
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
