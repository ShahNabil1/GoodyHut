import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DEVELOPER_EMAILS = ["dev.goodyhut@gmail.com", "shahriarnabil94@gmail.com"];

const ALLOWED_KEYS = [
  "STEADFAST_API_KEY", "STEADFAST_SECRET_KEY",
  "BDCOURIER_API_KEY",
  "BULKSMSBD_API_KEY", "BULKSMSBD_SENDER_ID",
  "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET",
  "GEMINI_API_KEY", "JINA_API_KEY", "RESEND_API_KEY", "RESEND_WEBHOOK_SECRET", "HUGGINGFACE_API_TOKEN",
];

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
    if (authError || !user || !DEVELOPER_EMAILS.includes(user.email || "")) {
      return new Response(JSON.stringify({ error: 'Access denied — developer only' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, key, value } = await req.json();
    const projectRef = Deno.env.get('SUPABASE_URL')!.match(/https:\/\/([^.]+)/)?.[1];
    const managementToken = Deno.env.get('SB_MANAGEMENT_TOKEN');

    if (!managementToken) {
      return new Response(JSON.stringify({ error: 'SB_MANAGEMENT_TOKEN not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'list') {
      const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/secrets`, {
        headers: { Authorization: `Bearer ${managementToken}` },
      });
      const secrets = await res.json();

      if (!Array.isArray(secrets)) {
        return new Response(JSON.stringify({ error: 'Failed to fetch secrets', details: secrets }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const filtered = secrets
        .filter((s: any) => ALLOWED_KEYS.includes(s.name))
        .map((s: any) => ({
          name: s.name,
          value: s.value ? s.value.slice(0, 4) + "•".repeat(Math.max(0, s.value.length - 8)) + s.value.slice(-4) : "",
        }));

      return new Response(JSON.stringify({ secrets: filtered }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'set') {
      if (!key || !value) {
        return new Response(JSON.stringify({ error: 'Key and value required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!ALLOWED_KEYS.includes(key)) {
        return new Response(JSON.stringify({ error: 'This key cannot be managed' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/secrets`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${managementToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([{ name: key, value }]),
      });

      if (!res.ok) {
        const errText = await res.text();
        return new Response(JSON.stringify({ error: `Failed to set secret: ${errText}` }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check connection status for each service
    if (action === 'check-status') {
      const statuses: Record<string, { ok: boolean; message: string; latency?: number }> = {};

      // Steadfast Courier
      try {
        const steadfastApiKey = Deno.env.get('STEADFAST_API_KEY');
        const steadfastSecretKey = Deno.env.get('STEADFAST_SECRET_KEY');
        if (!steadfastApiKey || !steadfastSecretKey) {
          statuses["Steadfast Courier"] = { ok: false, message: "Keys not set" };
        } else {
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
          statuses["Steadfast Courier"] = res.ok
            ? { ok: true, message: `Connected (৳${body?.current_balance ?? 'N/A'})`, latency }
            : { ok: false, message: `HTTP ${res.status}`, latency };
        }
      } catch (e) {
        statuses["Steadfast Courier"] = { ok: false, message: e.message || "Connection failed" };
      }

      // BD Courier
      try {
        const bdKey = Deno.env.get('BDCOURIER_API_KEY');
        if (!bdKey) {
          statuses["BD Courier"] = { ok: false, message: "Key not set" };
        } else {
          const start = Date.now();
          const res = await fetch("https://bdcourier.com/api/courier-list", {
            headers: { 
              Authorization: `Bearer ${bdKey}`,
              'Content-Type': 'application/json',
            },
          });
          const latency = Date.now() - start;
          await res.text();
          if (res.ok) {
            statuses["BD Courier"] = { ok: true, message: "Connected", latency };
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
            statuses["BD Courier"] = (res2.ok || res2.status === 422)
              ? { ok: true, message: "Connected", latency: latency2 }
              : { ok: false, message: `HTTP ${res2.status}`, latency: latency2 };
          } else {
            statuses["BD Courier"] = { ok: false, message: `HTTP ${res.status}`, latency };
          }
        }
      } catch (e) {
        statuses["BD Courier"] = { ok: false, message: e.message || "Connection failed" };
      }

      // BulkSMSBD
      try {
        const smsKey = Deno.env.get('BULKSMSBD_API_KEY');
        const senderId = Deno.env.get('BULKSMSBD_SENDER_ID');
        if (!smsKey || !senderId) {
          statuses["BulkSMSBD"] = { ok: false, message: "Keys not set" };
        } else {
          const start = Date.now();
          const res = await fetch(`https://bulksmsbd.net/api/getBalanceApi?api_key=${smsKey}`);
          const latency = Date.now() - start;
          const body = await res.json().catch(() => null);
          statuses["BulkSMSBD"] = res.ok && body
            ? { ok: true, message: `Balance: ${body?.balance ?? 'N/A'} BDT`, latency }
            : { ok: false, message: `HTTP ${res.status}`, latency };
        }
      } catch (e) {
        statuses["BulkSMSBD"] = { ok: false, message: e.message || "Connection failed" };
      }

      // Cloudinary
      try {
        const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME');
        const apiKey = Deno.env.get('CLOUDINARY_API_KEY');
        const apiSecret = Deno.env.get('CLOUDINARY_API_SECRET');
        if (!cloudName || !apiKey || !apiSecret) {
          statuses["Cloudinary"] = { ok: false, message: "Keys not set" };
        } else {
          const start = Date.now();
          const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/usage`, {
            headers: {
              Authorization: "Basic " + btoa(`${apiKey}:${apiSecret}`),
            },
          });
          const latency = Date.now() - start;
          await res.text();
          statuses["Cloudinary"] = res.ok
            ? { ok: true, message: "Connected", latency }
            : { ok: false, message: `HTTP ${res.status}`, latency };
        }
      } catch (e) {
        statuses["Cloudinary"] = { ok: false, message: e.message || "Connection failed" };
      }

      // Google Gemini
      try {
        const geminiKey = Deno.env.get('GEMINI_API_KEY');
        if (!geminiKey) {
          statuses["Google Gemini"] = { ok: false, message: "Key not set" };
        } else {
          const start = Date.now();
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`);
          const latency = Date.now() - start;
          statuses["Google Gemini"] = res.ok
            ? { ok: true, message: "Connected", latency }
            : { ok: false, message: `HTTP ${res.status}`, latency };
        }
      } catch (e) {
        statuses["Google Gemini"] = { ok: false, message: e.message || "Connection failed" };
      }

      // Jina AI
      try {
        const jinaKey = Deno.env.get('JINA_API_KEY');
        if (!jinaKey) {
          statuses["Jina AI"] = { ok: false, message: "Key not set" };
        } else {
          const start = Date.now();
          const res = await fetch("https://api.jina.ai/v1/embeddings", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${jinaKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ model: "jina-embeddings-v3", input: ["test"], dimensions: 128 }),
          });
          const latency = Date.now() - start;
          statuses["Jina AI"] = (res.ok || res.status === 200)
            ? { ok: true, message: "Connected", latency }
            : { ok: false, message: `HTTP ${res.status}`, latency };
        }
      } catch (e) {
        statuses["Jina AI"] = { ok: false, message: e.message || "Connection failed" };
      }

      // Resend Email
      try {
        const resendKey = Deno.env.get('RESEND_API_KEY');
        if (!resendKey) {
          statuses["Resend Email"] = { ok: false, message: "Key not set" };
        } else {
          const start = Date.now();
          const res = await fetch("https://api.resend.com/domains", {
            headers: { Authorization: `Bearer ${resendKey}` },
          });
          const latency = Date.now() - start;
          const body = await res.json().catch(() => null);
          const domainCount = body?.data?.length ?? 0;
          statuses["Resend Email"] = res.ok
            ? { ok: true, message: `Connected (${domainCount} domain${domainCount !== 1 ? 's' : ''})`, latency }
            : { ok: false, message: `HTTP ${res.status}`, latency };
        }
      } catch (e) {
        statuses["Resend Email"] = { ok: false, message: e.message || "Connection failed" };
      }

      // Hugging Face
      try {
        const hfToken = Deno.env.get('HUGGINGFACE_API_TOKEN');
        if (!hfToken) {
          statuses["Hugging Face"] = { ok: false, message: "Token not set" };
        } else {
          const start = Date.now();
          const res = await fetch("https://huggingface.co/api/whoami-v2", {
            headers: { Authorization: `Bearer ${hfToken}` },
          });
          const latency = Date.now() - start;
          const body = await res.json().catch(() => null);
          statuses["Hugging Face"] = res.ok
            ? { ok: true, message: `Connected (${body?.name || 'OK'})`, latency }
            : { ok: false, message: `HTTP ${res.status}`, latency };
        }
      } catch (e) {
        statuses["Hugging Face"] = { ok: false, message: e.message || "Connection failed" };
      }

      return new Response(JSON.stringify({ statuses }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Dev secrets error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
