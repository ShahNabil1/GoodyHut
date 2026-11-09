import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Map Steadfast statuses to our order statuses
const statusMap: Record<string, string> = {
  in_review: 'out_for_delivery',
  pending: 'handed_to_steadfast',
  delivered: 'delivered',
  partial_delivered: 'delivered',
  cancelled: 'cancelled',
  unknown: 'handed_to_steadfast',
  hold: 'handed_to_steadfast',
  picked: 'out_for_delivery',
  on_the_way: 'out_for_delivery',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('Steadfast webhook received:', JSON.stringify(body));

    const { tracking_code, status, note, invoice, consignment_id } = body;

    if (!tracking_code && !invoice) {
      return new Response(JSON.stringify({ error: 'No tracking_code or invoice provided' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Find the order by tracking number
    let query = supabase.from('orders').select('id, status').limit(1);
    if (tracking_code) {
      query = query.eq('tracking_number', tracking_code);
    }

    const { data: orders, error: findError } = await query;
    if (findError || !orders || orders.length === 0) {
      console.log('Order not found for tracking:', tracking_code);
      return new Response(JSON.stringify({ message: 'Order not found', tracking_code }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const order = orders[0];

    // Log the webhook event without auto-updating order status
    // Status is managed manually by admins
    console.log(`Steadfast webhook for order ${order.id}: status=${status}, note=${note}`);

    return new Response(JSON.stringify({ success: true, order_id: order.id, mapped_status: mappedStatus }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Steadfast webhook error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
