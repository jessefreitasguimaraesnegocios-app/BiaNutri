# Deploy da Edge Function check-admin pelo Dashboard

O comando `npx supabase functions deploy check-admin` pode retornar **403 Forbidden** (permissão do projeto/conta). Use o **Dashboard** do Supabase para publicar a função.

## Passos

1. Acesse [Supabase Dashboard](https://app.supabase.com) e abra o projeto **lypnxkbbxeagehrqpuoj** (ou o seu).
2. No menu lateral: **Edge Functions**.
3. Clique em **Create a new function**.
4. **Name:** `check-admin` (exatamente esse nome).
5. Cole o código abaixo em **Function code** (substitua o conteúdo padrão).
6. Clique em **Deploy**.

## Código da função (copie tudo)

```ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      return new Response(JSON.stringify({ error: "Authorization header required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);
    if (userError || !user?.email) {
      return new Response(JSON.stringify({ isAdmin: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const email = String(user.email).trim().toLowerCase();
    const admin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: rows } = await admin.from("admin_emails").select("email");
    const isAdmin = Array.isArray(rows) && rows.some(
      (r: { email?: string }) => String(r?.email ?? "").trim().toLowerCase() === email
    );
    return new Response(JSON.stringify({ isAdmin }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("check-admin error:", err);
    return new Response(JSON.stringify({ isAdmin: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

Depois do deploy, a URL da função será algo como:
`https://lypnxkbbxeagehrqpuoj.supabase.co/functions/v1/check-admin`

O app já chama essa URL; não é preciso alterar nada no código.
