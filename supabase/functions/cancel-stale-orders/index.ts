import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Find pending_payment orders older than 6 hours
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

    const { data: staleOrders, error: fetchError } = await supabase
      .from('orders')
      .select('id, wallet_amount_used, user_id, notes')
      .eq('status', 'pending_payment')
      .lt('created_at', sixHoursAgo);

    if (fetchError) {
      console.error('Error fetching stale orders:', fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!staleOrders || staleOrders.length === 0) {
      return new Response(JSON.stringify({ message: 'No stale orders found', cancelled: 0 }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let cancelledCount = 0;

    for (const order of staleOrders) {
      // Cancel the order and mark as auto-cancelled
      await supabase.from('orders').update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
        notes: [order.notes, '[AUTO-CANCELLED]'].filter(Boolean).join(' '),
      }).eq('id', order.id);

      // Add status history
      await supabase.from('order_status_history').insert({
        order_id: order.id,
        status: 'cancelled',
        note: 'Auto-cancelled: payment not submitted within 6 hours.',
      });

      // Note: wallet is NOT debited at pending_payment stage, so no refund needed

      cancelledCount++;
    }

    console.log(`Auto-cancelled ${cancelledCount} stale pending_payment orders`);

    return new Response(JSON.stringify({ message: 'Done', cancelled: cancelledCount }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Cancel stale orders error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
