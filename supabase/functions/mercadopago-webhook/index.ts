// Edge Function: webhook do Mercado Pago (pagamento ou assinatura)
// Configurar no painel MP: URL desta função
// Requer: MERCADOPAGO_ACCESS_TOKEN (Supabase Secrets)
// Suporta: 1) Pagamento (Checkout Pro) com external_reference "userId|planId"
//          2) Assinatura (link direto) – identifica usuário pelo e-mail do pagador

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const DURATION_MONTHS: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

/** Mapeia preapproval_plan_id (MP) para plan_id do app (1 mês, 3 meses, 1 ano). */
const PREAPPROVAL_PLAN_TO_PLAN_ID: Record<string, string> = {
  "926ccca97394458e8f88b54d0d64388d": "monthly",
  "3925655a3e1e43c6984ab3d40c1bf771": "quarterly",
  "ef440dc0caf747a8a8c1face5028f644": "yearly",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
  if (!accessToken) {
    console.error("MERCADOPAGO_ACCESS_TOKEN not set");
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  let resourceId: string | null = null;
  let notificationType: string | undefined;
  try {
    const body = (await req.json()) as {
      type?: string;
      action?: string;
      data?: { id?: string };
      id?: string;
    };
    resourceId = body?.data?.id ?? body?.id ?? null;
    notificationType = body?.type ?? body?.action;
  } catch {
    const url = new URL(req.url);
    resourceId = url.searchParams.get("id");
  }
  if (!resourceId) {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, supabaseServiceKey);
  const authHeader = { Authorization: `Bearer ${accessToken}` };

  // —— 1) Tentar como pagamento (Checkout Pro com external_reference userId|planId) ——
  const paymentRes = await fetch(
    `https://api.mercadopago.com/v1/payments/${resourceId}`,
    { headers: authHeader }
  );
  if (paymentRes.ok) {
    const payment = (await paymentRes.json()) as {
      status?: string;
      external_reference?: string;
    };
    if (payment.status === "approved") {
      const ref = payment.external_reference;
      if (ref && ref.includes("|")) {
        const [userId, planId] = ref.split("|");
        const months = DURATION_MONTHS[planId] ?? 1;
        const validUntil = new Date();
        validUntil.setMonth(validUntil.getMonth() + months);
        const now = new Date().toISOString();
        const { error } = await admin
          .from("subscriptions")
          .upsert(
            {
              user_id: userId,
              plan_id: planId,
              mp_payment_id: resourceId,
              status: "active",
              valid_until: validUntil.toISOString(),
              updated_at: now,
            },
            { onConflict: "user_id", ignoreDuplicates: false }
          );
        if (error) console.error("Subscription upsert error (payment)", error);
        return new Response("ok", { status: 200, headers: corsHeaders });
      }
    }
  }

  // —— 2) Tentar como assinatura (preapproval) – link direto do plano ——
  const preapprovalRes = await fetch(
    `https://api.mercadopago.com/preapproval/${resourceId}`,
    { headers: authHeader }
  );
  if (!preapprovalRes.ok) {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  const preapproval = (await preapprovalRes.json()) as {
    status?: string;
    preapproval_plan_id?: string;
    payer_id?: string;
    payer_email?: string;
    payer?: { email?: string };
    external_reference?: string;
  };
  const status = (preapproval.status ?? "").toLowerCase();
  if (status !== "authorized" && status !== "approved") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  const planIdFromMP = preapproval.preapproval_plan_id ?? "";
  let planId = PREAPPROVAL_PLAN_TO_PLAN_ID[planIdFromMP];
  if (!planId) {
    planId = (preapproval.external_reference ?? "").includes("|")
      ? (preapproval.external_reference as string).split("|")[1]
      : "";
  }
  if (!planId || !DURATION_MONTHS[planId]) {
    console.error("Unknown preapproval_plan_id or invalid external_reference", planIdFromMP);
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  let userId: string | null = null;
  const ref = (preapproval.external_reference ?? "").trim();
  if (ref && ref.includes("|")) {
    userId = ref.split("|")[0];
  }
  if (!userId) {
    const payerEmail = (preapproval.payer_email ?? preapproval.payer?.email ?? "").trim().toLowerCase();
    if (!payerEmail) {
      console.error("No payer email or external_reference in preapproval", resourceId);
      return new Response("ok", { status: 200, headers: corsHeaders });
    }
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id")
      .ilike("email", payerEmail)
      .maybeSingle();
    if (profileError || !profile?.id) {
      console.error("User not found for email", payerEmail, profileError?.message);
      return new Response("ok", { status: 200, headers: corsHeaders });
    }
    userId = profile.id;
  }

  const months = DURATION_MONTHS[planId] ?? 1;
  const validUntil = new Date();
  validUntil.setMonth(validUntil.getMonth() + months);
  const now = new Date().toISOString();

  const { error: upsertError } = await admin
    .from("subscriptions")
    .upsert(
    {
      user_id: userId,
      plan_id: planId,
      mp_payment_id: resourceId,
      status: "active",
      valid_until: validUntil.toISOString(),
      updated_at: now,
    },
    { onConflict: "user_id", ignoreDuplicates: false }
  );

  if (upsertError) {
    console.error("Subscription upsert error (preapproval)", upsertError);
  }

  return new Response("ok", { status: 200, headers: corsHeaders });
});
