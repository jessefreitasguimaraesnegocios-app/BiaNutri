/**
 * Metas diárias de macros e fibra a partir da meta calórica (e opcionalmente peso/gênero).
 * Proteína: prioriza g/kg (1,6–2,2 g/kg) quando há peso; senão ~25% das kcal.
 * Gordura: ~28% das kcal. Carboidratos: restante para fechar a meta calórica.
 * Fibra: máximo entre orientação por sexo (25/38 g) e 14 g/1000 kcal (IOM).
 */

export interface DailyNutrientTargets {
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
}

export interface NutrientTargetOptions {
  weightKg?: number;
  gender?: 'male' | 'female';
}

export function calculateDailyNutrientTargets(
  dailyCalories: number,
  opts?: NutrientTargetOptions
): DailyNutrientTargets {
  const kcal = Math.max(800, Math.round(dailyCalories));

  const proteinFromPercent = (0.25 * kcal) / 4;
  let proteinG: number;
  const w = opts?.weightKg;
  if (w != null && w > 20 && Number.isFinite(w)) {
    const low = 1.6 * w;
    const high = 2.2 * w;
    proteinG = Math.min(high, Math.max(low, proteinFromPercent));
  } else {
    proteinG = proteinFromPercent;
  }
  proteinG = Math.round(proteinG * 10) / 10;

  let fatG = Math.round(((0.28 * kcal) / 9) * 10) / 10;
  let remainingKcal = kcal - proteinG * 4 - fatG * 9;
  if (remainingKcal < 50) {
    fatG = Math.round(((0.25 * kcal) / 9) * 10) / 10;
    remainingKcal = kcal - proteinG * 4 - fatG * 9;
  }
  let carbsG = Math.max(0, Math.round((remainingKcal / 4) * 10) / 10);

  const fromDensity = Math.round((kcal / 1000) * 14);
  const minBySex =
    opts?.gender === 'female' ? 25 : opts?.gender === 'male' ? 38 : 28;
  const fiberG = Math.max(minBySex, fromDensity);

  return { proteinG, carbsG, fatG, fiberG };
}

/** Referências diárias simplificadas para adultos (orientação; não substitui orientação profissional). */
export interface MicronutrientReference {
  vitaminCMg: string;
  vitaminDMcg: string;
  calciumMg: string;
  ironMg: string;
  potassiumMg: string;
}

export function getMicronutrientReference(
  gender?: 'male' | 'female'
): MicronutrientReference {
  const female = gender === 'female';
  return {
    vitaminCMg: female ? '75' : '90',
    vitaminDMcg: '15',
    calciumMg: '1000',
    ironMg: female ? '14–18' : '8',
    potassiumMg: '3500',
  };
}
