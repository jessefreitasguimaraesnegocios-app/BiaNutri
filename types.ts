
export type Language = 'en' | 'pt';
export type Theme = 'light' | 'dark';

export interface ColorPalette {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}

export interface MacroData {
  name: string;
  value: number;
  unit: string;
  color: string;
}

export interface NutritionalInfo {
  foodName: string; // Original/Fallback
  foodNameEn?: string; // English specific
  foodNamePt?: string; // Portuguese specific
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  description: string; // Original/Fallback
  descriptionEn?: string; // English specific
  descriptionPt?: string; // Portuguese specific
}

// Interface para múltiplos alimentos identificados em um prato
export interface MealAnalysis {
  foods: NutritionalInfo[]; // Array de todos os alimentos identificados
  totalCalories: number; // Soma total de calorias
  totalProtein: number; // Soma total de proteínas
  totalCarbs: number; // Soma total de carboidratos
  totalFat: number; // Soma total de gorduras
  totalFiber: number; // Soma total de fibras
  totalSugar: number; // Soma total de açúcares
  mealDescription?: string; // Descrição geral da refeição
  mealDescriptionEn?: string;
  mealDescriptionPt?: string;
}

export interface HistoryItem extends NutritionalInfo {
  id: string;
  timestamp: number;
  imageUrl?: string;
}

export interface WaterEntry {
  id: string;
  amount: number; // ml
  timestamp: number;
}

/** Ciclos de jejum: 14h, 16h, 18h, 20h ou personalizado */
export type FastingCycle = '1m' | '14' | '16' | '18' | '20' | 'custom';

/** Registro de um dia de jejum */
export interface FastingEntry {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  hours: number;
  cycle: FastingCycle;
}

export interface UserStats {
  gender: 'male' | 'female';
  age: number;
  height: number; // cm
  weight: number; // kg
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal: 'lose' | 'maintain' | 'gain';
  initialWeight?: number; // kg - peso inicial quando começou a dieta
  initialWeightDate?: number; // timestamp da data do peso inicial
  currentWeight?: number; // kg - peso atual mais recente
  currentWeightDate?: number; // timestamp da data do peso atual
}

/** Restrições alimentares do usuário (alergias, intolerâncias, diabético, hipertenso) - padrão Anvisa */
export interface DietaryRestrictions {
  hasAllergies: boolean;
  allergies: string[];
  hasIntolerances: boolean;
  intolerances: string[];
  isDiabetic: boolean;
  isHypertensive: boolean;
}

export interface Translation {
  title: string;
  subtitle: string;
  scanButton: string;
  uploadButton: string;
  analyzing: string;
  history: string;
  noHistory: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
  sugar: string;
  save: string;
  back: string;
  tryAgain: string;
  errorGeneric: string;
  errorApiKey: string;
  errorQuota: string;
  favorites: string;
  dailyGoal: string;
  viewHistory: string;
  totalCalories: string;
  totalScans: string;
  
  // Calculator / Bioimpedance
  bioimpedanceBtn: string;
  bioimpedanceTitle: string;
  gender: string;
  male: string;
  female: string;
  age: string;
  height: string;
  weight: string;
  activity: string;
  goal: string;
  calculate: string;
  recalculate: string;
  yourBmi: string;
  idealWeight: string;
  dailyNeeds: string;
  dietPlan: string;
  
  // Activity Levels
  actSedentary: string;
  actLight: string;
  actModerate: string;
  actActive: string;
  actVeryActive: string;
  
  // Goals
  goalLose: string;
  goalMaintain: string;
  goalGain: string;

  // Tracker
  todayProgress: string;
  caloriesRemaining: string;
  caloriesOver: string;
  goalMet: string;
  
  // Theming
  chooseColor: string;

  // Description Modal
  addDescriptionTitle: string;
  addDescriptionPlaceholder: string;
  analyzeNow: string;
  optional: string;
  
  // Calendar
  calendar: string;
  hasData: string;
  noData: string;
  dayDetails: string;
  dailyTotals: string;
  foodItems: string;
  noDataForDay: string;
  day: string;
  week: string;
  month: string;
  
  // Water Tracker
  water: string;
  waterGoal: string;
  waterRemaining: string;
  waterGoalMet: string;
  waterLow: string;
  waterAdd: string;
  waterToday: string;
  waterReminder: string;
  waterReminderTitle: string;
  waterReminderMessage: string;
  waterReminderAction: string;
  waterReminderSnooze: string;
  waterReminderInterval: string;
  waterNotificationTitle: string;
  waterNotificationBody: string;
  waterQuickAdd: string;
  waterCustom: string;
  waterHistory: string;
  waterStats: string;

  // Dietary restrictions / Restrições alimentares
  dietaryRestrictionsTitle: string;
  dietaryRestrictionsBtn: string;
  hasAllergies: string;
  hasIntolerances: string;
  isDiabetic: string;
  isHypertensive: string;
  yes: string;
  no: string;
  saveRestrictions: string;
  alertNotRecommended: string;
  alertContains: string;
  alertHighSugar: string;
  alertHighSodium: string;
  suggestionAvoid: string;
}

export const SUPPORTED_LANGUAGES: Language[] = ['en', 'pt'];

// Trial e assinatura
export interface ProfileTrial {
  phone: string | null;
  trialStartedAt: number | null;
  trialSecondsUsed: number;
  trialUsedAt: number | null;
}

export type TrialStatus = 'none' | 'active' | 'exhausted' | 'phone_required' | 'phone_already_used';

export interface SubscriptionRecord {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  valid_until: string;
}

export type AccessStatus = 'allowed' | 'paywall' | 'phone_required';