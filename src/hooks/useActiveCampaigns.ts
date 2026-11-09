import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CampaignProduct {
  id: string;
  discount_percentage: number;
  product: {
    id: string;
    title: string;
    slug: string;
    price: number;
    original_price: number | null;
    emoji: string | null;
    rating: number | null;
    sold_count: number | null;
    images: { image_url: string }[];
  };
}

interface Campaign {
  id: string;
  title: string;
  banner_image_url: string | null;
  end_date: string;
  products: CampaignProduct[];
}

export function useActiveCampaigns() {
  return useQuery({
    queryKey: ["active-campaigns"],
    queryFn: async (): Promise<Campaign[]> => {
      const now = new Date().toISOString();
      const { data: campaignData } = await supabase
        .from("campaigns")
        .select("id, title, banner_image_url, end_date")
        .eq("active", true)
        .lte("start_date", now)
        .gte("end_date", now);

      if (!campaignData?.length) return [];

      // Fetch all campaign products in one query
      const campaignIds = campaignData.map(c => c.id);
      const { data: allCpData } = await supabase
        .from("campaign_products")
        .select("id, discount_percentage, product_id, campaign_id")
        .in("campaign_id", campaignIds);

      if (!allCpData?.length) return [];

      // Fetch all products in one query
      const productIds = [...new Set(allCpData.map(cp => cp.product_id))];
      const [productsRes, imagesRes] = await Promise.all([
        supabase.from("products").select("id, title, slug, price, original_price, emoji, rating, sold_count").in("id", productIds),
        supabase.from("product_images").select("product_id, image_url, sort_order").in("product_id", productIds).order("sort_order", { ascending: true }),
      ]);

      const products = productsRes.data || [];
      const images = imagesRes.data || [];

      return campaignData.map(camp => {
        const cpItems = allCpData.filter(cp => cp.campaign_id === camp.id);
        const campaignProducts: CampaignProduct[] = cpItems
          .map(cp => {
            const prod = products.find(p => p.id === cp.product_id);
            if (!prod) return null;
            const prodImages = images.filter(img => img.product_id === cp.product_id);
            return {
              id: cp.id,
              discount_percentage: cp.discount_percentage || 0,
              product: { ...prod, images: prodImages },
            };
          })
          .filter(Boolean) as CampaignProduct[];

        return { ...camp, products: campaignProducts };
      }).filter(c => c.products.length > 0);
    },
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
