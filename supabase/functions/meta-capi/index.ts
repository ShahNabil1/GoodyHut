import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Map internal event names → Meta standard event names
const META_EVENT_MAP: Record<string, string> = {
  view_item: "ViewContent",
  add_to_cart: "AddToCart",
  begin_checkout: "InitiateCheckout",
  purchase: "Purchase",
  lead: "CompleteRegistration",
  search: "Search",
};

async function sha256(str: string): Promise<string> {
  const normalized = str.trim().toLowerCase();
  if (!normalized) return "";
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(normalized)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Hash a value only if it exists and is non-empty */
async function hashIfPresent(val: string | undefined | null): Promise<string[]> {
  if (!val || !val.trim()) return [];
  return [await sha256(val)];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      event_name,
      event_id,
      event_source_url,
      event_data = {},
      user_agent,
      client_ip,
      fbp,
      fbc,
      ctwa_clid,
    } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Log event to tracking_events table
    await supabase.from("tracking_events").insert({
      event_name,
      event_data: { ...event_data, event_id },
      session_id: event_data?.session_id || null,
      user_id: event_data?.user_id || null,
    });

    // Fetch tracking settings
    const { data: settings } = await supabase
      .from("tracking_settings")
      .select("key, value");

    const settingsMap: Record<string, string> = {};
    for (const row of settings || []) {
      settingsMap[row.key] = row.value;
    }

    const pixelId = settingsMap.meta_pixel_id;
    const capiToken = settingsMap.meta_capi_token;

    if (!pixelId || !capiToken) {
      return new Response(
        JSON.stringify({ ok: true, capi: false, reason: "No pixel ID or CAPI token configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If user_id exists, fetch profile for extended user data
    let profile: Record<string, any> | null = null;
    if (event_data?.user_id) {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email, phone, city, address, postal_code")
        .eq("id", event_data.user_id)
        .single();
      if (data) profile = data;
    }

    // Extract first/last name from full_name
    const fullName = profile?.full_name || event_data?.full_name || "";
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";

    // Build user_data with hashed Customer Information Parameters
    const userData: Record<string, any> = {};

    // Hashed fields
    const em = await hashIfPresent(profile?.email || event_data?.email);
    if (em.length) userData.em = em;

    const ph = await hashIfPresent(profile?.phone || event_data?.phone);
    if (ph.length) userData.ph = ph;

    const fn = await hashIfPresent(firstName);
    if (fn.length) userData.fn = fn;

    const ln = await hashIfPresent(lastName);
    if (ln.length) userData.ln = ln;

    const ct = await hashIfPresent(profile?.city || event_data?.city);
    // Will be enriched by geolocation below if empty

    const st = await hashIfPresent(event_data?.state);
    // Will be enriched by geolocation below if empty

    const country = await hashIfPresent(event_data?.country || "BD");
    if (country.length) userData.country = country;

    const db = await hashIfPresent(event_data?.date_of_birth);
    if (db.length) userData.db = db;

    const ge = await hashIfPresent(event_data?.gender);
    if (ge.length) userData.ge = ge;

    const zp = await hashIfPresent(profile?.postal_code || event_data?.postal_code);
    if (zp.length) userData.zp = zp;

    // External ID (hashed)
    if (event_data?.user_id) {
      userData.external_id = [await sha256(event_data.user_id)];
    }

    // Non-hashed fields (sent as-is)
    // Use client-provided IP (real user IP from browser), fall back to proxy headers
    const clientIp = client_ip ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") || "";
    if (clientIp) userData.client_ip_address = clientIp;

    // IP-based geolocation enrichment for state/city
    if (clientIp && (!ct.length || !st.length)) {
      try {
        const geoRes = await fetch(`http://ip-api.com/json/${clientIp}?fields=status,regionName,city`);
        if (geoRes.ok) {
          const geo = await geoRes.json();
          if (geo.status === "success") {
            if (!st.length && geo.regionName) {
              const geoSt = await hashIfPresent(geo.regionName);
              if (geoSt.length) userData.st = geoSt;
            }
            if (!ct.length && geo.city) {
              const geoCt = await hashIfPresent(geo.city);
              if (geoCt.length) userData.ct = geoCt;
            }
          }
        }
      } catch {
        // Geolocation is best-effort, don't block event
      }
    }
    // If we got ct/st from profile/event_data, set them
    if (ct.length && !userData.ct) userData.ct = ct;
    if (st.length && !userData.st) userData.st = st;

    userData.client_user_agent = user_agent || "server";

    if (fbc) userData.fbc = fbc;
    if (fbp) userData.fbp = fbp;

    // Click to WhatsApp ID (not hashed)
    if (ctwa_clid) userData.ctwa_clid = ctwa_clid;

    if (event_data?.subscription_id) {
      userData.subscription_id = event_data.subscription_id;
    }

    // Map to Meta standard event name
    const metaEventName = META_EVENT_MAP[event_name] || event_name;

    // Build custom_data based on event type
    const customData: Record<string, any> = {
      currency: event_data?.currency || "BDT",
    };

    if (event_data?.value !== undefined) {
      customData.value = event_data.value;
    }
    if (event_data?.content_ids?.length) {
      customData.content_ids = event_data.content_ids;
      customData.content_type = "product";
    }
    if (event_data?.item_id) {
      customData.content_ids = [event_data.item_id];
      customData.content_type = "product";
      customData.content_name = event_data.item_name || "";
      if (event_data.price) customData.value = event_data.price;
    }
    if (event_data?.search_string) {
      customData.search_string = event_data.search_string;
    }
    if (event_data?.items?.length) {
      customData.contents = event_data.items.map((i: any) => ({
        id: i.item_id,
        quantity: i.quantity || 1,
        item_price: i.price || 0,
      }));
      customData.num_items = event_data.items.length;
    }

    const eventPayload = {
      data: [
        {
          event_name: metaEventName,
          event_time: Math.floor(Date.now() / 1000),
          event_source_url: event_source_url || "",
          action_source: "website",
          event_id: event_id || crypto.randomUUID(),
          user_data: userData,
          custom_data: customData,
        },
      ],
    };

    // Send to Meta Conversions API
    const metaRes = await fetch(
      `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${capiToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventPayload),
      }
    );

    const metaResult = await metaRes.text();

    return new Response(
      JSON.stringify({ ok: true, capi: true, meta_event: metaEventName, meta_response: metaResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("meta-capi error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
