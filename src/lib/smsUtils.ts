import { supabase } from "@/integrations/supabase/client";

/**
 * Send an order notification SMS using a template slug.
 * This is fire-and-forget — errors are logged but not thrown.
 */
export async function sendOrderSms(
  templateSlug: string,
  phone: string,
  variables: Record<string, string | number>
) {
  if (!phone) return;

  try {
    const { error } = await supabase.functions.invoke("send-order-sms", {
      body: {
        template_slug: templateSlug,
        phone,
        variables,
      },
    });
    if (error) console.error(`SMS [${templateSlug}] failed:`, error);
  } catch (e) {
    console.error(`SMS [${templateSlug}] error:`, e);
  }
}
