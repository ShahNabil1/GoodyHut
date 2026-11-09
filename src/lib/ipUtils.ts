import { supabase } from "@/integrations/supabase/client";

/** Shared promise so concurrent callers share a single fetch */
let ipPromise: Promise<string> | null = null;

/** Fetch client public IP (shared singleton promise — no duplicate calls) */
export function getClientIp(): Promise<string> {
  if (!ipPromise) {
    ipPromise = fetch("https://api.ipify.org?format=json")
      .then((res) => res.json())
      .then((data) => data?.ip || "")
      .catch(() => "");
  }
  return ipPromise;
}

/** Check if an IP is blocked */
export async function isIpBlocked(ip: string): Promise<boolean> {
  if (!ip) return false;
  const { data } = await supabase
    .from("blocked_ips")
    .select("id")
    .eq("ip_address", ip)
    .maybeSingle();
  return !!data;
}
