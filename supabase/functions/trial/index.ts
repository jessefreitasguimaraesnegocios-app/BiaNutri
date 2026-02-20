// Edge Function: trial – time-based free trial (no reset on refresh/login/device).
// Remaining = TRIAL_SECONDS_LIMIT - (now - trial_started_at). Set TRIAL_MINUTES in Supabase Secrets.
// Uses authenticated user from JWT only; body is optional. Auto-initializes trial when possible.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const TRIAL_MINUTES = Math.max(1, parseInt(Deno.env.get("TRIAL_MINUTES") ?? "30", 10));
const TRIAL_SECONDS_LIMIT = TRIAL_MINUTES * 60;

function computeRemaining(profile: {
  trial_started_at: string | null;
  trial_used_at: string | null;
}): { remaining_seconds: number; is_trial_active: boolean } {
  if (profile.trial_used_at) {
    return { remaining_seconds: 0, is_trial_active: false };
  }
  if (!profile.trial_started_at) {
    return { remaining_seconds: TRIAL_SECONDS_LIMIT, is_trial_active: false };
  }
  const startedMs = new Date(profile.trial_started_at).getTime();
  const elapsedSeconds = Math.floor((Date.now() - startedMs) / 1000);
  const remaining_seconds = Math.max(0, TRIAL_SECONDS_LIMIT - elapsedSeconds);
  return {
    remaining_seconds,
    is_trial_active: remaining_seconds > 0,
  };
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

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userId = user.id;

    let body: Record<string, unknown> = {};
    try {
      const text = await req.text();
      if (text && String(text).trim()) {
        body = JSON.parse(text) as Record<string, unknown>;
      }
    } catch (_) {
      // empty or invalid body: continue with default behavior
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // Suporta profiles com id = auth user id OU user_id = auth user id
    let profile: { phone?: string | null; trial_started_at: string | null; trial_used_at: string | null } | null = null;
    let profileKey: "id" | "user_id" = "id";

    const byId = await admin.from("profiles").select("phone, trial_started_at, trial_used_at").eq("id", userId).maybeSingle();
    if (byId.data) {
      profile = byId.data;
      profileKey = "id";
    } else {
      try {
        const byUserId = await admin.from("profiles").select("phone, trial_started_at, trial_used_at").eq("user_id", userId).maybeSingle();
        if (byUserId.data) {
          profile = byUserId.data;
          profileKey = "user_id";
        }
      } catch (_) {
        // tabela pode não ter coluna user_id
      }
    }

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const eqUserId = profileKey === "id" ? { id: userId } : { user_id: userId };

    if (profile.trial_used_at) {
      return new Response(
        JSON.stringify({
          remaining_seconds: 0,
          is_trial_active: false,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!profile.trial_started_at) {
      const now = new Date().toISOString();
      const { error: updateError } = await admin
        .from("profiles")
        .update({ trial_started_at: now, updated_at: now })
        .match(eqUserId);
      if (!updateError) {
        return new Response(
          JSON.stringify({
            remaining_seconds: TRIAL_SECONDS_LIMIT,
            is_trial_active: true,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      return new Response(
        JSON.stringify({
          remaining_seconds: TRIAL_SECONDS_LIMIT,
          is_trial_active: false,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let result = computeRemaining(profile);

    if (result.remaining_seconds <= 0) {
      const now = new Date().toISOString();
      await admin
        .from("profiles")
        .update({ trial_used_at: now, updated_at: now })
        .match(eqUserId);
      result = { remaining_seconds: 0, is_trial_active: false };
    }

    return new Response(
      JSON.stringify({
        remaining_seconds: result.remaining_seconds,
        is_trial_active: result.is_trial_active,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
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
