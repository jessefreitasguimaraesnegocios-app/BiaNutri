import { NutritionalInfo, DietaryRestrictions } from '../types';
import {
  ALLERGEN_DEFINITIONS,
  HIGH_SUGAR_GRAMS,
  HIGH_SODIUM_KEYWORDS_PT,
  HIGH_SODIUM_KEYWORDS_EN,
} from '../constants/allergens';

export interface DietaryAlert {
  type: 'allergy' | 'intolerance' | 'diabetic' | 'hypertensive';
  messageKey: string;
  detail?: string;
}

function getFoodText(food: NutritionalInfo, lang: 'pt' | 'en'): string {
  const name = lang === 'pt' ? (food.foodNamePt || food.foodName) : (food.foodNameEn || food.foodName);
  const desc = lang === 'pt' ? (food.descriptionPt || food.description) : (food.descriptionEn || food.description);
  return `${(name || '').toLowerCase()} ${(desc || '').toLowerCase()}`;
}

function textContainsKeyword(text: string, keywords: string[]): boolean {
  const lower = text.normalize('NFD').replace(/\p{Diacritic}/gu, '');
  return keywords.some((k) => lower.includes(k.toLowerCase()));
}

/**
 * Retorna lista de alertas para exibir na tela de resultado quando o alimento
 * contém algo que o usuário não deve consumir (alergias, intolerâncias, diabético, hipertenso).
 */
export function getDietaryAlerts(
  foods: NutritionalInfo[],
  restrictions: DietaryRestrictions | null,
  lang: 'pt' | 'en'
): DietaryAlert[] {
  if (!restrictions) return [];

  const alerts: DietaryAlert[] = [];
  const seenKeys = new Set<string>();

  const allergyIds = restrictions.hasAllergies ? restrictions.allergies : [];
  const intoleranceIds = restrictions.hasIntolerances ? restrictions.intolerances : [];

  const keywordsPt = HIGH_SODIUM_KEYWORDS_PT;
  const keywordsEn = HIGH_SODIUM_KEYWORDS_EN;

  for (const food of foods) {
    const text = getFoodText(food, lang);
    const textNorm = text.normalize('NFD').replace(/\p{Diacritic}/gu, '');

    for (const def of ALLERGEN_DEFINITIONS) {
      const terms = lang === 'pt' ? def.keywordsPt : def.keywordsEn;
      const hasTerm = terms.some((t) => textNorm.includes(t.toLowerCase()));
      if (!hasTerm) continue;

      const label = lang === 'pt' ? def.labelPt : def.labelEn;
      if (allergyIds.includes(def.id)) {
        const key = `allergy_${def.id}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          alerts.push({ type: 'allergy', messageKey: 'alertContains', detail: label });
        }
      }
      if (intoleranceIds.includes(def.id)) {
        const key = `intolerance_${def.id}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          alerts.push({ type: 'intolerance', messageKey: 'alertContains', detail: label });
        }
      }
    }

    if (restrictions.isDiabetic && food.sugar >= HIGH_SUGAR_GRAMS) {
      if (!seenKeys.has('diabetic')) {
        seenKeys.add('diabetic');
        alerts.push({ type: 'diabetic', messageKey: 'alertHighSugar' });
      }
    }

    if (restrictions.isHypertensive) {
      const hasSodium = lang === 'pt'
        ? textContainsKeyword(text, keywordsPt)
        : textContainsKeyword(text, keywordsEn);
      if (hasSodium && !seenKeys.has('hypertensive')) {
        seenKeys.add('hypertensive');
        alerts.push({ type: 'hypertensive', messageKey: 'alertHighSodium' });
      }
    }
  }

  return alerts;
}
