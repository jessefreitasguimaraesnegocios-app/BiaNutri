// Sugestões de cardápio do dia (texto) via Gemini — sem imagem
// @ts-ignore - Deno import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { generateGeminiText } from "../_shared/geminiText.ts";

interface DietRequestBody {
  lang?: "en" | "pt";
  targetKcal: number;
  goal: "lose" | "maintain" | "gain";
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  fiberG?: number;
  /** Orçamento diário em BRL (opcional) — adaptar ingredientes */
  budgetBrl?: number | null;
  restrictionsText?: string;
  alreadyConsumedKcal?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey?.trim()) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY não configurada" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body = (await req.json()) as DietRequestBody;
    const lang = body.lang === "en" ? "en" : "pt";
    const targetKcal = Math.round(
      Math.min(Math.max(Number(body.targetKcal) || 0, 800), 6000),
    );
    if (!targetKcal || targetKcal < 800) {
      return new Response(
        JSON.stringify({ error: "targetKcal inválido (mínimo 800)" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const goal = body.goal === "gain" || body.goal === "maintain"
      ? body.goal
      : "lose";
    const remainingKcal = Math.max(
      0,
      targetKcal - Math.round(Number(body.alreadyConsumedKcal) || 0),
    );

    const goalExplain =
      lang === "pt"
        ? goal === "lose"
          ? "objetivo: perder peso (déficit calórico moderado, refeições saciantes)"
          : goal === "gain"
          ? "objetivo: ganhar massa (superávit leve, proteína adequada)"
          : "objetivo: manter peso (equilíbrio energético)"
        : goal === "lose"
        ? "goal: weight loss (moderate deficit, satiating meals)"
        : goal === "gain"
        ? "goal: muscle gain (slight surplus, adequate protein)"
        : "goal: weight maintenance (energy balance)";

    const macroLine =
      body.proteinG != null && body.carbsG != null && body.fatG != null
        ? lang === "pt"
          ? `Metas aproximadas de macros para o dia: proteína ~${Math.round(body.proteinG)}g, carboidratos ~${Math.round(body.carbsG)}g, gorduras ~${Math.round(body.fatG)}g${body.fiberG != null ? `, fibras ~${Math.round(body.fiberG)}g` : ""}.`
          : `Approximate daily macro targets: protein ~${Math.round(body.proteinG)}g, carbs ~${Math.round(body.carbsG)}g, fat ~${Math.round(body.fatG)}g${body.fiberG != null ? `, fiber ~${Math.round(body.fiberG)}g` : ""}.`
        : "";

    const budgetLine =
      body.budgetBrl != null && body.budgetBrl > 0
        ? lang === "pt"
          ? `Orçamento aproximado para alimentação do dia: R$ ${body.budgetBrl.toFixed(0)}. Sugira opções realistas nessa faixa (pode mencionar tipos de alimento acessíveis vs premium).`
          : `Approximate daily food budget: ${body.budgetBrl} BRL. Suggest realistic options in this range.`
        : "";

    const restr = (body.restrictionsText || "").trim();
    const restrLine = restr
      ? lang === "pt"
        ? `RESTRIÇÕES / ALERGIAS (obrigatório respeitar): ${restr}`
        : `RESTRICTIONS / ALLERGIES (must respect): ${restr}`
      : "";

    const consumedLine =
      (body.alreadyConsumedKcal || 0) > 0
        ? lang === "pt"
          ? `O usuário já consumiu cerca de ${Math.round(body.alreadyConsumedKcal!)} kcal hoje. Meta diária total: ${targetKcal} kcal. Planeje o restante do dia (~${remainingKcal} kcal restantes) ou ajuste porções se fizer sentido.`
          : `User already consumed ~${Math.round(body.alreadyConsumedKcal!)} kcal today. Daily target: ${targetKcal} kcal. Plan the remainder (~${remainingKcal} kcal left).`
        : lang === "pt"
        ? `Meta calórica total do dia: ${targetKcal} kcal.`
        : `Daily calorie target: ${targetKcal} kcal.`;

    const prompt =
      lang === "pt"
        ? `Você é nutricionista digital. ${goalExplain}
${consumedLine}
${macroLine}
${budgetLine}
${restrLine}

Gere um plano alimentar para HOJE, brasileiro, saudável e prático. Inclua:
- Café da manhã, almoço, jantar
- 1–2 lanches se couber nas calorias
- Sobremesa saudável (fruta, iogurte, etc.)
- Pelo menos uma sugestão de suco natural e uma de vitamina/smoothie

Responda APENAS com um JSON válido (sem markdown), neste formato exato:
{
  "title": "string curta",
  "meals": [
    { "slot": "breakfast|lunch|dinner|snack", "title": "string", "items": ["..."], "approxCalories": number }
  ],
  "dessert": { "title": "string", "items": ["..."], "approxCalories": number },
  "beverages": [ { "name": "string", "note": "string" } ],
  "tips": "string com 1-2 dicas",
  "totalApproxCalories": number (soma aproximada do plano)
}
Os números de calorias devem somar de forma coerente com a meta (±15%).`
        : `You are a nutrition assistant. ${goalExplain}
${consumedLine}
${macroLine}
${budgetLine}
${restrLine}

Generate a healthy practical full-day meal plan. Include breakfast, lunch, dinner, 1-2 snacks if calories allow, a healthy dessert, juice and smoothie ideas.

Return ONLY valid JSON (no markdown), exact shape:
{
  "title": "short string",
  "meals": [
    { "slot": "breakfast|lunch|dinner|snack", "title": "string", "items": ["..."], "approxCalories": number }
  ],
  "dessert": { "title": "string", "items": ["..."], "approxCalories": number },
  "beverages": [ { "name": "string", "note": "string" } ],
  "tips": "1-2 tips string",
  "totalApproxCalories": number
}
Calories should align with target (±15%).`;

    const result = await generateGeminiText(apiKey.trim(), {
      contents: [{ parts: [{ text: prompt }] }],
    });

    if (!result.ok) {
      const st = result.status === 429
        ? 429
        : result.status === 503
        ? 503
        : result.body.isApiKeyError
        ? 500
        : 502;
      return new Response(JSON.stringify(result.body), {
        status: st,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let text = result.text;
    if (text.startsWith("```json")) {
      text = text.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (text.startsWith("```")) {
      text = text.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      return new Response(
        JSON.stringify({
          error: "Resposta inválida do modelo. Tente novamente.",
          rawPreview: text.substring(0, 400),
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({ plan: parsed, model: result.model }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
