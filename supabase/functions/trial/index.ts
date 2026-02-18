// Edge Function: trial – inicia trial e incrementa tempo de uso
// Requer Authorization: Bearer <user_jwt>
// Duração do trial: defina TRIAL_MINUTES no Supabase (Edge Function secrets) ou altere o fallback abaixo.
// Mantenha o mesmo valor em constants/plans.ts (TRIAL_MINUTES) no app.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Deve coincidir com constants/plans.ts (TRIAL_MINUTES). Defina TRIAL_MINUTES no Supabase Secrets para sobrescrever.
const TRIAL_MINUTES = Math.max(1, parseInt(Deno.env.get("TRIAL_MINUTES") ?? "30", 10));
const TRIAL_SECONDS_LIMIT = TRIAL_MINUTES * 60;

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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: userError } = await authClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey);
    const body = (await req.json()) as { action: string; user_id?: string; seconds?: number };
    const userId = body.user_id ?? user.id;
    if (userId !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "start") {
      const { data: profile, error: fetchError } = await admin
        .from("profiles")
        .select("phone, trial_started_at, trial_used_at")
        .eq("id", userId)
        .single();

      if (fetchError || !profile) {
        return new Response(JSON.stringify({ error: "Profile not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const phone = profile.phone as string | null;
      if (!phone || phone.trim() === "") {
        return new Response(JSON.stringify({ error: "phone_required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (profile.trial_used_at) {
        return new Response(
          JSON.stringify({
            error: "trial_already_used",
            trial_seconds_used: 0,
            trial_used_at: profile.trial_used_at,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { data: other } = await admin
        .from("profiles")
        .select("id")
        .eq("phone", phone.trim())
        .not("trial_used_at", "is", null)
        .neq("id", userId)
        .limit(1);
      if (other && other.length > 0) {
        return new Response(JSON.stringify({ error: "phone_already_used" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const now = new Date().toISOString();
      const { error: updateError } = await admin
        .from("profiles")
        .update({
          trial_started_at: now,
          trial_seconds_used: 0,
          updated_at: now,
        })
        .eq("id", userId);

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          trial_started_at: now,
          trial_seconds_used: 0,
          trial_used_at: null,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (body.action === "increment") {
      const seconds = Math.min(
        Math.max(0, Math.floor(Number(body.seconds) || 0)),
        300
      );
      if (seconds <= 0) {
        return new Response(
          JSON.stringify({ error: "seconds must be between 1 and 300" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { data: profile, error: fetchError } = await admin
        .from("profiles")
        .select("trial_started_at, trial_seconds_used, trial_used_at")
        .eq("id", userId)
        .single();

      if (fetchError || !profile) {
        return new Response(JSON.stringify({ error: "Profile not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (profile.trial_used_at) {
        return new Response(
          JSON.stringify({
            trial_seconds_used: profile.trial_seconds_used ?? 0,
            trial_used_at: profile.trial_used_at,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (!profile.trial_started_at) {
        return new Response(JSON.stringify({ error: "trial_not_started" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const current = (profile.trial_seconds_used ?? 0) + seconds;
      const now = new Date().toISOString();
      const usedAt = current >= TRIAL_SECONDS_LIMIT ? now : null;
      const finalSeconds = Math.min(current, TRIAL_SECONDS_LIMIT);

      const { error: updateError } = await admin
        .from("profiles")
        .update({
          trial_seconds_used: finalSeconds,
          trial_used_at: usedAt,
          updated_at: now,
        })
        .eq("id", userId);

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          trial_seconds_used: finalSeconds,
          trial_used_at: usedAt,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("trial function error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
