import React from 'react';
import { Apple, Egg, Flame, Zap } from 'lucide-react';
import { Translation } from '../types';
import {
  DailyNutrientTargets,
  MicronutrientReference,
} from '../utils/nutritionTargets';

export interface NutrientCurrentTotals {
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

interface NutrientTargetsCardProps {
  targets: DailyNutrientTargets;
  microRef: MicronutrientReference;
  texts: Translation;
  current?: NutrientCurrentTotals | null;
  onClick?: () => void;
}

function MacroRow(props: {
  label: string;
  hint: string;
  target: number;
  current?: number;
  unit?: string;
  icon: React.ReactNode;
}) {
  const { label, hint, target, current, unit = 'g', icon } = props;
  const pct =
    current != null && target > 0
      ? Math.min(100, (current / target) * 100)
      : null;

  return (
    <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 p-3">
      <div className="flex items-start gap-2 mb-2">
        <span className="text-brand-500 dark:text-brand-400 mt-0.5">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
              {label}
            </span>
            <span className="text-sm font-bold text-slate-800 dark:text-white whitespace-nowrap">
              {current != null ? (
                <>
                  {current.toFixed(1)} / {target}
                  {unit}
                </>
              ) : (
                <>
                  {target}
                  {unit}
                </>
              )}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
            {hint}
          </p>
        </div>
      </div>
      {pct != null && (
        <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 dark:bg-brand-400 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

const NutrientTargetsCard: React.FC<NutrientTargetsCardProps> = ({
  targets,
  microRef,
  texts,
  current,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl p-5 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
        {texts.nutrientTargetsTitle}
      </h3>

      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
        {texts.nutrientMacrosSection}
      </p>
      <div className="flex flex-col gap-2 mb-4">
        <MacroRow
          label={texts.protein}
          hint={texts.macroProteinHint}
          target={targets.proteinG}
          current={current?.protein}
          icon={<Flame size={14} />}
        />
        <MacroRow
          label={texts.carbs}
          hint={texts.macroCarbsHint}
          target={targets.carbsG}
          current={current?.carbs}
          icon={<Zap size={14} />}
        />
        <MacroRow
          label={texts.fat}
          hint={texts.macroFatHint}
          target={targets.fatG}
          current={current?.fat}
          icon={<Egg size={14} />}
        />
      </div>

      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
        {texts.nutrientMicroSection}
      </p>
      <div className="rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-900/15 p-3 mb-3">
        <div className="flex items-start gap-2">
          <Apple size={14} className="text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-bold uppercase text-emerald-800 dark:text-emerald-300">
                {texts.fiber}
              </span>
              <span className="text-sm font-bold text-slate-800 dark:text-white whitespace-nowrap">
                {current?.fiber != null ? (
                  <>
                    {current.fiber.toFixed(1)} / {targets.fiberG}g
                  </>
                ) : (
                  <>{targets.fiberG}g</>
                )}
              </span>
            </div>
            <p className="text-[11px] text-emerald-800/80 dark:text-emerald-200/80 mt-0.5 leading-snug">
              {texts.microFiberHint}
            </p>
            {current?.fiber != null && targets.fiberG > 0 && (
              <div className="h-1.5 w-full bg-emerald-200/80 dark:bg-emerald-900/50 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-emerald-500 dark:bg-emerald-400 transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      (current.fiber / targets.fiberG) * 100
                    )}%`,
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1.5 leading-relaxed">
        <p className="font-semibold text-slate-600 dark:text-slate-300">
          {texts.microVitaminsTitle}
        </p>
        <p>{texts.microVitaminsIntro}</p>
        <ul className="list-disc pl-4 space-y-0.5">
          <li>
            {texts.microRefVitaminC}: {microRef.vitaminCMg} mg
          </li>
          <li>
            {texts.microRefVitaminD}: {microRef.vitaminDMcg} µg
          </li>
          <li>
            {texts.microRefCalcium}: {microRef.calciumMg} mg
          </li>
          <li>
            {texts.microRefIron}: {microRef.ironMg} mg
          </li>
          <li>
            {texts.microRefPotassium}: {microRef.potassiumMg} mg
          </li>
        </ul>
        <p className="text-slate-400 dark:text-slate-500 italic pt-1">
          {texts.microRefDisclaimer}
        </p>
      </div>
    </div>
  );
};

export default NutrientTargetsCard;
