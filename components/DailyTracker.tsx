
import React from 'react';
import { Translation } from '../types';
import { Target, CheckCircle2, AlertTriangle } from 'lucide-react';

interface DailyTrackerProps {
  current: number;
  target: number;
  texts: Translation;
  onClick?: () => void;
}

const DailyTracker: React.FC<DailyTrackerProps> = ({ current, target, texts, onClick }) => {
  const percentage = Math.min(100, (current / target) * 100);
  const remaining = Math.max(0, target - current);
  const isOver = current > target;
  
  // Color logic
  let barColor = 'bg-brand-500';
  let bgColor = 'bg-brand-50 dark:bg-brand-900/20';
  
  if (isOver) {
    barColor = 'bg-red-500';
    bgColor = 'bg-red-50 dark:bg-red-900/20';
  } else if (percentage >= 95) {
    barColor = 'bg-green-500'; // Goal met perfectly
  }

  return (
    <div 
      onClick={onClick}
      className={`cartao-vivo relative overflow-hidden rounded-2xl p-5 border cursor-pointer ${isOver ? 'border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm'}`}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Target size={16} /> {texts.todayProgress}
          </h3>
        </div>
        <div className="text-right">
          {isOver ? (
            <div className="flex items-center gap-1 text-red-600 dark:text-red-400 font-bold text-sm">
              <AlertTriangle size={14} />
              <span>{texts.caloriesOver}</span>
            </div>
          ) : remaining === 0 ? (
             <div className="flex items-center gap-1 text-green-600 dark:text-green-400 font-bold text-sm">
              <CheckCircle2 size={14} />
              <span>{texts.goalMet}</span>
            </div>
          ) : (
            <span className="text-sm font-medium text-slate-400">
               {texts.caloriesRemaining}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-end gap-2 mb-3">
        <span className={`text-4xl font-extrabold ${isOver ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-white'}`}>
            {current}
        </span>
        <span className="text-lg font-bold text-slate-400 dark:text-slate-500 mb-1">
            / {target} kcal
        </span>
      </div>

      <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div 
            className={`h-full ${barColor} transition-all duration-1000 ease-out`}
            style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default DailyTracker;
