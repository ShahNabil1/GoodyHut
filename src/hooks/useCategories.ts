import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CategoryFlat {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  image_url: string | null;
  is_top?: boolean;
  sort_order?: number;
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories-all"],
    queryFn: async (): Promise<CategoryFlat[]> => {
      const { data } = await supabase
        .from("categories")
        .select("id, name, slug, parent_id, image_url, is_top, sort_order")
        .order("sort_order", { ascending: true });
      return (data || []) as CategoryFlat[];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

export function useTopCategories() {
  const { data: allCats, ...rest } = useCategories();
  const topCats = allCats?.filter(c => c.is_top) || [];
  return { data: topCats, allCats, ...rest };
}
