import React, { useState, useRef, useEffect } from 'react';
import { Droplet, ChevronDown } from 'lucide-react';
import { Translation } from '../types';
import { getWaterStatusColor, getWaterStatusMessage } from '../services/waterService';

interface WaterTrackerProps {
  current: number; // ml consumed today
  goal: number; // ml goal for today
  texts: Translation;
  lang: 'en' | 'pt';
  onAddWater: (amount: number) => void;
}

const WaterTracker: React.FC<WaterTrackerProps> = ({ current, goal, texts, lang, onAddWater }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  
  const percentage = goal > 0 ? Math.min(100, (current / goal) * 100) : 0;
  const remaining = Math.max(0, goal - current);
  const statusColor = getWaterStatusColor(percentage);
  const statusMessage = getWaterStatusMessage(percentage, lang);
  
  // Quick add amounts
  const quickAmounts = [250, 500, 750, 1000];
  
  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
        setShowCustomInput(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handleQuickAdd = (amount: number) => {
    onAddWater(amount);
    setShowMenu(false);
    setShowCustomInput(false);
  };
  
  const handleCustomAdd = () => {
    const amount = parseInt(customAmount);
    if (amount > 0 && amount <= 5000) {
      onAddWater(amount);
      setCustomAmount('');
      setShowCustomInput(false);
      setShowMenu(false);
    }
  };
  
  return (
    <div className="relative" ref={menuRef}>
      {/* Main Tracker Card - Similar to DailyTracker */}
      <div 
        onClick={() => setShowMenu(!showMenu)}
        className="cartao-vivo relative overflow-hidden rounded-2xl p-5 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm cursor-pointer"
        title={statusMessage}
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Droplet 
                size={16} 
                className={`${statusColor.replace('bg-', 'text-')} transition-colors`}
                fill={percentage >= 50 ? 'currentColor' : 'none'}
              />
              {texts.water}
            </h3>
          </div>
          <div className="text-right">
            {percentage >= 100 ? (
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400 font-bold text-sm">
                <span>{texts.waterGoalMet}</span>
              </div>
            ) : (
              <span className="text-sm font-medium text-slate-400">
                {texts.waterRemaining}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-end gap-2 mb-3">
          <span className="text-4xl font-extrabold text-slate-800 dark:text-white">
            {Math.round(current / 100) / 10}
          </span>
          <span className="text-lg font-bold text-slate-400 dark:text-slate-500 mb-1">
            / {Math.round(goal / 100) / 10}L
          </span>
        </div>

        <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full ${statusColor} transition-all duration-1000 ease-out`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        {/* Pulse animation when low */}
        {percentage < 50 && (
          <div className={`absolute top-2 right-2 w-2 h-2 ${statusColor} rounded-full animate-ping opacity-75`}></div>
        )}
        
        <ChevronDown 
          size={16} 
          className={`absolute top-5 right-5 text-slate-400 transition-transform ${showMenu ? 'rotate-180' : ''}`}
        />
      </div>
      
      {/* Dropdown Menu */}
      {showMenu && (
        <div className="absolute top-full left-0 right-0 mt-2 w-full bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Droplet size={16} className={statusColor.replace('bg-', 'text-')} />
                {texts.water}
              </h3>
              <span className="text-xs text-slate-400">{statusMessage}</span>
            </div>
            
            <div className="flex items-end gap-2 mb-1">
              <span className="text-2xl font-extrabold text-slate-800 dark:text-white">
                {Math.round(current / 100) / 10}
              </span>
              <span className="text-sm font-bold text-slate-400 dark:text-slate-500 mb-1">
                / {Math.round(goal / 100) / 10}L
              </span>
            </div>
            
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${statusColor} transition-all duration-500`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            
            {remaining > 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {texts.waterRemaining}: {Math.round(remaining / 100) / 10}L
              </p>
            )}
            {percentage >= 100 && (
              <p className="text-xs text-green-600 dark:text-green-400 font-bold mt-1">
                ✓ {texts.waterGoalMet}
              </p>
            )}
          </div>
          
          <div className="p-4">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">
              {texts.waterQuickAdd}
            </p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {quickAmounts.map(amount => (
                <button
                  key={amount}
                  onClick={() => handleQuickAdd(amount)}
                  className="btn-vivo px-3 py-2 bg-brand-50 dark:bg-brand-900/20 hover:bg-brand-100 dark:hover:bg-brand-900/40 text-brand-700 dark:text-brand-400 rounded-lg font-bold text-sm"
                >
                  +{amount}ml
                </button>
              ))}
            </div>
            
            {!showCustomInput ? (
              <button
                onClick={() => setShowCustomInput(true)}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-semibold text-sm transition-colors"
              >
                {texts.waterCustom}
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="ml"
                  min="1"
                  max="5000"
                  className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-700 border-none rounded-lg text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCustomAdd();
                    } else if (e.key === 'Escape') {
                      setShowCustomInput(false);
                      setCustomAmount('');
                    }
                  }}
                />
                <button
                  onClick={handleCustomAdd}
                  className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-bold text-sm transition-colors"
                >
                  +
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WaterTracker;

