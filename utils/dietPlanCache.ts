import type { DietPlanDay } from "../types";

/** Data local YYYY-MM-DD (meia-noite local). */
export function getLocalDateKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const STORAGE_PREFIX = "biaNutriDailyDietPlan_";

export interface CachedDietPlan {
  dateKey: string;
  plan: DietPlanDay;
}

export function loadCachedDietPlan(
  userId: string | null,
): CachedDietPlan | null {
  const key = `${STORAGE_PREFIX}${userId ?? "guest"}`;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as {
      dateKey?: string;
      plan?: DietPlanDay;
    };
    if (!data.dateKey || !data.plan) return null;
    return { dateKey: data.dateKey, plan: data.plan };
  } catch {
    return null;
  }
}

export function saveCachedDietPlan(
  userId: string | null,
  plan: DietPlanDay,
): void {
  const key = `${STORAGE_PREFIX}${userId ?? "guest"}`;
  localStorage.setItem(
    key,
    JSON.stringify({ dateKey: getLocalDateKey(), plan }),
  );
}

export function isCachedPlanForToday(userId: string | null): boolean {
  const c = loadCachedDietPlan(userId);
  if (!c) return false;
  return c.dateKey === getLocalDateKey();
}
