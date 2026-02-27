import React, { useState, useEffect } from 'react';
import { Clock, Play, Square } from 'lucide-react';
import type { FastingCycle, FastingEntry } from '../types';
import {
  getFastingEntries,
  saveFastingEntry,
  getCurrentFast,
  setCurrentFast,
  clearCurrentFast,
  hoursBetween,
  dateToKey,
  deleteFastingEntry,
  type CurrentFast,
} from '../services/fastingService';
import FastingTimerRing from './FastingTimerRing';
import FastingPhases from './FastingPhases';
import FastingCyclePicker from './FastingCyclePicker';
import FastingCalendar from './FastingCalendar';

interface FastingSlideProps {
  userId: string;
  theme: 'light' | 'dark';
  lang: 'pt' | 'en';
}

const CYCLES: { id: FastingCycle; label: string; hours: number }[] = [
  { id: '1m', label: '1 min', hours: 1 / 60 },
  { id: '14', label: '14h', hours: 14 },
  { id: '16', label: '16h', hours: 16 },
  { id: '18', label: '18h', hours: 18 },
  { id: '20', label: '20h', hours: 20 },
  { id: 'custom', label: 'Personalizado', hours: 0 },
];

const texts = {
  pt: {
    title: 'Jejum',
    subtitle: 'Defina início e fim e acompanhe seus ciclos.',
    cycle: 'Ciclo',
    start: 'Início',
    end: 'Fim',
    hours: 'horas',
    register: 'Registrar jejum hoje',
    startNow: 'Iniciar jejum',
    startTimeChoice: 'Quando começou?',
    useCurrentTime: 'Horário atual',
    startedAt: 'Comecei às',
    confirmStart: 'Iniciar',
    cancel: 'Cancelar',
    goalHit: 'Meta Batida!',
    endFast: 'Encerrar jejum',
    elapsed: 'Tempo de jejum',
    goal: 'Meta',
    min: 'min',
    calendar: 'Calendário',
    dayHours: 'horas neste dia',
    totalWeek: 'Total esta semana',
    totalMonth: 'Total este mês',
    totalAll: 'Total geral',
    close: 'Fechar',
    noData: 'Nenhum jejum neste dia.',
    swipeHint: '← Voltar para o app',
    recentFasts: 'Últimos jejums',
    lastDays: 'Últimos 14 dias',
    deleteEntry: 'Excluir marcação',
    expectedEnd: 'Horário final esperado',
    today: 'Hoje',
    tomorrow: 'Amanhã',
    changeCycle: 'Trocar ciclo',
    apply: 'Aplicar',
    endTimeChoice: 'Quando você encerrou o jejum?',
    endedAt: 'Encerrei às',
    confirmEnd: 'Encerrar',
  },
  en: {
    title: 'Fasting',
    subtitle: 'Set start and end time and track your cycles.',
    cycle: 'Cycle',
    start: 'Start',
    end: 'End',
    hours: 'hours',
    register: 'Log fast today',
    startNow: 'Start fast',
    startTimeChoice: 'When did you start?',
    useCurrentTime: 'Current time',
    startedAt: 'I started at',
    confirmStart: 'Start',
    cancel: 'Cancel',
    goalHit: 'Goal hit!',
    endFast: 'End fast',
    elapsed: 'Fasting time',
    goal: 'Goal',
    min: 'min',
    calendar: 'Calendar',
    dayHours: 'hours this day',
    totalWeek: 'Total this week',
    totalMonth: 'Total this month',
    totalAll: 'Total overall',
    close: 'Close',
    noData: 'No fast on this day.',
    swipeHint: '← Back to app',
    recentFasts: 'Recent fasts',
    lastDays: 'Last 14 days',
    deleteEntry: 'Delete entry',
    expectedEnd: 'Expected end time',
    today: 'Today',
    tomorrow: 'Tomorrow',
    changeCycle: 'Change cycle',
    apply: 'Apply',
    endTimeChoice: 'When did you end the fast?',
    endedAt: 'I ended at',
    confirmEnd: 'End',
  },
};

function getStartTimestampFromTime(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m ?? 0, 0, 0);
  if (d.getTime() > Date.now()) d.setDate(d.getDate() - 1);
  return d.getTime();
}

function getEndTimestampFromTime(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m ?? 0, 0, 0);
  if (d.getTime() > Date.now()) d.setDate(d.getDate() - 1);
  return d.getTime();
}

function formatExpectedEnd(
  startTimestamp: number,
  plannedHours: number,
  todayLabel: string,
  tomorrowLabel: string
): string {
  const endMs = startTimestamp + plannedHours * 3600 * 1000;
  const endDate = new Date(endMs);
  const timeStr = endDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (endDay.getTime() === today.getTime()) return `${todayLabel} ${timeStr}`;
  if (endDay.getTime() === tomorrow.getTime()) return `${tomorrowLabel} ${timeStr}`;
  return `${endDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${timeStr}`;
}

function suggestedCycleLabel(cycle: FastingCycle, customHours: number, lang: 'pt' | 'en'): string {
  if (cycle === 'custom') return `${customHours}h`;
  const map: Record<string, string> = { '14': '14:10', '16': '16:8', '18': '18:6', '20': '20:4' };
  return map[cycle] || `${cycle}h`;
}

const FastingSlide: React.FC<FastingSlideProps> = ({ userId, theme, lang }) => {
  const [cycle, setCycle] = useState<FastingCycle>('16');
  const [startTime, setStartTime] = useState('20:00');
  const [endTime, setEndTime] = useState('12:00');
  const [customHours, setCustomHours] = useState(16);
  const [entries, setEntries] = useState<FastingEntry[]>([]);
  const [currentFast, setCurrentFastState] = useState<CurrentFast | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [selectedEntry, setSelectedEntry] = useState<FastingEntry | null>(null);
  const [showStartTimeModal, setShowStartTimeModal] = useState(false);
  const [startTimeChoice, setStartTimeChoice] = useState<'now' | 'past'>('now');
  const [pastStartTime, setPastStartTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [showCustomCycleInput, setShowCustomCycleInput] = useState(false);
  const [switchCustomHours, setSwitchCustomHours] = useState(16);
  const [showEndTimeModal, setShowEndTimeModal] = useState(false);
  const [endTimeChoice, setEndTimeChoice] = useState<'now' | 'past'>('now');
  const [endTimePast, setEndTimePast] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  const t = texts[lang];
  const isDark = theme === 'dark';

  useEffect(() => {
    setEntries(getFastingEntries(userId));
    setCurrentFastState(getCurrentFast(userId));
  }, [userId]);

  useEffect(() => {
    if (!currentFast) return;
    const tick = () => setElapsedSeconds(Math.floor((Date.now() - currentFast.startTimestamp) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [currentFast?.startTimestamp]);

  const suggestedEndTime = (start: string, hours: number): string => {
    const [h, m] = start.split(':').map(Number);
    let endMinutes = h * 60 + m + hours * 60;
    if (endMinutes >= 24 * 60) endMinutes -= 24 * 60;
    const eh = Math.floor(endMinutes / 60);
    const em = endMinutes % 60;
    return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
  };

  const handleCycleChange = (c: FastingCycle) => {
    setCycle(c);
    if (c !== 'custom') {
      const opt = CYCLES.find((x) => x.id === c);
      if (opt) setEndTime(suggestedEndTime(startTime, opt.hours));
    }
  };

  const handleStartTimeChange = (v: string) => {
    setStartTime(v);
    if (cycle !== 'custom') {
      const opt = CYCLES.find((x) => x.id === cycle);
      if (opt) setEndTime(suggestedEndTime(v, opt.hours));
    }
  };

  const computedHours =
    cycle === 'custom' ? customHours : hoursBetween(startTime, endTime);

  const handleRegister = () => {
    const today = dateToKey(new Date());
    const finalEnd = cycle === 'custom' ? suggestedEndTime(startTime, customHours) : endTime;
    const finalHours = cycle === 'custom' ? customHours : hoursBetween(startTime, endTime);
    const entry: FastingEntry = {
      date: today,
      startTime,
      endTime: finalEnd,
      hours: finalHours,
      cycle,
    };
    saveFastingEntry(userId, entry);
    setEntries(getFastingEntries(userId));
  };

  const handleOpenStartModal = () => {
    setPastStartTime(() => {
      const d = new Date();
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    });
    setStartTimeChoice('now');
    setShowStartTimeModal(true);
  };

  const handleStartWithTime = (startTimestamp: number) => {
    const plannedHours =
      cycle === 'custom'
        ? customHours
        : CYCLES.find((c) => c.id === cycle)?.hours ?? hoursBetween(startTime, endTime);
    const data: CurrentFast = { startTimestamp, plannedHours, cycle };
    setCurrentFast(userId, data);
    setCurrentFastState(data);
    setShowStartTimeModal(false);
  };

  const handleConfirmStart = () => {
    const ts = startTimeChoice === 'now' ? Date.now() : getStartTimestampFromTime(pastStartTime);
    handleStartWithTime(ts);
  };

  const handleChangeCycle = (newCycle: FastingCycle, customHoursValue?: number) => {
    if (!currentFast) return;
    const plannedHours =
      newCycle === 'custom'
        ? customHoursValue ?? switchCustomHours
        : CYCLES.find((c) => c.id === newCycle)?.hours ?? currentFast.plannedHours;
    const updated: CurrentFast = {
      startTimestamp: currentFast.startTimestamp,
      plannedHours,
      cycle: newCycle,
    };
    setCurrentFast(userId, updated);
    setCurrentFastState(updated);
    setShowCustomCycleInput(false);
  };

  const handleOpenEndModal = () => {
    const d = new Date();
    setEndTimePast(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    setEndTimeChoice('now');
    setShowEndTimeModal(true);
  };

  const handleEndFast = (endTimestamp: number) => {
    if (!currentFast) return;
    const startDate = new Date(currentFast.startTimestamp);
    const endDate = new Date(endTimestamp);
    const entryDate = dateToKey(endDate);
    const startStr = startDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    const endStr = endDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    const hours = Math.round(((endTimestamp - currentFast.startTimestamp) / 3600000) * 10) / 10;
    const entry: FastingEntry = {
      date: entryDate,
      startTime: startStr,
      endTime: endStr,
      hours,
      cycle: currentFast.cycle,
    };
    saveFastingEntry(userId, entry);
    clearCurrentFast(userId);
    setCurrentFastState(null);
    setEntries(getFastingEntries(userId));
    setShowEndTimeModal(false);
  };

  const handleConfirmEndFast = () => {
    if (!currentFast) return;
    const ts = endTimeChoice === 'now' ? Date.now() : getEndTimestampFromTime(endTimePast);
    handleEndFast(ts);
  };

  const getWeekStart = (d: Date): Date => {
    const date = new Date(d);
    const day = date.getDay();
    date.setDate(date.getDate() - day);
    return date;
  };

  const totalForWeek = (dateStr: string): number => {
    const d = new Date(dateStr + 'T12:00:00');
    const weekStart = getWeekStart(d);
    return entries
      .filter((e) => {
        const ed = new Date(e.date + 'T12:00:00');
        return getWeekStart(ed).getTime() === weekStart.getTime();
      })
      .reduce((sum, e) => sum + e.hours, 0);
  };

  const totalForMonth = (dateStr: string): number => {
    const [y, m] = dateStr.split('-').map(Number);
    return entries
      .filter((e) => {
        const [ey, em] = e.date.split('-').map(Number);
        return ey === y && em === m;
      })
      .reduce((sum, e) => sum + e.hours, 0);
  };

  const totalAll = entries.reduce((sum, e) => sum + e.hours, 0);
  const handleSelectEntry = (entry: FastingEntry) => setSelectedEntry(entry);
  const handleDeleteEntry = (entry: FastingEntry) => {
    deleteFastingEntry(userId, entry.date);
    setEntries(getFastingEntries(userId));
    setSelectedEntry(null);
  };

  const goalReached = !!currentFast && currentFast.cycle !== 'custom' && elapsedSeconds >= currentFast.plannedHours * 3600;
  const expectedEndStr = currentFast
    ? formatExpectedEnd(currentFast.startTimestamp, currentFast.plannedHours, t.today, t.tomorrow)
    : '';

  return (
    <div className="w-full min-w-full max-w-md mx-auto px-4 py-4 pb-8 flex flex-col gap-6 overflow-y-auto">
      <div className="text-center animate-in fade-in duration-500">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-500/20 mb-2">
          <Clock className="text-brand-500" size={24} />
        </div>
        <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.title}</h2>
        <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t.subtitle}</p>
      </div>

      {/* Timer circular (hero) */}
      <div className="flex justify-center py-2">
        <FastingTimerRing
          currentFast={currentFast}
          elapsedSeconds={elapsedSeconds}
          isDark={isDark}
          lang={lang}
          onStartClick={handleOpenStartModal}
          suggestedCycleLabel={suggestedCycleLabel(cycle, customHours, lang)}
          t={{ elapsed: t.elapsed, goal: t.goal, min: t.min, startNow: t.startNow }}
        />
      </div>

      {/* Fases do corpo (só quando jejum ativo) */}
      {currentFast && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '100ms' }}>
          <FastingPhases elapsedSeconds={elapsedSeconds} isDark={isDark} lang={lang} />
        </div>
      )}

      {/* Meta batida + Encerrar jejum */}
      {currentFast && (
        <div className="space-y-4 animate-in fade-in duration-500" style={{ animationDelay: '150ms' }}>
          {goalReached && (
            <div className="p-4 rounded-2xl bg-green-500/20 dark:bg-green-500/25 border-2 border-green-500/50 animate-goal-celebrate">
              <p className="text-center text-2xl font-bold text-green-600 dark:text-green-400 flex items-center justify-center gap-2 flex-wrap">
                <span className="animate-confetti-shine" aria-hidden>🎉</span>
                {t.goalHit}
                <span className="animate-confetti-shine" aria-hidden>🎉</span>
              </p>
              <p className={`text-center text-sm mt-1 ${isDark ? 'text-green-300' : 'text-green-700'}`}>
                {lang === 'pt' ? 'Parabéns! Você bateu a meta!' : 'Congratulations! You hit your goal!'}
              </p>
            </div>
          )}
          <button
            onClick={handleOpenEndModal}
            className="w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white shadow-lg transition-all hover:scale-[1.02] active:scale-100"
          >
            <Square size={20} />
            {t.endFast}
          </button>
        </div>
      )}

      {/* Cycle picker: quando ativo = expected end + trocar ciclo; quando inativo = ciclo + início/fim */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '200ms' }}>
        <FastingCyclePicker
          cycle={cycle}
          onCycleChange={handleCycleChange}
          startTime={startTime}
          onStartTimeChange={handleStartTimeChange}
          endTime={endTime}
          onEndTimeChange={setEndTime}
          customHours={customHours}
          onCustomHoursChange={setCustomHours}
          computedHours={computedHours}
          currentFast={currentFast}
          onCycleChangeActive={handleChangeCycle}
          showCustomCycleInput={showCustomCycleInput}
          setShowCustomCycleInput={setShowCustomCycleInput}
          switchCustomHours={switchCustomHours}
          setSwitchCustomHours={setSwitchCustomHours}
          expectedEndStr={expectedEndStr}
          isDark={isDark}
          lang={lang}
          t={{ cycle: t.cycle, start: t.start, end: t.end, hours: t.hours, expectedEnd: t.expectedEnd, changeCycle: t.changeCycle, apply: t.apply }}
        />
      </div>

      {/* Quando não há jejum: botão Registrar + Calendário (Iniciar fica só no centro do anel) */}
      {!currentFast && (
        <>
          <div className="flex flex-col gap-2 animate-in fade-in duration-500" style={{ animationDelay: '250ms' }}>
            <button
              onClick={handleRegister}
              className="w-full py-3 rounded-2xl font-bold border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              {t.register}
            </button>
          </div>

          <FastingCalendar
            entries={entries}
            selectedDate={selectedEntry?.date ?? null}
            selectedEntry={selectedEntry}
            onCloseDayModal={() => setSelectedEntry(null)}
            onSelectEntry={handleSelectEntry}
            onDeleteEntry={handleDeleteEntry}
            totalForWeek={totalForWeek}
            totalForMonth={totalForMonth}
            totalAll={totalAll}
            isDark={isDark}
            lang={lang}
            t={{
              calendar: t.calendar,
              dayHours: t.dayHours,
              totalWeek: t.totalWeek,
              totalMonth: t.totalMonth,
              totalAll: t.totalAll,
              close: t.close,
              noData: t.noData,
              recentFasts: t.recentFasts,
              lastDays: t.lastDays,
              deleteEntry: t.deleteEntry,
            }}
          />
        </>
      )}

      {/* Quando jejum ativo: só cycle picker (expected end + change cycle), sem calendário */}
      {showStartTimeModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-sm rounded-2xl p-6 shadow-xl ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
            <p className={`font-bold text-lg mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.startTimeChoice}</p>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setStartTimeChoice('now')}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                  startTimeChoice === 'now' ? 'bg-brand-500 text-white' : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {t.useCurrentTime}
              </button>
              <button
                onClick={() => setStartTimeChoice('past')}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                  startTimeChoice === 'past' ? 'bg-brand-500 text-white' : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {t.startedAt}
              </button>
            </div>
            {startTimeChoice === 'past' && (
              <div className="mb-4">
                <input
                  type="time"
                  value={pastStartTime}
                  onChange={(e) => setPastStartTime(e.target.value)}
                  className={`w-full p-3 rounded-xl font-mono text-lg border-0 ${isDark ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-900'}`}
                />
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setShowStartTimeModal(false)}
                className="flex-1 py-3 rounded-xl font-bold border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleConfirmStart}
                className="flex-1 py-3 rounded-xl font-bold bg-brand-500 text-white hover:bg-brand-600 flex items-center justify-center gap-2"
              >
                <Play size={18} fill="currentColor" />
                {t.confirmStart}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: quando encerrou o jejum */}
      {showEndTimeModal && currentFast && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-sm rounded-2xl p-6 shadow-xl ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
            <p className={`font-bold text-lg mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.endTimeChoice}</p>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setEndTimeChoice('now')}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                  endTimeChoice === 'now' ? 'bg-brand-500 text-white' : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {t.useCurrentTime}
              </button>
              <button
                onClick={() => setEndTimeChoice('past')}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                  endTimeChoice === 'past' ? 'bg-brand-500 text-white' : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {t.endedAt}
              </button>
            </div>
            {endTimeChoice === 'past' && (
              <div className="mb-4">
                <input
                  type="time"
                  value={endTimePast}
                  onChange={(e) => setEndTimePast(e.target.value)}
                  className={`w-full p-3 rounded-xl font-mono text-lg border-0 ${isDark ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-900'}`}
                />
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setShowEndTimeModal(false)}
                className="flex-1 py-3 rounded-xl font-bold border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleConfirmEndFast}
                className="flex-1 py-3 rounded-xl font-bold bg-red-500 hover:bg-red-600 text-white flex items-center justify-center gap-2"
              >
                <Square size={18} />
                {t.confirmEnd}
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-slate-400 dark:text-slate-500 py-2">{t.swipeHint}</p>
    </div>
  );
};

export default FastingSlide;
