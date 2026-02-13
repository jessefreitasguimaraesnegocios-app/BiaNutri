// Edge Function: cria assinatura (preapproval) via API com external_reference = userId|planId
// O webhook identifica o usuário 100% pelo ID, sem depender de e-mail
// Requer: MERCADOPAGO_ACCESS_TOKEN (Supabase Secrets)

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

  const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
  if (!accessToken) {
    return new Response(
      JSON.stringify({
        error: "MERCADOPAGO_ACCESS_TOKEN not configured",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const body = (await req.json()) as {
    user_id: string;
    plan_id: string;
    back_url?: string;
  };
  if (body.user_id !== user.id) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const planId = body.plan_id as string;
  const preapprovalPlanId = PREAPPROVAL_PLAN_IDS[planId];
  if (!preapprovalPlanId) {
    return new Response(JSON.stringify({ error: "Invalid plan_id" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const externalReference = `${body.user_id}|${planId}`;
  const payerEmail = (user.email ?? "").trim();
  if (!payerEmail) {
    return new Response(
      JSON.stringify({ error: "User email is required for subscription" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const preapprovalBody = {
    preapproval_plan_id: preapprovalPlanId,
    reason: PLAN_REASONS[planId] ?? `BiaNutri - ${planId}`,
    external_reference: externalReference,
    payer_email: payerEmail,
    back_url: body.back_url || undefined,
  };

  const res = await fetch("https://api.mercadopago.com/preapproval", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(preapprovalBody),
  });

  const data = (await res.json()) as {
    init_point?: string;
    id?: string;
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    return new Response(
      JSON.stringify({
        error: data.message || data.error || "Mercado Pago error",
      }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const initPoint = data.init_point;
  if (!initPoint) {
    return new Response(
      JSON.stringify({ error: "No checkout URL in response" }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  return new Response(
    JSON.stringify({ init_point: initPoint, url: initPoint }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
