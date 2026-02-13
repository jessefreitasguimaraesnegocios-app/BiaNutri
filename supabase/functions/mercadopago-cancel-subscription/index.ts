// Edge Function: cancela assinatura no Mercado Pago e marca como cancelada no Supabase
// Requer: MERCADOPAGO_ACCESS_TOKEN (Supabase Secrets)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

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
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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

  const body = (await req.json()) as { user_id?: string };
  if (body.user_id !== user.id) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, supabaseServiceKey);
  const { data: sub, error: subError } = await admin
    .from("subscriptions")
    .select("id, status, mp_payment_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (subError || !sub) {
    return new Response(
      JSON.stringify({ error: "Assinatura não encontrada" }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  if ((sub.status as string) === "cancelled") {
    return new Response(
      JSON.stringify({ ok: true, message: "Assinatura já estava cancelada" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
  const preapprovalId = (sub as { mp_payment_id?: string | null }).mp_payment_id;

  if (accessToken && preapprovalId) {
    const putRes = await fetch(
      `https://api.mercadopago.com/preapproval/${preapprovalId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status: "cancelled" }),
      }
    );
    if (!putRes.ok) {
      const errData = (await putRes.json()) as { message?: string };
      console.error("MP cancel preapproval failed", putRes.status, errData);
      // Continua e marca como cancelada no nosso lado mesmo se o MP falhar (ex.: já cancelou no painel)
    }
  }

  const now = new Date().toISOString();
  const { error: updateError } = await admin
    .from("subscriptions")
    .update({
      status: "cancelled",
      valid_until: now,
      updated_at: now,
    })
    .eq("user_id", user.id);

  if (updateError) {
    console.error("Subscription update error", updateError);
    return new Response(
      JSON.stringify({ error: "Erro ao atualizar assinatura" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  return new Response(
    JSON.stringify({ ok: true, message: "Assinatura cancelada" }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
