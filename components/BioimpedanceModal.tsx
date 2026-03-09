
import React, { useState, useEffect } from 'react';
import { X, Calculator, Activity, Target } from 'lucide-react';
import { Language, Translation, UserStats } from '../types';

interface BioimpedanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  texts: Translation;
  onUpdate: (targetCalories: number) => void;
  userId?: string;
}

const DEFAULT_STATS: UserStats = {
  gender: 'female',
  age: 30,
  height: 170,
  weight: 70,
  activityLevel: 'moderate',
  goal: 'lose'
};

const BioimpedanceModal: React.FC<BioimpedanceModalProps> = ({ isOpen, onClose, lang, texts, onUpdate, userId }) => {
  const [stats, setStats] = useState<UserStats>(DEFAULT_STATS);
  const [showResults, setShowResults] = useState(false);
  const [heightInput, setHeightInput] = useState('');
  const [weightInput, setWeightInput] = useState('');
  const [heightFocused, setHeightFocused] = useState(false);
  const [weightFocused, setWeightFocused] = useState(false);

  const storageKey = userId ? `biaNutriUserStats_${userId}` : null;

  // Recarregar stats ao abrir o modal para refletir peso/dados atualizados (ex.: de Meus Dados)
  useEffect(() => {
    if (!storageKey || !isOpen) return;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setStats(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading user stats for modal:', e);
      }
    }
  }, [storageKey, isOpen]);

  const handleChange = (field: keyof UserStats, value: any) => {
    setStats(prev => ({ ...prev, [field]: value }));
  };

  const handleNumericChange = (field: 'age' | 'height' | 'weight', e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (field === 'age') {
      const digits = raw.replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '').slice(0, 2);
      const num = digits === '' ? 0 : Number(digits);
      handleChange(field, num);
      return;
    }
    if (field === 'height') {
      if (raw.trim() === '') {
        setHeightInput('');
        handleChange(field, 0);
        return;
      }
      const normalized = raw.replace(',', '.');
      const parts = normalized.split('.');
      const digitsOnly = raw.replace(/[^\d]/g, '');
      if (parts.length === 1 && digitsOnly.length >= 2 && digitsOnly.length <= 3) {
        const d = digitsOnly.slice(0, 3).split('').map(Number);
        const cm = d.length === 1 ? d[0] * 100 : d.length === 2 ? d[0] * 100 + d[1] * 10 : d[0] * 100 + d[1] * 10 + d[2];
        const disp = cm / 100;
        setHeightInput(disp.toFixed(2).replace('.', ','));
        handleChange(field, cm);
        return;
      }
      if (parts.length > 2) return;
      const before = (parts[0] || '').replace(/[^\d]/g, '').slice(0, 1);
      const after = (parts[1] || '').replace(/[^\d]/g, '').slice(0, 2);
      const next = after ? `${before},${after}` : (before ? (normalized.includes('.') || normalized.includes(',') ? `${before},` : before) : '');
      setHeightInput(next);
      const cm = before === '' ? 0 : after === '' ? Number(before) * 100 : Number(before) * 100 + Number(after) * (after.length === 1 ? 10 : 1);
      handleChange(field, Math.round(cm));
      return;
    }
    if (field === 'weight') {
      if (raw.trim() === '') {
        setWeightInput('');
        handleChange(field, 0);
        return;
      }
      const normalized = raw.replace(',', '.');
      const parts = normalized.split('.');
      if (parts.length > 2) return;
      const before = (parts[0] || '').replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '').slice(0, 2);
      const after = (parts[1] || '').replace(/[^\d]/g, '').slice(0, 2);
      const hasDecimal = normalized.includes('.') || normalized.includes(',');
      const next = before === '' ? '' : (hasDecimal ? `${before}.${after}` : before);
      setWeightInput(next);
      const num = next === '' ? 0 : parseFloat(next) || 0;
      handleChange(field, num);
      return;
    }
  };

  const handleHeightBlur = () => {
    setHeightFocused(false);
    const v = heightInput.trim().replace(',', '.');
    if (v === '') {
      handleChange('height', 0);
      return;
    }
    const parts = v.split('.');
    const before = (parts[0] || '').replace(/[^\d]/g, '').slice(0, 1);
    const after = (parts[1] || '').replace(/[^\d]/g, '').slice(0, 2);
    const cm = before === '' ? 0 : after === '' ? Number(before) * 100 : Number(before) * 100 + (after.length === 1 ? Number(after) * 10 : Number(after));
    handleChange('height', Math.round(cm));
  };

  const handleWeightBlur = () => {
    setWeightFocused(false);
    const v = weightInput.trim().replace(',', '.');
    if (v === '') {
      handleChange('weight', 0);
      return;
    }
    const num = parseFloat(v) || 0;
    handleChange('weight', num);
  };

  const heightDisplay = (h: number): string => {
    if (h === 0) return '';
    const m = h / 100;
    return m.toFixed(2).replace('.', ',');
  };

  const weightDisplay = (w: number): string => {
    if (w === 0) return '';
    return w.toFixed(2);
  };

  const calculateTarget = () => {
    // BMR (Mifflin-St Jeor)
    let bmr = (10 * stats.weight) + (6.25 * stats.height) - (5 * stats.age);
    bmr += stats.gender === 'male' ? 5 : -161;

    const activityMultipliers: Record<string, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9
    };
    const tdee = bmr * activityMultipliers[stats.activityLevel];

    const minIdeal = 18.5 * Math.pow(stats.height / 100, 2);
    const maxIdeal = 24.9 * Math.pow(stats.height / 100, 2);
    const avgIdeal = (minIdeal + maxIdeal) / 2;
    const weightDiff = stats.weight - avgIdeal;

    // Ajuste calórico conforme o OBJETIVO escolhido (perder / manter / ganhar)
    let caloricAdjustment = 0;
    const goal = stats.goal;

    if (goal === 'maintain') {
      // Manter peso: meta = TDEE (ou pequeno ajuste se longe do ideal)
      if (weightDiff > 2) caloricAdjustment = -150;   // levemente abaixo para descer devagar
      else if (weightDiff < -2) caloricAdjustment = 150;
      // else 0
    } else if (goal === 'lose') {
      // Perder peso: déficit. ~500 kcal/dia ≈ 0,5 kg/semana
      if (weightDiff > 10) caloricAdjustment = -750;
      else if (weightDiff > 5) caloricAdjustment = -600;
      else if (weightDiff > 0) caloricAdjustment = -500;
      else caloricAdjustment = -300; // já abaixo do ideal: déficit menor
      const maxSafeDeficit = Math.min(1000, (tdee - bmr) * 0.8);
      caloricAdjustment = Math.max(caloricAdjustment, -maxSafeDeficit);
    } else {
      // goal === 'gain': ganhar massa: superávit. ~300–500 kcal/dia
      if (weightDiff < -10) caloricAdjustment = 500;
      else if (weightDiff < -5) caloricAdjustment = 400;
      else if (weightDiff < 0) caloricAdjustment = 300;
      else caloricAdjustment = 200; // já acima: superávit menor
    }

    let target = tdee + caloricAdjustment;
    target = Math.max(target, bmr);
    return { bmr, tdee, target, avgIdeal, weightDiff };
  };

  const handleCalculate = () => {
    if (!storageKey) return;
    const savedStats = localStorage.getItem(storageKey);
    const toSave = { ...stats };
    if (savedStats) {
      try {
        const existingStats = JSON.parse(savedStats);
        if (!existingStats.initialWeight) {
          toSave.initialWeight = stats.weight;
          toSave.initialWeightDate = Date.now();
        }
      } catch {
        toSave.initialWeight = stats.weight;
        toSave.initialWeightDate = Date.now();
      }
    } else {
      toSave.initialWeight = stats.weight;
      toSave.initialWeightDate = Date.now();
    }
    toSave.currentWeight = stats.weight;
    toSave.currentWeightDate = Date.now();
    localStorage.setItem(storageKey, JSON.stringify(toSave));
    const { target } = calculateTarget();
    onUpdate(Math.round(target));
    setShowResults(true);
  };

  // --- Display Values ---

  // BMI = kg / m^2
  const bmi = stats.weight / Math.pow(stats.height / 100, 2);
  
  // Ideal Weight Range (BMI 18.5 - 24.9)
  const minIdeal = 18.5 * Math.pow(stats.height / 100, 2);
  const maxIdeal = 24.9 * Math.pow(stats.height / 100, 2);

  const { bmr, tdee, target } = calculateTarget();

  // BMI Category Color
  const getBmiColor = (val: number) => {
    if (val < 18.5) return 'text-blue-500';
    if (val < 25) return 'text-green-500';
    if (val < 30) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-100 dark:border-slate-800 p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2 text-brand-600 dark:text-brand-500">
            <Calculator size={24} />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{texts.bioimpedanceTitle}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X size={24} className="text-slate-500" />
          </button>
        </div>

        <div className="p-6">
          {!showResults ? (
            /* --- Form --- */
            <div className="flex flex-col gap-5">
              
              {/* Gender */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleChange('gender', 'male')}
                  className={`p-3 rounded-xl border font-medium transition-all ${stats.gender === 'male' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}
                >
                  {texts.male}
                </button>
                <button
                  onClick={() => handleChange('gender', 'female')}
                  className={`p-3 rounded-xl border font-medium transition-all ${stats.gender === 'female' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}
                >
                  {texts.female}
                </button>
              </div>

              {/* Numeric Inputs */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-slate-500">{texts.age}</label>
                  <input 
                    type="number" 
                    value={stats.age === 0 ? '' : stats.age}
                    onChange={(e) => handleNumericChange('age', e)}
                    placeholder="0"
                    className="w-full p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border-none text-slate-900 dark:text-white font-bold text-center"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-slate-500">{texts.height}</label>
                  <input 
                    type="text"
                    inputMode="decimal"
                    value={heightFocused ? heightInput : heightDisplay(stats.height)}
                    onChange={(e) => handleNumericChange('height', e)}
                    onFocus={() => {
                      setHeightFocused(true);
                      setHeightInput(heightDisplay(stats.height) || '');
                    }}
                    onBlur={handleHeightBlur}
                    placeholder="1,70"
                    className="w-full p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border-none text-slate-900 dark:text-white font-bold text-center"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-slate-500">{texts.weight}</label>
                  <input 
                    type="text"
                    inputMode="decimal"
                    value={weightFocused ? weightInput : weightDisplay(stats.weight)}
                    onChange={(e) => handleNumericChange('weight', e)}
                    onFocus={() => {
                      setWeightFocused(true);
                      setWeightInput(weightDisplay(stats.weight) || '');
                    }}
                    onBlur={handleWeightBlur}
                    placeholder="70.00"
                    className="w-full p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border-none text-slate-900 dark:text-white font-bold text-center"
                  />
                </div>
              </div>

              {/* Activity Level */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Activity size={16} /> {texts.activity}
                </label>
                <select 
                  value={stats.activityLevel}
                  onChange={(e) => handleChange('activityLevel', e.target.value)}
                  className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-slate-900 dark:text-white appearance-none"
                >
                  <option value="sedentary">{texts.actSedentary}</option>
                  <option value="light">{texts.actLight}</option>
                  <option value="moderate">{texts.actModerate}</option>
                  <option value="active">{texts.actActive}</option>
                  <option value="very_active">{texts.actVeryActive}</option>
                </select>
              </div>

              {/* Goal */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Target size={16} /> {texts.goal}
                </label>
                <select 
                  value={stats.goal}
                  onChange={(e) => handleChange('goal', e.target.value)}
                  className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-slate-900 dark:text-white appearance-none"
                >
                  <option value="lose">{texts.goalLose}</option>
                  <option value="maintain">{texts.goalMaintain}</option>
                  <option value="gain">{texts.goalGain}</option>
                </select>
              </div>

              <button 
                onClick={handleCalculate}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-brand-500/30 mt-4"
              >
                {texts.calculate}
              </button>
            </div>
          ) : (
            /* --- Results --- */
            <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-300">
              
              <div className="grid grid-cols-2 gap-4">
                {/* BMI Card */}
                <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl flex flex-col items-center justify-center text-center">
                  <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">{texts.yourBmi}</span>
                  <span className={`text-4xl font-extrabold ${getBmiColor(bmi)}`}>{bmi.toFixed(1)}</span>
                </div>

                {/* Ideal Weight Card */}
                <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl flex flex-col items-center justify-center text-center">
                  <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">{texts.idealWeight}</span>
                  <span className="text-xl font-bold text-slate-800 dark:text-white">
                    {Math.round(minIdeal)} - {Math.round(maxIdeal)} <span className="text-sm text-slate-400">kg</span>
                  </span>
                </div>
              </div>

              {/* Main Calorie Result */}
              <div className="bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl p-6 text-white text-center shadow-lg shadow-brand-500/20">
                <h3 className="text-brand-100 font-bold uppercase tracking-wider text-sm mb-2">{texts.dietPlan}</h3>
                <div className="flex items-end justify-center gap-2 mb-1">
                  <span className="text-6xl font-extrabold">{Math.round(target)}</span>
                  <span className="text-2xl font-bold opacity-80 mb-2">kcal</span>
                </div>
                <p className="text-white/80 text-sm">
                  {texts.dailyNeeds}
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-xl border border-yellow-200 dark:border-yellow-900/50">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-semibold text-yellow-800 dark:text-yellow-500">BMR (Basal)</span>
                    <span className="font-bold text-yellow-900 dark:text-yellow-400">{Math.round(bmr)} kcal</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-yellow-800 dark:text-yellow-500">TDEE (Total)</span>
                    <span className="font-bold text-yellow-900 dark:text-yellow-400">{Math.round(tdee)} kcal</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => {
                  setShowResults(false);
                  onClose();
                }}
                className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-4 rounded-xl transition-all shadow-lg"
              >
                 {texts.save} 
              </button>
              
              <button 
                onClick={() => setShowResults(false)}
                className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-4 rounded-xl transition-all"
              >
                {texts.recalculate}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BioimpedanceModal;
