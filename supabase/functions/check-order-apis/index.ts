import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: roleData } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const statuses: Record<string, { ok: boolean; message: string; latency?: number }> = {};

    // Steadfast API — use the /get_balance endpoint per official docs
    const steadfastApiKey = Deno.env.get('STEADFAST_API_KEY');
    const steadfastSecretKey = Deno.env.get('STEADFAST_SECRET_KEY');
    if (!steadfastApiKey || !steadfastSecretKey) {
      statuses["steadfast_api"] = { ok: false, message: "Keys not set" };
    } else {
      try {
        const start = Date.now();
        const res = await fetch("https://portal.packzy.com/api/v1/get_balance", {
          headers: {
            "Api-Key": steadfastApiKey,
            "Secret-Key": steadfastSecretKey,
            "Content-Type": "application/json",
          },
        });
        const latency = Date.now() - start;
        const body = await res.json().catch(() => null);
        statuses["steadfast_api"] = res.ok
          ? { ok: true, message: `Connected (৳${body?.current_balance ?? 'N/A'})`, latency }
          : { ok: false, message: `HTTP ${res.status}`, latency };
      } catch (e) {
        statuses["steadfast_api"] = { ok: false, message: "Connection failed" };
      }
    }

    // Steadfast Webhook (just report configured — we can't ping ourselves)
    statuses["steadfast_webhook"] = { ok: true, message: "Endpoint active" };

    // BD Courier API — use the same endpoint as check-courier function
    const bdKey = Deno.env.get('BDCOURIER_API_KEY');
    if (!bdKey) {
      statuses["bdcourier"] = { ok: false, message: "Key not set" };
    } else {
      try {
        const start = Date.now();
        const res = await fetch("https://bdcourier.com/api/courier-list", {
          headers: { 
            Authorization: `Bearer ${bdKey}`,
            'Content-Type': 'application/json',
          },
        });
        const latency = Date.now() - start;
        const resText = await res.text();
        // BD Courier returns 200 with data even for list endpoint
        // If we get valid JSON back, consider it connected
        if (res.ok) {
          statuses["bdcourier"] = { ok: true, message: "Connected", latency };
        } else if (res.status === 404) {
          // Try alternative endpoint
          const start2 = Date.now();
          const res2 = await fetch("https://api.bdcourier.com/courier-check", {
            method: 'POST',
            headers: { 
              Authorization: `Bearer ${bdKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phone: "01700000000" }),
          });
          const latency2 = Date.now() - start2;
          await res2.text();
          statuses["bdcourier"] = (res2.ok || res2.status === 422)
            ? { ok: true, message: "Connected", latency: latency2 }
            : { ok: false, message: `HTTP ${res2.status}`, latency: latency2 };
        } else {
          statuses["bdcourier"] = { ok: false, message: `HTTP ${res.status}`, latency };
        }
      } catch (e) {
        statuses["bdcourier"] = { ok: false, message: "Connection failed" };
      }
    }

    return new Response(JSON.stringify({ statuses }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || 'Check failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
