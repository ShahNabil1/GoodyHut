import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useHeroSlides() {
  return useQuery({
    queryKey: ["hero-slides"],
    queryFn: async (): Promise<string[]> => {
      const { data } = await supabase
        .from("hero_slides")
        .select("image_url")
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (data && data.length > 0) {
        return data.map(s => s.image_url).filter(url => url && url.length > 0);
      }
      return [];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}
