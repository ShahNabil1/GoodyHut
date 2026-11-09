import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Product {
  id: string;
  slug: string;
  title: string;
  price: number;
  original_price?: number | null;
  rating: number;
  reviews_count: number;
  sold_count?: number | null;
  emoji: string;
  image_url?: string;
}

export function useProducts() {
  return useQuery({
    queryKey: ["products-grid"],
    queryFn: async (): Promise<Product[]> => {
      const { data } = await supabase
        .from("products")
        .select("id, slug, title, price, original_price, rating, reviews_count, sold_count, emoji, product_images(image_url)")
        .eq("in_stock", true)
        .order("sort_order", { referencedTable: "product_images", ascending: true });
      if (!data) return [];
      return data.map((p: any) => ({
        ...p,
        image_url: p.product_images?.[0]?.image_url || null,
      }));
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
