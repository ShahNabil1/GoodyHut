import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { template_slug, phone, variables } = await req.json();

    if (!template_slug || !phone) {
      return new Response(
        JSON.stringify({ error: "template_slug and phone are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch template
    const { data: template, error: tplError } = await supabase
      .from("sms_templates")
      .select("message")
      .eq("slug", template_slug)
      .single();

    if (tplError || !template) {
      console.error("Template not found:", template_slug, tplError);
      return new Response(
        JSON.stringify({ error: `Template '${template_slug}' not found` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Replace variables in template: {name}, {order_id}, etc.
    let message = template.message;
    if (variables && typeof variables === "object") {
      for (const [key, value] of Object.entries(variables)) {
        message = message.replace(new RegExp(`\\{${key}\\}`, "g"), String(value || ""));
      }
    }

    // Format phone
    let formattedPhone = phone.replace(/\D/g, "");
    if (!formattedPhone.startsWith("880")) {
      if (formattedPhone.startsWith("0")) {
        formattedPhone = "880" + formattedPhone.slice(1);
      } else {
        formattedPhone = "880" + formattedPhone;
      }
    }

    // Send via BulkSMSBD
    const apiKey = Deno.env.get("BULKSMSBD_API_KEY");
    const senderId = Deno.env.get("BULKSMSBD_SENDER_ID");

    if (!apiKey || !senderId) {
      console.error("BulkSMSBD not configured");
      return new Response(
        JSON.stringify({ error: "SMS service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const smsUrl = `http://bulksmsbd.net/api/smsapi?api_key=${encodeURIComponent(apiKey)}&type=text&number=${formattedPhone}&senderid=${encodeURIComponent(senderId)}&message=${encodeURIComponent(message)}`;

    console.log(`Sending SMS [${template_slug}] to ${formattedPhone}`);
    const smsResponse = await fetch(smsUrl);
    const smsText = await smsResponse.text();
    console.log("BulkSMSBD response:", smsText);

    return new Response(
      JSON.stringify({ success: true, message_sent: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-order-sms error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
