// Edge Function: cria assinatura com status "pending" via API e retorna init_point (checkout).
// O checkout público do MP usa preapproval_id (assinatura criada), não preapproval_plan_id (403).
// Fluxo: POST /preapproval com status=pending (sem card_token_id) → MP devolve init_point.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const PREAPPROVAL_PLAN_IDS: Record<string, string> = {
  monthly: "926ccca97394458e8f88b54d0d64388d",
  quarterly: "3925655a3e1e43c6984ab3d40c1bf771",
  yearly: "ef440dc0caf747a8a8c1face5028f644",
};

const PLAN_REASONS: Record<string, string> = {
  monthly: "BiaNutri - 1 mês",
  quarterly: "BiaNutri - 3 meses",
  yearly: "BiaNutri - 1 ano",
};

/** Para fluxo sem plano (assinatura pendente): valor e recorrência por plan_id. */
const AUTO_RECURRING_BY_PLAN: Record<
  string,
  { transaction_amount: number; frequency: number; frequency_type: string }
> = {
  monthly: { transaction_amount: 39.9, frequency: 1, frequency_type: "months" },
  quarterly: { transaction_amount: 89.7, frequency: 3, frequency_type: "months" },
  yearly: { transaction_amount: 214.8, frequency: 12, frequency_type: "months" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let body: { user_id?: string; plan_id?: string; back_url?: string };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid request body (JSON required)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!body?.user_id || body.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "MERCADOPAGO_ACCESS_TOKEN not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payerEmail = (user.email ?? "").trim();
    if (!payerEmail) {
      return new Response(
        JSON.stringify({ error: "User email is required for subscription" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const planId = body.plan_id as string;
    const preapprovalPlanId = PREAPPROVAL_PLAN_IDS[planId];
    const planReason = PLAN_REASONS[planId] ?? `BiaNutri - ${planId}`;
    const externalReference = `${body.user_id}|${planId}`;
    const backUrl = body.back_url || undefined;

    if (!preapprovalPlanId && !AUTO_RECURRING_BY_PLAN[planId]) {
      return new Response(JSON.stringify({ error: "Invalid plan_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 2);
    const endDateIso = endDate.toISOString();

    let reqBody: Record<string, unknown>;
    if (preapprovalPlanId) {
      reqBody = {
        preapproval_plan_id: preapprovalPlanId,
        reason: planReason,
        external_reference: externalReference,
        payer_email: payerEmail,
        back_url: backUrl,
        status: "pending",
      };
    } else {
      const ar = AUTO_RECURRING_BY_PLAN[planId];
      reqBody = {
        reason: planReason,
        external_reference: externalReference,
        payer_email: payerEmail,
        back_url: backUrl,
        status: "pending",
        auto_recurring: {
          frequency: ar.frequency,
          frequency_type: ar.frequency_type,
          end_date: endDateIso,
          transaction_amount: ar.transaction_amount,
          currency_id: "BRL",
        },
      };
    }

    let res: Response;
    try {
      res = await fetch("https://api.mercadopago.com/preapproval", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(reqBody),
      });
    } catch (fetchErr) {
      const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      console.error("Mercado Pago fetch error:", msg);
      return new Response(
        JSON.stringify({ error: "Mercado Pago request failed", message: msg }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let data: { init_point?: string; error?: string; message?: string };
    try {
      data = (await res.json()) as typeof data;
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid response from Mercado Pago" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!res.ok) {
      const errMsg = data.message || data.error || "Mercado Pago error";
      const needsCardToken =
        typeof errMsg === "string" &&
        (errMsg.toLowerCase().includes("card_token") || res.status === 400);
      if (needsCardToken && preapprovalPlanId && AUTO_RECURRING_BY_PLAN[planId]) {
        const ar = AUTO_RECURRING_BY_PLAN[planId];
        reqBody = {
          reason: planReason,
          external_reference: externalReference,
          payer_email: payerEmail,
          back_url: backUrl,
          status: "pending",
          auto_recurring: {
            frequency: ar.frequency,
            frequency_type: ar.frequency_type,
            end_date: endDateIso,
            transaction_amount: ar.transaction_amount,
            currency_id: "BRL",
          },
        };
        const res2 = await fetch("https://api.mercadopago.com/preapproval", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(reqBody),
        });
        const data2 = (await res2.json()) as { init_point?: string; error?: string; message?: string };
        if (res2.ok && data2.init_point) {
          return new Response(
            JSON.stringify({ init_point: data2.init_point, url: data2.init_point }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
      return new Response(JSON.stringify({ error: errMsg }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const initPoint = data.init_point;
    if (!initPoint) {
      return new Response(
        JSON.stringify({ error: "No checkout URL in response" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ init_point: initPoint, url: initPoint }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("mercadopago-subscription error:", message, e);
    return new Response(
      JSON.stringify({
        error: "Internal error",
        message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
