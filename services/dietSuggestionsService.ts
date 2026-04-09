import type { DietPlanDay, Language } from "../types";

export interface FetchDietSuggestionsParams {
  lang: Language;
  targetKcal: number;
  goal: "lose" | "maintain" | "gain";
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  fiberG?: number;
  budgetBrl?: number | null;
  restrictionsText?: string;
  alreadyConsumedKcal?: number;
}

function normalizePlan(raw: unknown): DietPlanDay | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const meals = o.meals;
  const dessert = o.dessert;
  if (!Array.isArray(meals) || !dessert || typeof dessert !== "object") {
    return null;
  }
  return raw as DietPlanDay;
}

export async function fetchDietSuggestions(
  params: FetchDietSuggestionsParams,
): Promise<{ plan: DietPlanDay; model?: string }> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase não configurado (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)",
    );
  }

  const url = `${supabaseUrl}/functions/v1/diet-suggestions`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({
      lang: params.lang,
      targetKcal: params.targetKcal,
      goal: params.goal,
      proteinG: params.proteinG,
      carbsG: params.carbsG,
      fatG: params.fatG,
      fiberG: params.fiberG,
      budgetBrl: params.budgetBrl ?? null,
      restrictionsText: params.restrictionsText || "",
      alreadyConsumedKcal: params.alreadyConsumedKcal ?? 0,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = data as { error?: string; isQuotaError?: boolean; isOverloadError?: boolean };
    if (res.status === 429 || err.isQuotaError) {
      const q = new Error(
        typeof err.error === "string"
          ? err.error
          : "Limite da API atingido. Tente mais tarde.",
      );
      (q as Error & { isQuotaError?: boolean }).isQuotaError = true;
      throw q;
    }
    if (res.status === 503 || err.isOverloadError) {
      throw new Error(
        typeof err.error === "string"
          ? err.error
          : "Serviço temporariamente sobrecarregado. Tente novamente em instantes.",
      );
    }
    throw new Error(
      typeof err.error === "string" ? err.error : `Erro ${res.status}`,
    );
  }

  const planRaw = (data as { plan?: unknown; model?: string }).plan;
  const plan = normalizePlan(planRaw);
  if (!plan) {
    throw new Error("Resposta inválida: plano não reconhecido.");
  }
  return { plan, model: (data as { model?: string }).model };
}
