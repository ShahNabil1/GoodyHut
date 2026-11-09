import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const STEADFAST_BASE_URL = 'https://portal.packzy.com/api/v1';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin auth
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

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { invoice, recipient_name, recipient_phone, recipient_address, cod_amount, note, order_id } = await req.json();

    if (!recipient_name || !recipient_phone || !recipient_address || cod_amount === undefined) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('STEADFAST_API_KEY');
    const secretKey = Deno.env.get('STEADFAST_SECRET_KEY');
    if (!apiKey || !secretKey) {
      return new Response(JSON.stringify({ error: 'Steadfast API keys not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch(`${STEADFAST_BASE_URL}/create_order`, {
      method: 'POST',
      headers: {
        'Api-Key': apiKey,
        'Secret-Key': secretKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        invoice: invoice || order_id?.slice(0, 8).toUpperCase(),
        recipient_name,
        recipient_phone,
        recipient_address,
        cod_amount: Number(cod_amount),
        note: note || '',
      }),
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error('Steadfast non-JSON response:', responseText);
      return new Response(JSON.stringify({ error: responseText || 'Steadfast returned an invalid response' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If successful, update order with tracking info
    if (data.status === 200 && data.consignment && order_id) {
      await supabase.from('orders').update({
        tracking_number: data.consignment.tracking_code,
        status: 'pickup_requested',
        updated_at: new Date().toISOString(),
      }).eq('id', order_id);

      await supabase.from('order_status_history').insert({
        order_id,
        status: 'pickup_requested',
        note: `Sent to Steadfast — Tracking: ${data.consignment.tracking_code}, Consignment ID: ${data.consignment.consignment_id}`,
      });
    }

    return new Response(JSON.stringify(data), {
      status: response.ok ? 200 : response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Steadfast API error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
