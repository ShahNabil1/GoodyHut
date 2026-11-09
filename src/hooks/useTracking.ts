import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getClientIp } from "@/lib/ipUtils";

declare global {
  interface Window {
    dataLayer: any[];
  }
}

// Map internal event names → Meta standard event names
const META_EVENT_MAP: Record<string, string> = {
  view_item: "ViewContent",
  add_to_cart: "AddToCart",
  begin_checkout: "InitiateCheckout",
  purchase: "Purchase",
  lead: "CompleteRegistration",
  search: "Search",
  page_view: "PageView",
};

// All events that should also fire server-side CAPI
const CAPI_EVENTS = [
  "page_view",
  "view_item",
  "add_to_cart",
  "begin_checkout",
  "purchase",
  "lead",
  "search",
];

interface TrackEventParams {
  [key: string]: any;
}

/** Read a browser cookie by name */
function getCookie(name: string): string {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : "";
}

/** Set a browser cookie */
function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/;SameSite=Lax`;
}

/** Capture Facebook & WhatsApp click IDs from URL on page load */
function captureClickIds() {
  const params = new URLSearchParams(window.location.search);

  // fbclid → _fbc cookie (format: fb.1.{timestamp}.{fbclid})
  const fbclid = params.get("fbclid");
  if (fbclid && !getCookie("_fbc")) {
    setCookie("_fbc", `fb.1.${Date.now()}.${fbclid}`, 90);
  }

  // ctwa_clid → _ctwa cookie (Click to WhatsApp ID)
  const ctwaClid = params.get("ctwa_clid");
  if (ctwaClid) {
    setCookie("_ctwa_clid", ctwaClid, 90);
  }
}

/** Generate a unique event ID for deduplication */
function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** Cached user profile for PII enrichment */
interface UserPII {
  user_id: string;
  email: string;
  phone: string;
  full_name: string;
  city: string;
  postal_code: string;
}

export function useTracking() {
  const [userPII, setUserPII] = useState<UserPII | null>(null);
  const [clientIp, setClientIp] = useState<string>("");

  // Capture click IDs & fetch client IP once on mount
  useEffect(() => {
    captureClickIds();
    getClientIp().then(ip => { if (ip) setClientIp(ip); });
  }, []);
  useEffect(() => {
    const fetchPII = async (userId: string, userEmail?: string) => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email, phone, city, postal_code")
        .eq("id", userId)
        .single();

      if (data) {
        setUserPII({
          user_id: userId,
          email: data.email || userEmail || "",
          phone: data.phone || "",
          full_name: data.full_name || "",
          city: data.city || "",
          postal_code: data.postal_code || "",
        });
      }
    };

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchPII(session.user.id, session.user.email);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          fetchPII(session.user.id, session.user.email);
        } else {
          setUserPII(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const trackEvent = useCallback(
    (eventName: string, params: TrackEventParams = {}) => {
      // Skip all tracking on admin & developer panel routes
      const path = window.location.pathname;
      if (path.startsWith("/admin") || path.startsWith("/dev")) return;

      // Generate a unique event ID for deduplication across Pixel + CAPI
      const eventId = params.event_id || generateEventId();

      // Push to dataLayer for GTM (GA4 + Meta Pixel)
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: eventName,
        event_id: eventId,
        ...params,
      });

      // Fire server-side CAPI for key conversion events
      if (CAPI_EVENTS.includes(eventName)) {
        const fbp = getCookie("_fbp");
        const fbc = getCookie("_fbc") || new URLSearchParams(window.location.search).get("fbclid")
          ? `fb.1.${Date.now()}.${new URLSearchParams(window.location.search).get("fbclid")}`
          : "";

        // Merge user PII into event data — params can override (e.g. checkout form data)
        const enrichedData: Record<string, any> = {
          ...params,
          event_id: eventId,
        };

        // Auto-attach logged-in user PII if available
        if (userPII) {
          if (!enrichedData.user_id) enrichedData.user_id = userPII.user_id;
          if (!enrichedData.email) enrichedData.email = userPII.email;
          if (!enrichedData.phone) enrichedData.phone = userPII.phone;
          if (!enrichedData.full_name) enrichedData.full_name = userPII.full_name;
          if (!enrichedData.city) enrichedData.city = userPII.city;
          if (!enrichedData.postal_code) enrichedData.postal_code = userPII.postal_code;
        }

        // Always include country
        if (!enrichedData.country) enrichedData.country = "BD";

        const ctwaClid = getCookie("_ctwa_clid");

        supabase.functions
          .invoke("meta-capi", {
            body: {
              event_name: eventName,
              event_id: eventId,
              event_source_url: window.location.href,
              event_data: enrichedData,
              user_agent: navigator.userAgent,
              client_ip: clientIp,
              fbp,
              fbc: getCookie("_fbc") || fbc,
              ...(ctwaClid ? { ctwa_clid: ctwaClid } : {}),
            },
          })
          .catch(console.error);
      }
    },
    [userPII, clientIp]
  );

  return { trackEvent };
}
