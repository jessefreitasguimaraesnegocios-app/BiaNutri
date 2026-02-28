import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, Play, Square } from 'lucide-react';
import type { FastingCycle, FastingEntry } from '../types';
import {
  getFastingEntries,
  saveFastingEntry,
  getCurrentFast,
  setCurrentFast,
  clearCurrentFast,
  removeFastingEntry,
  hoursBetween,
  dateToKey,
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

const ITEM_HEIGHT = 44;
const VISIBLE_ROWS = 5;
const PADDING_Y = ITEM_HEIGHT * 2;

function TimeCarouselPicker({
  value,
  onChange,
  isDark,
}: {
  value: string;
  onChange: (v: string) => void;
  isDark: boolean;
}) {
  const [h, m] = value.split(':').map((s) => parseInt(s, 10) || 0);
  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollTo = useCallback(
    (hour: number, minute: number) => {
      const topHour = hour * ITEM_HEIGHT;
      const topMinute = minute * ITEM_HEIGHT;
      if (hourRef.current) hourRef.current.scrollTop = topHour;
      if (minuteRef.current) minuteRef.current.scrollTop = topMinute;
    },
    []
  );

  useEffect(() => {
    scrollTo(h, m);
  }, [h, m, scrollTo]);

  const syncFromScroll = useCallback(() => {
    if (!hourRef.current || !minuteRef.current) return;
    const hourIndex = Math.round(hourRef.current.scrollTop / ITEM_HEIGHT);
    const minuteIndex = Math.round(minuteRef.current.scrollTop / ITEM_HEIGHT);
    const newH = Math.max(0, Math.min(23, hourIndex));
    const newM = Math.max(0, Math.min(59, minuteIndex));
    onChange(`${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`);
  }, [onChange]);

  const handleScroll = useCallback(() => {
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = window.setTimeout(syncFromScroll, 120);
  }, [syncFromScroll]);

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  const viewHeight = ITEM_HEIGHT * VISIBLE_ROWS;
  const centerTop = (viewHeight - ITEM_HEIGHT) / 2;

  const baseClass = 'flex-1 flex flex-col overflow-hidden rounded-xl border border-slate-600/50 dark:border-slate-500/50';
  const scrollClass = 'overflow-y-auto overflow-x-hidden snap-y snap-mandatory scroll-smooth';
  const itemClass = `flex items-center justify-center font-mono text-lg shrink-0 snap-center ${isDark ? 'text-slate-300' : 'text-slate-600'}`;
  const itemSelectedClass = `flex items-center justify-center font-mono text-xl font-bold shrink-0 snap-center ${isDark ? 'text-white' : 'text-slate-900'}`;

  return (
    <div className="flex flex-col gap-2">
      {/* Mostra no centro qual hora e minuto estão selecionados */}
      <div
        className={`flex items-center justify-center gap-1 py-2 rounded-xl font-mono text-2xl font-bold ${isDark ? 'bg-slate-700/80 text-white' : 'bg-slate-200/80 text-slate-900'}`}
        aria-live="polite"
      >
        <span>{String(h).padStart(2, '0')}</span>
        <span className="opacity-60">:</span>
        <span>{String(m).padStart(2, '0')}</span>
      </div>
      <div className="flex gap-2 items-start">
        <div className={`${baseClass} relative`} style={{ height: viewHeight }}>
          {/* Faixa escurecida em cima e embaixo para destacar a linha do centro */}
          <div
            className="absolute left-0 right-0 top-0 z-10 pointer-events-none"
            style={{
              height: centerTop,
              background: isDark
                ? 'linear-gradient(to bottom, rgb(30 41 59) 0%, transparent 100%)'
                : 'linear-gradient(to bottom, rgb(248 250 252) 0%, transparent 100%)',
            }}
          />
          <div
            className="absolute left-0 right-0 bottom-0 z-10 pointer-events-none"
            style={{
              height: centerTop,
              background: isDark
                ? 'linear-gradient(to top, rgb(30 41 59) 0%, transparent 100%)'
                : 'linear-gradient(to top, rgb(248 250 252) 0%, transparent 100%)',
            }}
          />
          {/* Borda/faixa no centro = linha selecionada */}
          <div
            className="absolute left-0 right-0 z-10 pointer-events-none border-2 border-brand-500 rounded-lg"
            style={{ top: centerTop, height: ITEM_HEIGHT }}
          />
          <div
            ref={hourRef}
            className={scrollClass}
            style={{ height: viewHeight }}
            onScroll={handleScroll}
          >
            <div style={{ height: PADDING_Y }} />
            {hours.map((hour) => (
              <div
                key={hour}
                className={parseInt(hour, 10) === h ? itemSelectedClass : itemClass}
                style={{ height: ITEM_HEIGHT }}
              >
                {hour}
              </div>
            ))}
            <div style={{ height: PADDING_Y }} />
          </div>
        </div>
        <span className={`flex items-center font-mono text-xl pt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>:</span>
        <div className={`${baseClass} relative`} style={{ height: viewHeight }}>
          <div
            className="absolute left-0 right-0 top-0 z-10 pointer-events-none"
            style={{
              height: centerTop,
              background: isDark
                ? 'linear-gradient(to bottom, rgb(30 41 59) 0%, transparent 100%)'
                : 'linear-gradient(to bottom, rgb(248 250 252) 0%, transparent 100%)',
            }}
          />
          <div
            className="absolute left-0 right-0 bottom-0 z-10 pointer-events-none"
            style={{
              height: centerTop,
              background: isDark
                ? 'linear-gradient(to top, rgb(30 41 59) 0%, transparent 100%)'
                : 'linear-gradient(to top, rgb(248 250 252) 0%, transparent 100%)',
            }}
          />
          <div
            className="absolute left-0 right-0 z-10 pointer-events-none border-2 border-brand-500 rounded-lg"
            style={{ top: centerTop, height: ITEM_HEIGHT }}
          />
          <div
            ref={minuteRef}
            className={scrollClass}
            style={{ height: viewHeight }}
            onScroll={handleScroll}
          >
            <div style={{ height: PADDING_Y }} />
            {minutes.map((minute) => (
              <div
                key={minute}
                className={parseInt(minute, 10) === m ? itemSelectedClass : itemClass}
                style={{ height: ITEM_HEIGHT }}
              >
                {minute}
              </div>
            ))}
            <div style={{ height: PADDING_Y }} />
          </div>
        </div>
      </div>
    </div>
  );
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
    dayLabel: 'Dia',
    timeLabel: 'Horário',
    useExistingTime: 'Usar horário de jejum anterior',
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
    timeSimulatorTitle: 'Simulador de Horário',
    fastOfHours: 'Jejum de',
    whenStarts: 'Quando começa',
    noData: 'Nenhum jejum neste dia.',
    swipeHint: '← Voltar para o app',
    recentFasts: 'Últimos jejums',
    deleteConfirmTitle: 'Excluir jejum?',
    deleteConfirmMessage: 'Esta ação não pode ser desfeita.',
    deleteConfirmCancel: 'Cancelar',
    deleteConfirmDelete: 'Excluir',
    lastDays: 'Últimos 14 dias',
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
    dayLabel: 'Day',
    timeLabel: 'Time',
    useExistingTime: 'Use time from previous fast',
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
    timeSimulatorTitle: 'Time Simulator',
    fastOfHours: 'Fast of',
    whenStarts: 'When it starts',
    noData: 'No fast on this day.',
    swipeHint: '← Back to app',
    recentFasts: 'Recent fasts',
    deleteConfirmTitle: 'Delete fast?',
    deleteConfirmMessage: 'This action cannot be undone.',
    deleteConfirmCancel: 'Cancel',
    deleteConfirmDelete: 'Delete',
    lastDays: 'Last 14 days',
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

function getStartTimestampFromTime(timeStr: string, dateStr?: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  let d: Date;
  if (dateStr) {
    const [y, mo, day] = dateStr.split('-').map(Number);
    d = new Date(y, mo - 1, day, h, m ?? 0, 0, 0);
  } else {
    d = new Date();
  d.setHours(h, m ?? 0, 0, 0);
  if (d.getTime() > Date.now()) d.setDate(d.getDate() - 1);
  }
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
  const [entryToDelete, setEntryToDelete] = useState<FastingEntry | null>(null);
  const [showStartTimeModal, setShowStartTimeModal] = useState(false);
  const [startTimeChoice, setStartTimeChoice] = useState<'now' | 'past'>('now');
  const [pastStartTime, setPastStartTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [pastStartDate, setPastStartDate] = useState(() => dateToKey(new Date()));
  const [showDayList, setShowDayList] = useState(false);
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
    } else {
      setEndTime(suggestedEndTime(v, customHours));
    }
  };

  const handleCustomHoursChange = (v: number) => {
    setCustomHours(v);
    setEndTime(suggestedEndTime(startTime, v));
  };

  const computedHours =
    cycle === 'custom' ? customHours : hoursBetween(startTime, endTime);

  const handleOpenStartModal = () => {
      const d = new Date();
    setPastStartTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    setPastStartDate(dateToKey(d));
    setShowDayList(false);
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
    const ts = startTimeChoice === 'now' ? Date.now() : getStartTimestampFromTime(pastStartTime, pastStartDate);
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
          onCustomHoursChange={handleCustomHoursChange}
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
          t={{ cycle: t.cycle, start: t.start, end: t.end, hours: t.hours, expectedEnd: t.expectedEnd, changeCycle: t.changeCycle, apply: t.apply, timeSimulatorTitle: t.timeSimulatorTitle, fastOfHours: t.fastOfHours, whenStarts: t.whenStarts }}
        />
      </div>

      {/* Quando não há jejum: Calendário (Iniciar fica no centro do anel) */}
      {!currentFast && (
        <>
          <FastingCalendar
            entries={entries}
            selectedDate={selectedEntry?.date ?? null}
            selectedEntry={selectedEntry}
            onCloseDayModal={() => setSelectedEntry(null)}
            onSelectEntry={handleSelectEntry}
            onDeleteEntry={(entry) => {
              setEntryToDelete(entry);
            }}
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
              <div className="mb-4 space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{t.dayLabel}</label>
                  {(() => {
                    const todayKey = dateToKey(new Date());
                    const dayOptions: { dateKey: string; label: string }[] = [];
                    for (let i = 0; i < 7; i++) {
                      const d = new Date();
                      d.setDate(d.getDate() - i);
                      const dateKey = dateToKey(d);
                      const weekday = d.toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US', { weekday: 'long' });
                      const label = i === 0 ? t.today : weekday.charAt(0).toUpperCase() + weekday.slice(1);
                      dayOptions.push({ dateKey, label });
                    }
                    const selectedLabel = dayOptions.find((o) => o.dateKey === pastStartDate)?.label ?? pastStartDate;
                    return (
                      <>
                        <button
                          type="button"
                          onClick={() => setShowDayList((v) => !v)}
                          className={`w-full p-3 rounded-xl font-mono text-lg border-0 text-left flex items-center justify-between ${isDark ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-900'}`}
                        >
                          <span>{selectedLabel}</span>
                          <span className="text-sm opacity-70">{showDayList ? '▲' : '▼'}</span>
                        </button>
                        {showDayList && (
                          <div className="mt-1 rounded-xl overflow-hidden border border-slate-600/50 dark:border-slate-500/50">
                            {dayOptions.map((opt) => (
                              <button
                                key={opt.dateKey}
                                type="button"
                                onClick={() => {
                                  setPastStartDate(opt.dateKey);
                                  setShowDayList(false);
                                }}
                                className={`w-full py-2.5 px-3 text-left font-mono text-base transition-colors ${
                                  opt.dateKey === pastStartDate
                                    ? 'bg-brand-500 text-white'
                                    : isDark ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
                {(() => {
                  const minD = new Date();
                  minD.setDate(minD.getDate() - 7);
                  const minStr = dateToKey(minD);
                  const recentEntries = entries
                    .filter((e) => e.date >= minStr && e.date <= dateToKey(new Date()))
                    .sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0))
                    .slice(0, 10);
                  if (recentEntries.length === 0) return null;
                  return (
                    <div>
                      <p className={`text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{t.useExistingTime}</p>
                      <div className="flex flex-wrap gap-2">
                        {recentEntries.map((entry) => {
                          const [y, mo, day] = entry.date.split('-').map(Number);
                          const dateLabel = lang === 'pt' ? `${day}/${mo}` : `${mo}/${day}`;
                          return (
                            <button
                              key={`${entry.date}-${entry.startTime}`}
                              type="button"
                              onClick={() => {
                                setPastStartDate(entry.date);
                                setPastStartTime(entry.startTime);
                              }}
                              className={`px-3 py-1.5 rounded-lg text-sm font-mono transition-colors ${
                                pastStartDate === entry.date && pastStartTime === entry.startTime
                                  ? 'bg-brand-500 text-white'
                                  : isDark ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                              }`}
                            >
                              {dateLabel} {entry.startTime}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    {t.timeLabel}
                  </label>
                  <TimeCarouselPicker
                    value={pastStartTime}
                    onChange={setPastStartTime}
                    isDark={isDark}
                  />
                </div>
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

      {/* Modal: confirmar exclusão de jejum */}
      {entryToDelete && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-sm rounded-2xl p-6 shadow-xl ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
            <p className={`font-bold text-lg mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.deleteConfirmTitle}</p>
            <p className={`text-sm mb-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{t.deleteConfirmMessage}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setEntryToDelete(null)}
                className="flex-1 py-3 rounded-xl font-bold border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200"
              >
                {t.deleteConfirmCancel}
              </button>
              <button
                onClick={() => {
                  if (entryToDelete) {
                    removeFastingEntry(userId, entryToDelete.date);
                    setEntries(getFastingEntries(userId));
                    if (selectedEntry?.date === entryToDelete.date) setSelectedEntry(null);
                    setEntryToDelete(null);
                  }
                }}
                className="flex-1 py-3 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600"
              >
                {t.deleteConfirmDelete}
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
