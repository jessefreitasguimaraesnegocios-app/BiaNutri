import React, { useMemo, useState } from "react";
import { ChevronLeft, Loader2, Sparkles } from "lucide-react";
import type {
  DietaryRestrictions,
  DietPlanDay,
  Language,
  Translation,
  UserStats,
} from "../types";
import { fetchDietSuggestions } from "../services/dietSuggestionsService";
import { calculateDailyNutrientTargets } from "../utils/nutritionTargets";

function buildRestrictionsSummary(
  r: DietaryRestrictions | null,
  lang: Language,
): string {
  if (!r) return "";
  const parts: string[] = [];
  if (r.hasAllergies && r.allergies.length) {
    parts.push(
      lang === "pt"
        ? `Alergias: ${r.allergies.join(", ")}`
        : `Allergies: ${r.allergies.join(", ")}`,
    );
  }
  if (r.hasIntolerances && r.intolerances.length) {
    parts.push(
      lang === "pt"
        ? `Intolerâncias: ${r.intolerances.join(", ")}`
        : `Intolerances: ${r.intolerances.join(", ")}`,
    );
  }
  if (r.isDiabetic) {
    parts.push(lang === "pt" ? "Diabetes" : "Diabetes");
  }
  if (r.isHypertensive) {
    parts.push(lang === "pt" ? "Hipertensão" : "Hypertension");
  }
  return parts.join(". ");
}

function slotLabel(
  slot: string,
  texts: Translation,
): string {
  switch (slot) {
    case "breakfast":
      return texts.dietSlotBreakfast;
    case "lunch":
      return texts.dietSlotLunch;
    case "dinner":
      return texts.dietSlotDinner;
    case "snack":
      return texts.dietSlotSnack;
    default:
      return slot;
  }
}

interface DietSuggestionsViewProps {
  lang: Language;
  texts: Translation;
  onBack: () => void;
  dailyTarget: number | null;
  userStats: UserStats | null;
  dietaryRestrictions: DietaryRestrictions | null;
  todayConsumedKcal: number;
}

const DietSuggestionsView: React.FC<DietSuggestionsViewProps> = ({
  lang,
  texts,
  onBack,
  dailyTarget,
  userStats,
  dietaryRestrictions,
  todayConsumedKcal,
}) => {
  const [kcalInput, setKcalInput] = useState(
    () => (dailyTarget != null ? String(Math.round(dailyTarget)) : ""),
  );
  const [budgetInput, setBudgetInput] = useState("");
  const [consumedInput, setConsumedInput] = useState(
    () => (todayConsumedKcal > 0 ? String(Math.round(todayConsumedKcal)) : ""),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<DietPlanDay | null>(null);

  const goal = userStats?.goal ?? "maintain";
  const goalText =
    goal === "lose"
      ? texts.goalLose
      : goal === "gain"
        ? texts.goalGain
        : texts.goalMaintain;

  const parsedKcal = parseInt(kcalInput.replace(/\D/g, ""), 10);
  const parsedBudget = parseFloat(budgetInput.replace(",", "."));
  const parsedConsumed = parseInt(consumedInput.replace(/\D/g, ""), 10);

  const macroPreview = useMemo(() => {
    if (!Number.isFinite(parsedKcal) || parsedKcal < 800) return null;
    const w = userStats
      ? userStats.currentWeight ?? userStats.weight
      : undefined;
    return calculateDailyNutrientTargets(parsedKcal, {
      weightKg: w,
      gender: userStats?.gender,
    });
  }, [parsedKcal, userStats]);

  const handleGenerate = async () => {
    setError(null);
    setPlan(null);
    if (!Number.isFinite(parsedKcal) || parsedKcal < 800) {
      setError(texts.dietErrorNoTarget);
      return;
    }
    setLoading(true);
    try {
      const restrictionsText = buildRestrictionsSummary(dietaryRestrictions, lang);
      const { plan: p } = await fetchDietSuggestions({
        lang,
        targetKcal: parsedKcal,
        goal,
        proteinG: macroPreview?.proteinG,
        carbsG: macroPreview?.carbsG,
        fatG: macroPreview?.fatG,
        fiberG: macroPreview?.fiberG,
        budgetBrl:
          Number.isFinite(parsedBudget) && parsedBudget > 0
            ? parsedBudget
            : null,
        restrictionsText,
        alreadyConsumedKcal:
          Number.isFinite(parsedConsumed) && parsedConsumed >= 0
            ? parsedConsumed
            : 0,
      });
      setPlan(p);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : texts.errorGeneric);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 pb-28">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
          aria-label={texts.back}
        >
          <ChevronLeft size={24} />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Sparkles className="text-brand-500 shrink-0" size={22} />
          <h2 className="text-lg font-bold text-slate-800 dark:text-white truncate">
            {texts.dietSuggestionsTitle}
          </h2>
        </div>
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        {texts.dietSuggestionsSubtitle}
      </p>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-4 shadow-sm">
        <div>
          <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1.5">
            {texts.dietGoalLabel}
          </label>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {goalText}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
            {texts.dietOpenCalculatorHint}
          </p>
        </div>

        <div>
          <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1.5">
            {texts.dietTargetKcalLabel}
          </label>
          <input
            type="number"
            min={800}
            max={6000}
            value={kcalInput}
            onChange={(e) => setKcalInput(e.target.value)}
            className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white font-bold"
          />
        </div>

        <div>
          <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1.5">
            {texts.dietConsumedToday}
          </label>
          <input
            type="number"
            min={0}
            value={consumedInput}
            onChange={(e) => setConsumedInput(e.target.value)}
            placeholder="0"
            className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white font-bold"
          />
        </div>

        <div>
          <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1.5">
            {texts.dietBudgetLabel}
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={budgetInput}
            onChange={(e) => setBudgetInput(e.target.value)}
            placeholder={texts.dietBudgetOptional}
            className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white font-bold"
          />
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={handleGenerate}
          className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              {texts.dietLoading}
            </>
          ) : (
            <>
              <Sparkles size={20} />
              {texts.dietGenerateBtn}
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-sm p-4">
          {error}
        </div>
      )}

      {plan && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-slate-800 dark:text-white">
            {plan.title}
          </h3>

          <div className="flex flex-col gap-3">
            {Array.isArray(plan.meals) &&
              plan.meals.map((m, idx) => (
                <div
                  key={`${m.slot}-${idx}`}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50 p-4"
                >
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className="text-xs font-bold uppercase text-brand-600 dark:text-brand-400">
                      {slotLabel(m.slot, texts)}
                    </span>
                    {m.approxCalories != null && (
                      <span className="text-xs font-semibold text-slate-500">
                        ~{m.approxCalories} kcal
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-slate-800 dark:text-white mb-2">
                    {m.title}
                  </p>
                  <ul className="list-disc pl-4 text-sm text-slate-600 dark:text-slate-300 space-y-1">
                    {(m.items || []).map((it, i) => (
                      <li key={i}>{it}</li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>

          {plan.dessert && (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-900/15 p-4">
              <div className="flex justify-between items-start gap-2 mb-2">
                <span className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-400">
                  {texts.dietDessert}
                </span>
                {plan.dessert.approxCalories != null && (
                  <span className="text-xs font-semibold text-slate-500">
                    ~{plan.dessert.approxCalories} kcal
                  </span>
                )}
              </div>
              <p className="font-semibold text-slate-800 dark:text-white mb-2">
                {plan.dessert.title}
              </p>
              <ul className="list-disc pl-4 text-sm text-slate-600 dark:text-slate-300 space-y-1">
                {(plan.dessert.items || []).map((it, i) => (
                  <li key={i}>{it}</li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(plan.beverages) && plan.beverages.length > 0 && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-900/10 p-4">
              <h4 className="text-xs font-bold uppercase text-amber-800 dark:text-amber-400 mb-2">
                {texts.dietBeverages}
              </h4>
              <ul className="space-y-2">
                {plan.beverages.map((b, i) => (
                  <li key={i} className="text-sm text-slate-700 dark:text-slate-300">
                    <span className="font-semibold">{b.name}</span>
                    {b.note ? (
                      <span className="text-slate-500 dark:text-slate-400">
                        {" "}
                        — {b.note}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {plan.tips && (
            <div className="rounded-xl bg-blue-50 dark:bg-blue-900/15 border border-blue-200 dark:border-blue-900/40 p-4">
              <h4 className="text-xs font-bold uppercase text-blue-700 dark:text-blue-400 mb-1">
                {texts.dietTips}
              </h4>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {plan.tips}
              </p>
            </div>
          )}

          {plan.totalApproxCalories != null && (
            <p className="text-center text-sm font-bold text-slate-600 dark:text-slate-400">
              {texts.dietTotalKcal}: ~{plan.totalApproxCalories} kcal
            </p>
          )}

          <p className="text-xs text-slate-500 dark:text-slate-500 text-center italic px-2">
            {texts.dietDisclaimer}
          </p>
        </div>
      )}
    </div>
  );
};

export default DietSuggestionsView;
