import React from 'react';
import { X, Clock, TrendingUp, Flame } from 'lucide-react';
import type { FastingEntry } from '../types';
import { dateToKey } from '../services/fastingService';

const RECENT_COUNT = 7;
const CHART_DAYS = 14;

interface FastingCalendarProps {
  entries: FastingEntry[];
  selectedDate: string | null;
  selectedEntry: FastingEntry | null;
  onCloseDayModal: () => void;
  onSelectEntry: (entry: FastingEntry) => void;
  totalForWeek: (dateStr: string) => number;
  totalForMonth: (dateStr: string) => number;
  totalAll: number;
  isDark: boolean;
  lang: 'pt' | 'en';
  t: {
    calendar: string;
    dayHours: string;
    totalWeek: string;
    totalMonth: string;
    totalAll: string;
    close: string;
    noData: string;
    recentFasts: string;
    lastDays: string;
  };
}

function formatDateLabel(dateStr: string, lang: 'pt' | 'en'): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const todayKey = dateToKey(today);
  const yesterdayKey = dateToKey(yesterday);
  if (dateStr === todayKey) return lang === 'pt' ? 'Hoje' : 'Today';
  if (dateStr === yesterdayKey) return lang === 'pt' ? 'Ontem' : 'Yesterday';
  return date.toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

const FastingCalendar: React.FC<FastingCalendarProps> = ({
  entries,
  selectedDate,
  selectedEntry,
  onCloseDayModal,
  onSelectEntry,
  totalForWeek,
  totalForMonth,
  totalAll,
  isDark,
  lang,
  t,
}) => {
  const todayKey = dateToKey(new Date());
  const recentFasts = [...entries]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, RECENT_COUNT);

  // Last CHART_DAYS days: build a map dateKey -> hours for chart
  const chartData: { date: string; hours: number; label: string }[] = [];
  for (let i = CHART_DAYS - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = dateToKey(d);
    const entry = entries.find((e) => e.date === key);
    const hours = entry ? entry.hours : 0;
    chartData.push({
      date: key,
      hours,
      label: d.toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US', { day: 'numeric', month: 'short' }),
    });
  }
  const maxHours = Math.max(1, ...chartData.map((x) => x.hours));

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Stats em linha */}
      <div className="grid grid-cols-3 gap-2">
        <div
          className={`rounded-2xl p-4 text-center ${
            isDark ? 'bg-slate-800/80' : 'bg-white dark:bg-slate-800 shadow'
          } border border-slate-200/50 dark:border-slate-700/50`}
        >
          <p className="text-[10px] font-bold uppercase text-slate-500 truncate">{t.totalWeek}</p>
          <p className={`text-xl font-bold font-mono tabular-nums mt-0.5 ${isDark ? 'text-brand-400' : 'text-brand-600'}`}>
            {totalForWeek(todayKey).toFixed(1)}h
          </p>
        </div>
        <div
          className={`rounded-2xl p-4 text-center ${
            isDark ? 'bg-slate-800/80' : 'bg-white dark:bg-slate-800 shadow'
          } border border-slate-200/50 dark:border-slate-700/50`}
        >
          <p className="text-[10px] font-bold uppercase text-slate-500 truncate">{t.totalMonth}</p>
          <p className={`text-xl font-bold font-mono tabular-nums mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {totalForMonth(todayKey).toFixed(1)}h
          </p>
        </div>
        <div
          className={`rounded-2xl p-4 text-center ${
            isDark ? 'bg-brand-500/20 border border-brand-500/30' : 'bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/30'
          }`}
        >
          <p className="text-[10px] font-bold uppercase text-brand-600 dark:text-brand-400 truncate">{t.totalAll}</p>
          <p className="text-xl font-bold font-mono tabular-nums mt-0.5 text-brand-600 dark:text-brand-300">
            {totalAll.toFixed(1)}h
          </p>
        </div>
      </div>

      {/* Gráfico de barras - últimas 2 semanas (estilo Zero) */}
      <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-800/80' : 'bg-slate-100 dark:bg-slate-800/50'}`}>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
          <TrendingUp size={14} />
          {t.lastDays}
        </p>
        <div className="flex items-end justify-between gap-0.5 h-20">
          {chartData.map(({ date, hours, label }) => {
            const heightPct = maxHours > 0 ? (hours / maxHours) * 100 : 0;
            const hasData = hours > 0;
            return (
              <button
                key={date}
                onClick={() => {
                  const entry = entries.find((e) => e.date === date);
                  if (entry) onSelectEntry(entry);
                }}
                className="flex-1 flex flex-col items-center group"
                title={`${label}: ${hours.toFixed(1)}h`}
              >
                <div
                  className={`w-full min-h-[4px] rounded-t transition-all ${
                    hasData
                      ? 'bg-brand-500 group-hover:bg-brand-400'
                      : isDark
                      ? 'bg-slate-700'
                      : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                  style={{ height: `${Math.max(heightPct, 4)}%` }}
                />
                <span className="text-[9px] text-slate-500 mt-1 truncate w-full text-center hidden sm:block">
                  {new Date(date + 'T12:00:00').getDate()}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-slate-500 mt-1 text-center">
          {lang === 'pt' ? 'Toque na barra para ver detalhes' : 'Tap bar for details'}
        </p>
      </div>

      {/* Lista "Últimos jejums" (estilo Zero - Recent Fasts) */}
      <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-800/80' : 'bg-slate-100 dark:bg-slate-800/50'}`}>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
          <Clock size={14} />
          {t.recentFasts}
        </p>
        {recentFasts.length === 0 ? (
          <p className={`text-sm py-6 text-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t.noData}</p>
        ) : (
          <div className="space-y-2">
            {recentFasts.map((entry) => {
              const isSelected = selectedEntry?.date === entry.date;
              return (
                <button
                  key={entry.date}
                  onClick={() => onSelectEntry(entry)}
                  className={`w-full rounded-xl p-4 text-left flex items-center justify-between gap-3 transition-all hover:scale-[1.01] active:scale-100 ${
                    isSelected
                      ? 'bg-brand-500/30 dark:bg-brand-500/20 ring-2 ring-brand-500'
                      : isDark
                      ? 'bg-slate-700/80 hover:bg-slate-700'
                      : 'bg-white dark:bg-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-700 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                        isDark ? 'bg-brand-500/30' : 'bg-brand-100 dark:bg-brand-500/20'
                      }`}
                    >
                      <Flame size={18} className="text-brand-500" />
                    </div>
                    <div className="min-w-0">
                      <p className={`font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {formatDateLabel(entry.date, lang)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {entry.startTime} → {entry.endTime}
                      </p>
                    </div>
                  </div>
                  <span className="flex-shrink-0 font-mono font-bold text-brand-500">
                    {entry.hours.toFixed(1)}h
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal detalhe do dia (ao tocar em um jejum) */}
      {selectedEntry && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className={`w-full max-w-sm rounded-t-2xl sm:rounded-2xl p-6 shadow-xl animate-in slide-in-from-bottom-4 duration-300 ${
              isDark ? 'bg-slate-800' : 'bg-white'
            }`}
          >
            <div className="flex justify-between items-center mb-4">
              <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {formatDateLabel(selectedEntry.date, lang)}
              </span>
              <button onClick={onCloseDayModal} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div className={`rounded-2xl p-4 ${isDark ? 'bg-brand-500/20' : 'bg-brand-50 dark:bg-brand-500/10'}`}>
                <p className="text-2xl font-bold text-brand-500">
                  {selectedEntry.hours.toFixed(1)} {t.dayHours}
                </p>
                <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {selectedEntry.startTime} → {selectedEntry.endTime}
                  {selectedEntry.cycle !== 'custom' ? ` (${selectedEntry.cycle}h)` : ' (custom)'}
                </p>
              </div>
              <div className="space-y-2 text-sm">
                <p className={`flex justify-between ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  <span>{t.totalWeek}</span>
                  <strong>{totalForWeek(selectedEntry.date).toFixed(1)} h</strong>
                </p>
                <p className={`flex justify-between ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  <span>{t.totalMonth}</span>
                  <strong>{totalForMonth(selectedEntry.date).toFixed(1)} h</strong>
                </p>
                <p className={`flex justify-between ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  <span>{t.totalAll}</span>
                  <strong>{totalAll.toFixed(1)} h</strong>
                </p>
              </div>
            </div>
            <button
              onClick={onCloseDayModal}
              className="w-full mt-4 py-3 rounded-xl font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
            >
              {t.close}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FastingCalendar;
