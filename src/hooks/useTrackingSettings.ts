import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TrackingSettings {
  gtm_id: string;
  ga4_id: string;
  meta_pixel_id: string;
  meta_capi_token: string;
  [key: string]: string;
}

export function useTrackingSettings() {
  return useQuery({
    queryKey: ["tracking-settings"],
    queryFn: async (): Promise<TrackingSettings> => {
      const { data } = await supabase
        .from("tracking_settings" as any)
        .select("key, value");
      
      const settings: TrackingSettings = {
        gtm_id: "",
        ga4_id: "",
        meta_pixel_id: "",
        meta_capi_token: "",
      };
      
      if (data) {
        for (const row of data as any[]) {
          settings[row.key] = row.value || "";
        }
      }
      
      return settings;
    },
    staleTime: 5 * 60 * 1000,
  });
}
