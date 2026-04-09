import { NutritionalInfo, MealAnalysis } from "../types";

// Converter arquivo em base64
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(",")[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const analyzeFoodImage = async (
  base64Image: string,
  lang: "en" | "pt",
  userDescription?: string,
  mimeType: string = "image/jpeg"
): Promise<MealAnalysis> => {
  // Obter a URL do Supabase e a anon key
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Configuração do Supabase não encontrada. " +
      "Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env"
    );
  }

  // URL da Edge Function
  const functionUrl = `${supabaseUrl}/functions/v1/gemini`;

  console.log('Chamando Edge Function do Supabase para análise de imagem...');

  try {
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        base64Image,
        mimeType,
        lang,
        userDescription,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Erro desconhecido" }));
      
      // Verificar se é erro de quota
      if (response.status === 429 || errorData.isQuotaError) {
        let errorMessage = errorData.error || 'Quota da API do Gemini excedida. Aguarde alguns minutos e tente novamente.';
        
        // Adicionar informação de retry se disponível
        if (errorData.retryAfter) {
          const minutes = Math.ceil(errorData.retryAfter / 60);
          errorMessage = `Quota da API do Gemini excedida. Aguarde aproximadamente ${minutes} minuto${minutes > 1 ? 's' : ''} antes de tentar novamente.`;
        }
        
        const quotaError: any = new Error(errorMessage);
        quotaError.code = 429;
        quotaError.isQuotaError = true;
        quotaError.retryAfter = errorData.retryAfter;
        throw quotaError;
      }

      if (response.status === 503 || (errorData as { isOverloadError?: boolean }).isOverloadError) {
        throw new Error(
          typeof errorData.error === "string"
            ? errorData.error
            : "Serviço temporariamente sobrecarregado. Tente novamente em instantes.",
        );
      }

      throw new Error(errorData.error || `Erro na Edge Function: ${response.statusText}`);
    }

    const data = await response.json();

    // Resposta 200 pode trazer { error: "..." } em alguns casos — tratar como erro
    if (data && typeof data === 'object' && data.error) {
      throw new Error(typeof data.error === 'string' ? data.error : (data.error.message || 'Erro na análise'));
    }

    // Validar estrutura esperada (MealAnalysis)
    if (!data || typeof data !== 'object') {
      throw new Error("Resposta inválida da API: dados não são um objeto");
    }

    const foods = data.foods;
    if (!foods || !Array.isArray(foods)) {
      const msg = "A análise não retornou lista de alimentos. Tente outra foto ou tente novamente em instantes.";
      throw new Error(msg);
    }

    if (foods.length === 0) {
      throw new Error("Nenhum alimento identificado na análise");
    }

    return data as MealAnalysis;
  } catch (error: any) {
    console.error('Erro ao chamar Edge Function:', error);
    
    // Verificar se é erro de quota
    if (error.code === 429 || error.isQuotaError || error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('Quota')) {
      const quotaError: any = new Error('Quota da API do Gemini excedida. Aguarde alguns minutos e tente novamente.');
      quotaError.code = 429;
      quotaError.isQuotaError = true;
      throw quotaError;
    }
    
    throw error;
  }
};

// Função auxiliar para converter MealAnalysis em NutritionalInfo (compatibilidade)
export const mealToSingleFood = (meal: MealAnalysis): NutritionalInfo => {
  // Validações de segurança
  if (!meal) {
    throw new Error("Meal analysis is null or undefined");
  }
  
  if (!meal.foods || !Array.isArray(meal.foods)) {
    throw new Error("Invalid meal analysis: foods array is missing or invalid");
  }
  
  if (meal.foods.length === 0) {
    throw new Error("No foods found in meal analysis");
  }
  
  // Se houver apenas um alimento, retornar ele
  if (meal.foods.length === 1) {
    return meal.foods[0];
  }
  
  // Se houver múltiplos, criar um item agregado
  const lang = meal.mealDescriptionPt ? 'pt' : 'en';
  const mealName = lang === 'pt' 
    ? `Refeição Completa (${meal.foods.length} itens)`
    : `Complete Meal (${meal.foods.length} items)`;
  
  return {
    foodName: mealName,
    foodNameEn: `Complete Meal (${meal.foods.length} items)`,
    foodNamePt: `Refeição Completa (${meal.foods.length} itens)`,
    calories: meal.totalCalories,
    protein: meal.totalProtein,
    carbs: meal.totalCarbs,
    fat: meal.totalFat,
    fiber: meal.totalFiber,
    sugar: meal.totalSugar,
    description: meal.mealDescription || meal.mealDescriptionEn || meal.mealDescriptionPt || mealName,
    descriptionEn: meal.mealDescriptionEn || `A complete meal with ${meal.foods.length} food items`,
    descriptionPt: meal.mealDescriptionPt || `Uma refeição completa com ${meal.foods.length} itens alimentares`,
  };
};
