// Edge Function: sincroniza assinaturas do Mercado Pago para a tabela subscriptions.
// Usada quando o usuário toca em "Verificar assinatura" – busca no MP por payer_email e grava/atualiza no DB.
// Requer: MERCADOPAGO_ACCESS_TOKEN (Supabase Secrets)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const DURATION_MONTHS: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

const PREAPPROVAL_PLAN_TO_PLAN_ID: Record<string, string> = {
  "926ccca97394458e8f88b54d0d64388d": "monthly",
  "3925655a3e1e43c6984ab3d40c1bf771": "quarterly",
  "ef440dc0caf747a8a8c1face5028f644": "yearly",
  "6c132900137a4b349dc28d8118af5913": "yearly",
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
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payerEmail = (user.email ?? "").trim();
    if (!payerEmail) {
      return new Response(
        JSON.stringify({ error: "User email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "MERCADOPAGO_ACCESS_TOKEN not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailLower = payerEmail.trim().toLowerCase();
    const searchUrl = new URL("https://api.mercadopago.com/preapproval/search");
    searchUrl.searchParams.set("payer_email", emailLower);
    const searchRes = await fetch(searchUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!searchRes.ok) {
      const errText = await searchRes.text();
      console.error("[sync] MP search failed", searchRes.status, errText);
      return new Response(
        JSON.stringify({ error: "Mercado Pago search failed", ok: false }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let searchData = (await searchRes.json()) as {
      results?: Array<{
        id: string;
        status?: string;
        preapproval_plan_id?: string;
        external_reference?: string;
      }>;
    };
    let results = searchData.results ?? [];
    if (results.length === 0 && payerEmail.trim() !== emailLower) {
      searchUrl.searchParams.set("payer_email", payerEmail.trim());
      const res2 = await fetch(searchUrl.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });
      if (res2.ok) {
        searchData = (await res2.json()) as typeof searchData;
        results = searchData.results ?? [];
      }
    }
    console.log("[sync] MP search result", { payer_email: payerEmail, count: results.length, statuses: results.map((r) => r.status) });

    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, supabaseServiceKey);

    let synced = false;
    for (const pre of results) {
      const status = (pre.status ?? "").toLowerCase();
      if (status !== "authorized" && status !== "approved") continue;

      const planIdFromMP = pre.preapproval_plan_id ?? "";
      let planId = PREAPPROVAL_PLAN_TO_PLAN_ID[planIdFromMP];
      if (!planId && pre.external_reference && String(pre.external_reference).includes("|")) {
        planId = String(pre.external_reference).split("|")[1];
      }
      if (!planId || !DURATION_MONTHS[planId]) continue;

      const months = DURATION_MONTHS[planId];
      const validUntil = new Date();
      validUntil.setMonth(validUntil.getMonth() + months);
      const now = new Date().toISOString();

      const { error: upsertError } = await admin
        .from("subscriptions")
        .upsert(
          {
            user_id: user.id,
            plan_id: planId,
            mp_payment_id: pre.id,
            status: "active",
            valid_until: validUntil.toISOString(),
            updated_at: now,
          },
          { onConflict: "user_id", ignoreDuplicates: false }
        );

      if (!upsertError) {
        synced = true;
        console.log("[sync] Subscription synced", { user_id: user.id, plan_id: planId, preapproval_id: pre.id });
      } else {
        console.error("[sync] Upsert error", upsertError);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, synced }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("mercadopago-sync-subscription error:", message, e);
    return new Response(
      JSON.stringify({ error: "Internal error", message, ok: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
