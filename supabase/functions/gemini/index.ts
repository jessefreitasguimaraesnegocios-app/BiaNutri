// Supabase Edge Function para chamar a API Gemini
// Esta função recebe a imagem, faz a chamada para a Gemini API e retorna o resultado

// @deno-types="./types.d.ts"
// @ts-ignore - Deno import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface RequestBody {
  base64Image: string;
  mimeType?: string;
  lang?: "en" | "pt";
  userDescription?: string;
}

/** Ordem: melhor custo/cota no free tier (RPD alto) → qualidade visão → lite 2.5 (RPM maior). */
const GEMINI_MODEL_CHAIN = [
  "gemini-3.1-flash-lite-preview",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
] as const;

const GEMINI_API_ROOT = "https://generativelanguage.googleapis.com/v1beta";

function buildGeminiUrl(model: string, apiKey: string): string {
  return `${GEMINI_API_ROOT}/models/${model}:generateContent?key=${apiKey}`;
}

function errorMessageFromBody(errorData: Record<string, unknown>, fallback: string): string {
  const err = errorData?.error as Record<string, unknown> | undefined;
  if (err?.message && typeof err.message === "string") return err.message;
  if (typeof errorData?.message === "string") return errorData.message;
  return fallback;
}

/** Erros em que vale tentar o próximo modelo na cadeia. */
function shouldTryNextModel(
  status: number,
  errorText: string,
  errorData: Record<string, unknown>,
): boolean {
  if (status === 429 || status === 502 || status === 503 || status === 504) {
    return true;
  }
  const msg = `${errorMessageFromBody(errorData, errorText)} ${errorText}`.toLowerCase();
  if (
    msg.includes("high demand") ||
    msg.includes("unavailable") ||
    msg.includes("overloaded") ||
    msg.includes("resource exhausted") ||
    msg.includes("try again later") ||
    msg.includes("deadline exceeded")
  ) {
    return true;
  }
  return false;
}

function isNonRetryableClientError(status: number): boolean {
  return status === 400 || status === 401 || status === 403 || status === 404;
}

interface GeminiResponse {
  foods: Array<{
    foodName: string;
    foodNameEn: string;
    foodNamePt: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    description: string;
    descriptionEn: string;
    descriptionPt: string;
  }>;
  mealDescription: string;
  mealDescriptionEn: string;
  mealDescriptionPt: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verificar se é POST
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ============================================
    // 1. LER E VALIDAR A API KEY
    // ============================================
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    
    if (!apiKey) {
      console.error("❌ GEMINI_API_KEY não encontrada nas variáveis de ambiente");
      return new Response(
        JSON.stringify({ 
          error: "GEMINI_API_KEY não configurada. Configure no Supabase Dashboard > Edge Functions > Secrets" 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Limpar a chave (remover espaços e quebras de linha)
    const cleanApiKey = apiKey.trim();
    
    if (!cleanApiKey || cleanApiKey.length < 20) {
      console.error("❌ GEMINI_API_KEY parece inválida. Tamanho:", cleanApiKey.length);
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY inválida ou muito curta" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Log para debug (sem mostrar a chave completa por segurança)
    console.log("✅ GEMINI_API_KEY encontrada. Tamanho:", cleanApiKey.length);

    // ============================================
    // 2. PARSE DO BODY DA REQUISIÇÃO
    // ============================================
    const body: RequestBody = await req.json();
    const { base64Image, mimeType = "image/jpeg", lang = "pt", userDescription } = body;

    if (!base64Image) {
      return new Response(
        JSON.stringify({ error: "base64Image é obrigatório" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ============================================
    // 3. CONSTRUIR O PROMPT
    // ============================================
    let promptText = `Analyze this food image with EXTREME attention to detail. Your task is to identify EVERY SINGLE food item visible in the plate/meal.

CRITICAL INSTRUCTIONS:
1. Identify ALL individual food items separately (e.g., if there's rice, beans, chicken, salad, and bread, list each one)
2. For each food item, estimate the portion size visible in the image
3. Calculate nutritional values for each item based on the visible portion
4. Be precise and thorough - don't miss any food components
5. If you see multiple items of the same type (e.g., 2 pieces of bread), count them
6. Include side dishes, garnishes, sauces, and condiments as separate items
7. Estimate quantities realistically based on what's visible

For each food item, provide:
- Exact food name in both English and Portuguese
- Detailed description of the item and its preparation
- Accurate nutritional values (calories, protein, carbs, fat, fiber, sugar) for the visible portion

You MUST return ONLY a valid JSON object (no markdown, no code blocks, just pure JSON) with this exact structure:
{
  "foods": [
    {
      "foodName": "string",
      "foodNameEn": "string",
      "foodNamePt": "string",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number,
      "fiber": number,
      "sugar": number,
      "description": "string",
      "descriptionEn": "string",
      "descriptionPt": "string"
    }
  ],
  "mealDescription": "string",
  "mealDescriptionEn": "string",
  "mealDescriptionPt": "string"
}

Return ONLY the JSON object, nothing else.`;

    // Adicionar contexto do usuário se fornecido
    if (userDescription?.trim()) {
      promptText += `\n\nUser provided context: "${userDescription}"\nUse this information to help identify foods, but still identify ALL items visible in the image.`;
    }

    // ============================================
    // 4–6. CHAMADA GEMINI (cadeia de modelos + retry em cota/sobrecarga)
    // ============================================
    // v1beta: necessário para modelos preview (ex.: gemini-3.1-flash-lite-preview) e estável para 2.5.x
    const requestBody = {
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Image,
              },
            },
            { text: promptText },
          ],
        },
      ],
    };

    let geminiResponse: Response | null = null;
    let currentModel = GEMINI_MODEL_CHAIN[0];
    let lastErrorText = "";
    let lastErrorData: Record<string, unknown> = {};
    let lastStatus = 0;

    for (let i = 0; i < GEMINI_MODEL_CHAIN.length; i++) {
      currentModel = GEMINI_MODEL_CHAIN[i];
      const geminiUrl = buildGeminiUrl(currentModel, cleanApiKey);
      console.log(`🔵 Chamando API Gemini [${i + 1}/${GEMINI_MODEL_CHAIN.length}] modelo ${currentModel}...`);

      if (i > 0) {
        await new Promise((r) => setTimeout(r, 400));
      }

      geminiResponse = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (geminiResponse.ok) {
        console.log(`✅ Resposta OK com modelo ${currentModel}`);
        break;
      }

      const errorText = await geminiResponse.text();
      let errorData: Record<string, unknown> = {};
      try {
        errorData = JSON.parse(errorText) as Record<string, unknown>;
      } catch {
        errorData = { message: errorText };
      }

      lastErrorText = errorText;
      lastErrorData = errorData;
      lastStatus = geminiResponse.status;

      console.error(`❌ Erro API Gemini modelo ${currentModel}. Status:`, lastStatus);
      console.error("❌ Detalhe:", JSON.stringify(errorData, null, 2));

      if (isNonRetryableClientError(lastStatus)) {
        if (lastStatus === 401 || lastStatus === 403) {
          return new Response(
            JSON.stringify({
              error:
                "API Key do Gemini inválida ou sem permissão. Verifique se a chave está correta no Supabase Secrets e faça redeploy da função.",
              code: lastStatus,
              isApiKeyError: true,
            }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
        // 400 / 404 (modelo não disponível na região/chave): tentar próximo se for 404
        if (lastStatus === 404 && i < GEMINI_MODEL_CHAIN.length - 1) {
          console.warn(`⚠️ Modelo ${currentModel} indisponível (404), tentando próximo...`);
          continue;
        }
        return new Response(
          JSON.stringify({
            error: `Erro na API Gemini: ${errorMessageFromBody(errorData, errorText)}`,
            status: lastStatus,
          }),
          {
            status: lastStatus >= 400 && lastStatus < 600 ? lastStatus : 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const tryNext = shouldTryNextModel(lastStatus, errorText, errorData);
      if (tryNext && i < GEMINI_MODEL_CHAIN.length - 1) {
        console.warn(`🔄 Tentando próximo modelo na cadeia (motivo: status ${lastStatus})...`);
        continue;
      }

      // Último modelo ou erro não retryable pelo critério acima
      if (lastStatus === 429) {
        let retryAfter: number | null = null;
        let quotaDetails: unknown = null;
        const details = (lastErrorData?.error as Record<string, unknown> | undefined)?.details as
          | Array<Record<string, unknown>>
          | undefined;
        if (Array.isArray(details)) {
          const retryInfo = details.find(
            (d) => d["@type"] === "type.googleapis.com/google.rpc.RetryInfo",
          ) as { retryDelay?: string } | undefined;
          if (retryInfo?.retryDelay) {
            retryAfter = Math.ceil(parseFloat(String(retryInfo.retryDelay).replace("s", "")));
          }
          const quotaFailure = details.find(
            (d) => d["@type"] === "type.googleapis.com/google.rpc.QuotaFailure",
          );
          if (quotaFailure && typeof quotaFailure === "object" && "violations" in quotaFailure) {
            quotaDetails = (quotaFailure as { violations: unknown }).violations;
          }
        }
        let errorMessage =
          "Quota da API do Gemini excedida nos modelos tentados. Aguarde e tente novamente.";
        if (retryAfter) {
          errorMessage += ` Aguarde aproximadamente ${retryAfter} segundos.`;
        }
        const msg = errorMessageFromBody(lastErrorData, lastErrorText);
        if (msg.includes("free_tier")) {
          errorMessage += " (Limite do plano gratuito — veja o Google AI Studio.)";
        }
        return new Response(
          JSON.stringify({
            error: errorMessage,
            code: 429,
            isQuotaError: true,
            retryAfter,
            quotaDetails,
            helpUrl: "https://ai.google.dev/gemini-api/docs/rate-limits",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (lastStatus === 503 || lastStatus === 502 || lastStatus === 504) {
        return new Response(
          JSON.stringify({
            error:
              "Serviço Gemini temporariamente sobrecarregado ou indisponível. Tente novamente em instantes.",
            code: lastStatus,
            isOverloadError: true,
          }),
          {
            status: 503,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Último modelo: mensagens tipo "high demand" costumam vir como 500 no corpo
      if (
        i === GEMINI_MODEL_CHAIN.length - 1 &&
        shouldTryNextModel(lastStatus, errorText, errorData)
      ) {
        return new Response(
          JSON.stringify({
            error:
              "Serviço Gemini temporariamente sobrecarregado ou indisponível. Tente novamente em instantes.",
            code: lastStatus,
            isOverloadError: true,
          }),
          {
            status: 503,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({
          error: `Erro na API Gemini: ${errorMessageFromBody(lastErrorData, lastErrorText)}`,
          status: lastStatus,
        }),
        {
          status: lastStatus >= 400 && lastStatus < 600 ? lastStatus : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!geminiResponse?.ok) {
      return new Response(
        JSON.stringify({
          error: `Erro na API Gemini: ${errorMessageFromBody(lastErrorData, lastErrorText)}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ============================================
    // 7. PROCESSAR A RESPOSTA DA GEMINI
    // ============================================
    const geminiData = await geminiResponse.json();
    let responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      console.error("❌ Gemini não retornou resposta válida");
      return new Response(
        JSON.stringify({ error: "Gemini não retornou resposta válida" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Limpar o texto - remover markdown code blocks se houver
    responseText = responseText.trim();
    if (responseText.startsWith("```json")) {
      responseText = responseText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (responseText.startsWith("```")) {
      responseText = responseText.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    // Parse do JSON retornado pela Gemini
    let parsed: GeminiResponse;
    try {
      parsed = JSON.parse(responseText);
    } catch (parseError) {
      console.error("❌ Erro ao fazer parse do JSON:", parseError);
      console.error("❌ Texto recebido (primeiros 500 chars):", responseText.substring(0, 500));
      return new Response(
        JSON.stringify({
          error: "Erro ao processar resposta da Gemini. A resposta não é um JSON válido.",
          rawResponse: responseText.substring(0, 500),
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Garantir que a Gemini retornou array 'foods'
    if (!parsed.foods || !Array.isArray(parsed.foods)) {
      console.error("❌ Resposta da Gemini sem array 'foods'. Estrutura:", Object.keys(parsed || {}));
      return new Response(
        JSON.stringify({
          error: "A análise não retornou lista de alimentos. Tente outra foto ou tente novamente.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ============================================
    // 8. CALCULAR TOTAIS NUTRICIONAIS
    // ============================================
    const totals = parsed.foods.reduce(
      (acc, food) => ({
        calories: acc.calories + (food.calories || 0),
        protein: acc.protein + (food.protein || 0),
        carbs: acc.carbs + (food.carbs || 0),
        fat: acc.fat + (food.fat || 0),
        fiber: acc.fiber + (food.fiber || 0),
        sugar: acc.sugar + (food.sugar || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 }
    );

    // ============================================
    // 9. RETORNAR RESPOSTA FORMATADA
    // ============================================
    const response = {
      foods: parsed.foods,
      totalCalories: totals.calories,
      totalProtein: totals.protein,
      totalCarbs: totals.carbs,
      totalFat: totals.fat,
      totalFiber: totals.fiber,
      totalSugar: totals.sugar,
      mealDescription: parsed.mealDescription,
      mealDescriptionEn: parsed.mealDescriptionEn,
      mealDescriptionPt: parsed.mealDescriptionPt,
    };

    console.log(`✅ Análise concluída com sucesso usando modelo ${currentModel}. Alimentos identificados:`, parsed.foods.length);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("❌ Erro na Edge Function:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Erro interno do servidor",
        stack: error.stack,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
