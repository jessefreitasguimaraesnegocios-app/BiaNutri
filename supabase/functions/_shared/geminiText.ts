/** Cadeia e helpers compartilhados para chamadas Gemini só texto (Edge Functions). */

export const GEMINI_MODEL_CHAIN = [
  "gemini-3.1-flash-lite-preview",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
] as const;

export const GEMINI_API_ROOT = "https://generativelanguage.googleapis.com/v1beta";

export function buildGeminiUrl(model: string, apiKey: string): string {
  return `${GEMINI_API_ROOT}/models/${model}:generateContent?key=${apiKey}`;
}

export function errorMessageFromBody(
  errorData: Record<string, unknown>,
  fallback: string,
): string {
  const err = errorData?.error as Record<string, unknown> | undefined;
  if (err?.message && typeof err.message === "string") return err.message;
  if (typeof errorData?.message === "string") return errorData.message;
  return fallback;
}

export function shouldTryNextModel(
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

export function isNonRetryableClientError(status: number): boolean {
  return status === 400 || status === 401 || status === 403 || status === 404;
}

export interface GeminiTextRequestBody {
  contents: Array<{ parts: Array<{ text?: string }> }>;
  generationConfig?: { temperature?: number; maxOutputTokens?: number };
}

/** Retorna { ok: true, text, model } ou { ok: false, response } para repassar erro. */
export async function generateGeminiText(
  apiKey: string,
  requestBody: GeminiTextRequestBody,
): Promise<
  | { ok: true; text: string; model: string }
  | { ok: false; status: number; body: Record<string, unknown>; errorText: string; model: string }
> {
  let lastErrorText = "";
  let lastErrorData: Record<string, unknown> = {};
  let lastStatus = 0;
  let geminiResponse: Response | null = null;
  let currentModel = GEMINI_MODEL_CHAIN[0];

  for (let i = 0; i < GEMINI_MODEL_CHAIN.length; i++) {
    currentModel = GEMINI_MODEL_CHAIN[i];
    const url = buildGeminiUrl(currentModel, apiKey);

    if (i > 0) {
      await new Promise((r) => setTimeout(r, 400));
    }

    geminiResponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...requestBody,
        generationConfig: {
          temperature: 0.65,
          maxOutputTokens: 8192,
          ...requestBody.generationConfig,
        },
      }),
    });

    if (geminiResponse.ok) {
      const data = await geminiResponse.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text && typeof text === "string") {
        return { ok: true, text: text.trim(), model: currentModel };
      }
      lastErrorText = "empty candidates";
      lastErrorData = { error: { message: "Resposta sem texto" } };
      lastStatus = 502;
    } else {
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

      if (isNonRetryableClientError(lastStatus)) {
        if (lastStatus === 401 || lastStatus === 403) {
          return {
            ok: false,
            status: lastStatus,
            body: {
              error: "API Key do Gemini inválida ou sem permissão.",
              isApiKeyError: true,
            },
            errorText,
            model: currentModel,
          };
        }
        if (lastStatus === 404 && i < GEMINI_MODEL_CHAIN.length - 1) {
          continue;
        }
        return {
          ok: false,
          status: lastStatus,
          body: {
            error: errorMessageFromBody(errorData, errorText),
          },
          errorText,
          model: currentModel,
        };
      }

      const tryNext = shouldTryNextModel(lastStatus, errorText, errorData);
      if (tryNext && i < GEMINI_MODEL_CHAIN.length - 1) {
        continue;
      }

      if (lastStatus === 429) {
        return {
          ok: false,
          status: 429,
          body: {
            error:
              "Quota da API do Gemini excedida. Aguarde e tente novamente.",
            isQuotaError: true,
          },
          errorText,
          model: currentModel,
        };
      }

      if (lastStatus === 503 || lastStatus === 502 || lastStatus === 504) {
        return {
          ok: false,
          status: 503,
          body: {
            error:
              "Serviço Gemini temporariamente sobrecarregado. Tente novamente em instantes.",
            isOverloadError: true,
          },
          errorText,
          model: currentModel,
        };
      }

      if (
        i === GEMINI_MODEL_CHAIN.length - 1 &&
        shouldTryNextModel(lastStatus, errorText, errorData)
      ) {
        return {
          ok: false,
          status: 503,
          body: {
            error:
              "Serviço Gemini temporariamente sobrecarregado. Tente novamente em instantes.",
            isOverloadError: true,
          },
          errorText,
          model: currentModel,
        };
      }

      return {
        ok: false,
        status: lastStatus,
        body: { error: errorMessageFromBody(errorData, errorText) },
        errorText,
        model: currentModel,
      };
    }
  }

  return {
    ok: false,
    status: 500,
    body: { error: errorMessageFromBody(lastErrorData, lastErrorText) },
    errorText: lastErrorText,
    model: currentModel,
  };
}
