import React, { useState, useEffect } from 'react';
import { Clock, ChevronLeft, ChevronRight, X, Play, Square } from 'lucide-react';
import type { FastingCycle, FastingEntry } from '../types';
import {
  getFastingEntries,
  saveFastingEntry,
  getEntryByDate,
  getCurrentFast,
  setCurrentFast,
  clearCurrentFast,
  hoursBetween,
  dateToKey,
  type CurrentFast,
} from '../services/fastingService';

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
    startNow: 'Iniciar jejum agora',
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
    expectedEnd: 'Horário final esperado',
    today: 'Hoje',
    tomorrow: 'Amanhã',
    changeCycle: 'Trocar ciclo',
    apply: 'Aplicar',
  },
  en: {
    title: 'Fasting',
    subtitle: 'Set start and end time and track your cycles.',
    cycle: 'Cycle',
    start: 'Start',
    end: 'End',
    hours: 'hours',
    register: 'Log fast today',
    startNow: 'Start fast now',
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
    expectedEnd: 'Expected end time',
    today: 'Today',
    tomorrow: 'Tomorrow',
    changeCycle: 'Change cycle',
    apply: 'Apply',
  },
};

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Dado "HH:mm", retorna timestamp do início (hoje ou ontem se o horário ainda não passou). */
function getStartTimestampFromTime(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m ?? 0, 0, 0);
  if (d.getTime() > Date.now()) d.setDate(d.getDate() - 1);
  return d.getTime();
}

/** Formata horário final esperado: "Hoje 11:08" ou "Amanhã 11:08". */
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

const FastingSlide: React.FC<FastingSlideProps> = ({ userId, theme, lang }) => {
  const [cycle, setCycle] = useState<FastingCycle>('16');
  const [startTime, setStartTime] = useState('20:00');
  const [endTime, setEndTime] = useState('12:00');
  const [customHours, setCustomHours] = useState(16);
  const [entries, setEntries] = useState<FastingEntry[]>([]);
  const [currentFast, setCurrentFastState] = useState<CurrentFast | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<FastingEntry | null>(null);
  const [showStartTimeModal, setShowStartTimeModal] = useState(false);
  const [startTimeChoice, setStartTimeChoice] = useState<'now' | 'past'>('now');
  const [pastStartTime, setPastStartTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [showCustomCycleInput, setShowCustomCycleInput] = useState(false);
  const [switchCustomHours, setSwitchCustomHours] = useState(16);

  const t = texts[lang];
  const isDark = theme === 'dark';

  useEffect(() => {
    setEntries(getFastingEntries(userId));
    setCurrentFastState(getCurrentFast(userId));
  }, [userId]);

  // Cronômetro: atualiza a cada 1s quando há jejum em andamento
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
    cycle === 'custom'
      ? customHours
      : hoursBetween(startTime, endTime);

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
    const plannedHours = cycle === 'custom'
      ? customHours
      : (CYCLES.find((c) => c.id === cycle)?.hours ?? hoursBetween(startTime, endTime));
    const data: CurrentFast = {
      startTimestamp,
      plannedHours,
      cycle,
    };
    setCurrentFast(userId, data);
    setCurrentFastState(data);
    setShowStartTimeModal(false);
  };

  const handleConfirmStart = () => {
    const ts = startTimeChoice === 'now' ? Date.now() : getStartTimestampFromTime(pastStartTime);
    handleStartWithTime(ts);
  };

  /** Troca o ciclo do jejum em andamento (mantém o início, atualiza meta). */
  const handleChangeCycle = (newCycle: FastingCycle, customHoursValue?: number) => {
    if (!currentFast) return;
    const plannedHours =
      newCycle === 'custom'
        ? (customHoursValue ?? switchCustomHours)
        : (CYCLES.find((c) => c.id === newCycle)?.hours ?? currentFast.plannedHours);
    const updated: CurrentFast = {
      startTimestamp: currentFast.startTimestamp,
      plannedHours,
      cycle: newCycle,
    };
    setCurrentFast(userId, updated);
    setCurrentFastState(updated);
    setShowCustomCycleInput(false);
  };

  const handleEndFast = () => {
    if (!currentFast) return;
    const today = dateToKey(new Date());
    const startDate = new Date(currentFast.startTimestamp);
    const endDate = new Date();
    const startStr = startDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    const endStr = endDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    const hours = Math.round((elapsedSeconds / 3600) * 10) / 10;
    const entry: FastingEntry = {
      date: today,
      startTime: startStr,
      endTime: endStr,
      hours,
      cycle: currentFast.cycle,
    };
    saveFastingEntry(userId, entry);
    clearCurrentFast(userId);
    setCurrentFastState(null);
    setEntries(getFastingEntries(userId));
  };

  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  const monthNames =
    lang === 'pt'
      ? ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayNames = lang === 'pt' ? ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const hasFasting = (day: number): boolean => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return entries.some((e) => e.date === dateToKey(d));
  };

  const handleDayClick = (day: number) => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const key = dateToKey(d);
    setSelectedDate(key);
    setSelectedEntry(getEntryByDate(userId, key) ?? null);
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
        const es = getWeekStart(ed);
        return es.getTime() === weekStart.getTime();
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

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  return (
    <div className="w-full min-w-full max-w-md mx-auto px-4 py-4 pb-8 flex flex-col gap-4 overflow-y-auto">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-500/20 mb-2">
          <Clock className="text-brand-500" size={24} />
        </div>
        <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.title}</h2>
        <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t.subtitle}</p>
      </div>

      {/* Cronômetro grande quando jejum em andamento */}
      {currentFast && (
        <div className={`rounded-2xl p-6 sm:p-8 border-2 ${
          isDark ? 'bg-slate-800/80 border-brand-500/50' : 'bg-brand-50 border-brand-500/40'
        }`}>
          <p className={`text-sm font-semibold uppercase tracking-wider text-center mb-2 ${
            isDark ? 'text-brand-400' : 'text-brand-600'
          }`}>
            {t.elapsed}
          </p>
          <p
            className={`text-center font-mono tabular-nums select-none ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
            style={{ fontSize: 'clamp(3rem, 15vw, 5rem)', lineHeight: 1.1 }}
          >
            {formatElapsed(elapsedSeconds)}
          </p>
          {currentFast.cycle !== 'custom' && (
            <p className={`text-center text-sm mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {t.goal}: {currentFast.plannedHours < 1
                ? `${Math.round(currentFast.plannedHours * 60)} ${t.min}`
                : `${currentFast.plannedHours}h`}
            </p>
          )}
          {currentFast.cycle !== 'custom' && elapsedSeconds >= currentFast.plannedHours * 3600 && (
            <p className="text-center text-lg font-bold text-green-500 dark:text-green-400 mt-2">
              {t.goalHit}
            </p>
          )}
          <button
            onClick={handleEndFast}
            className="w-full mt-4 py-4 rounded-xl font-bold flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white shadow-lg"
          >
            <Square size={20} />
            {t.endFast}
          </button>
        </div>
      )}

      {/* Quando jejum em andamento: horário final esperado + trocar ciclo (no lugar do calendário) */}
      {currentFast && (
        <div className={`space-y-4 rounded-2xl p-4 ${isDark ? 'bg-slate-800/80' : 'bg-slate-100'}`}>
          <div>
            <label className="text-xs font-bold uppercase text-slate-500">{t.expectedEnd}</label>
            <p className={`mt-1 text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {formatExpectedEnd(
                currentFast.startTimestamp,
                currentFast.plannedHours,
                t.today,
                t.tomorrow
              )}
            </p>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-slate-500">{t.changeCycle}</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {CYCLES.filter((c) => c.id !== '1m').map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    if (c.id === 'custom') setShowCustomCycleInput(true);
                    else handleChangeCycle(c.id);
                  }}
                  className={`px-3 py-2 rounded-xl text-sm font-bold transition-all ${
                    currentFast.cycle === c.id
                      ? 'bg-brand-500 text-white shadow-md'
                      : isDark
                      ? 'bg-slate-700 text-slate-300'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            {showCustomCycleInput && (
              <div className="flex gap-2 items-center mt-3">
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={switchCustomHours}
                  onChange={(e) => setSwitchCustomHours(Number(e.target.value) || 16)}
                  className={`flex-1 p-3 rounded-xl font-mono text-lg ${
                    isDark ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-900'
                  } border-0`}
                />
                <span className="text-sm text-slate-500">{t.hours}</span>
                <button
                  onClick={() => handleChangeCycle('custom', switchCustomHours)}
                  className="px-4 py-3 rounded-xl font-bold bg-brand-500 text-white hover:bg-brand-600"
                >
                  {t.apply}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Formulário (ciclo, início, fim) – oculto enquanto cronômetro ativo se quiser; ou sempre visível para ajustar próximo */}
      {!currentFast && (
        <>
      {/* Ciclo */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase text-slate-500">{t.cycle}</label>
        <div className="flex flex-wrap gap-2">
          {CYCLES.map((c) => (
            <button
              key={c.id}
              onClick={() => handleCycleChange(c.id)}
              className={`px-3 py-2 rounded-xl text-sm font-bold transition-all ${
                cycle === c.id
                  ? 'bg-brand-500 text-white shadow-md'
                  : isDark
                  ? 'bg-slate-700 text-slate-300'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Início / Fim */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase text-slate-500">{t.start}</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => handleStartTimeChange(e.target.value)}
            className={`w-full p-3 rounded-xl font-mono text-lg ${
              isDark ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-900'
            } border-0`}
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
                onChange={(e) => setCustomHours(Number(e.target.value) || 16)}
                className={`w-full p-3 rounded-xl font-mono text-lg ${
                  isDark ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-900'
                } border-0`}
              />
              <span className="text-sm text-slate-500">{t.hours}</span>
            </div>
          ) : (
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className={`w-full p-3 rounded-xl font-mono text-lg ${
                isDark ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-900'
              } border-0`}
            />
          )}
        </div>
      </div>

      {cycle !== 'custom' && (
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {hoursBetween(startTime, endTime).toFixed(1)} {t.hours}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <button
          onClick={handleOpenStartModal}
          className="w-full py-3.5 rounded-xl font-bold bg-brand-500 text-white hover:bg-brand-600 shadow-lg shadow-brand-500/30 flex items-center justify-center gap-2"
        >
          <Play size={20} />
          {t.startNow}
        </button>
        <button
          onClick={handleRegister}
          className="w-full py-3 rounded-xl font-bold border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          {t.register}
        </button>
      </div>
        </>
      )}

      {/* Modal: quando começou o jejum (agora ou horário passado) */}
      {showStartTimeModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div
            className={`w-full max-w-sm rounded-2xl p-6 ${
              isDark ? 'bg-slate-800' : 'bg-white'
            } shadow-xl`}
          >
            <p className={`font-bold text-lg mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {t.startTimeChoice}
            </p>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setStartTimeChoice('now')}
                className={`flex-1 py-3 rounded-xl font-bold ${
                  startTimeChoice === 'now'
                    ? 'bg-brand-500 text-white'
                    : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {t.useCurrentTime}
              </button>
              <button
                onClick={() => setStartTimeChoice('past')}
                className={`flex-1 py-3 rounded-xl font-bold ${
                  startTimeChoice === 'past'
                    ? 'bg-brand-500 text-white'
                    : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700'
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
                  className={`w-full p-3 rounded-xl font-mono text-lg ${
                    isDark ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-900'
                  } border-0`}
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
                <Play size={18} />
                {t.confirmStart}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calendário – só quando não há jejum em andamento */}
      {!currentFast && (
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-slate-500">{t.calendar}</label>
          <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={prevMonth}
                className="p-2 rounded-lg hover:bg-white/10 text-slate-500"
              >
                <ChevronLeft size={20} />
              </button>
              <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </span>
              <button
                onClick={nextMonth}
                className="p-2 rounded-lg hover:bg-white/10 text-slate-500"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-500 mb-2">
              {dayNames.map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startingDayOfWeek }, (_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const has = hasFasting(day);
                return (
                  <button
                    key={day}
                    onClick={() => handleDayClick(day)}
                    className={`aspect-square rounded-lg flex items-center justify-center text-sm font-bold transition-colors ${
                      has
                        ? 'bg-brand-500 text-white'
                        : isDark
                        ? 'text-slate-300 hover:bg-slate-700'
                        : 'text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal dia clicado */}
      {selectedDate && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-end sm:items-center justify-center p-4">
          <div
            className={`w-full max-w-sm rounded-t-2xl sm:rounded-2xl p-6 ${
              isDark ? 'bg-slate-800' : 'bg-white'
            } shadow-xl`}
          >
            <div className="flex justify-between items-center mb-4">
              <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {selectedDate}
              </span>
              <button
                onClick={() => { setSelectedDate(null); setSelectedEntry(null); }}
                className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            {selectedEntry ? (
              <div className="space-y-3">
                <p className={`text-2xl font-bold text-brand-500`}>
                  {selectedEntry.hours.toFixed(1)} {t.hours}
                </p>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {selectedEntry.startTime} → {selectedEntry.endTime} ({selectedEntry.cycle === 'custom' ? 'custom' : selectedEntry.cycle === '1m' ? '1 min' : selectedEntry.cycle + 'h'})
                </p>
                <div className="border-t border-slate-200 dark:border-slate-600 pt-3 space-y-1 text-sm">
                  <p className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                    {t.totalWeek}: <strong>{totalForWeek(selectedDate).toFixed(1)} h</strong>
                  </p>
                  <p className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                    {t.totalMonth}: <strong>{totalForMonth(selectedDate).toFixed(1)} h</strong>
                  </p>
                  <p className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                    {t.totalAll}: <strong>{totalAll.toFixed(1)} h</strong>
                  </p>
                </div>
              </div>
            ) : (
              <p className={isDark ? 'text-slate-400' : 'text-slate-500'}>{t.noData}</p>
            )}
            <button
              onClick={() => { setSelectedDate(null); setSelectedEntry(null); }}
              className="w-full mt-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 font-bold text-slate-700 dark:text-slate-200"
            >
              {t.close}
            </button>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-slate-400 dark:text-slate-500 py-2">
        {t.swipeHint}
      </p>
    </div>
  );
};

export default FastingSlide;
