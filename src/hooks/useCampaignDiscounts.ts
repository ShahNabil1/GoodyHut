import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CampaignDiscount {
  product_id: string;
  discount_percentage: number;
  campaign_title: string;
}

export function useCampaignDiscounts(productIds: string[]) {
  const [campaignDiscounts, setCampaignDiscounts] = useState<CampaignDiscount[]>([]);

  useEffect(() => {
    if (!productIds.length) {
      setCampaignDiscounts([]);
      return;
    }

    const fetch = async () => {
      const now = new Date().toISOString();

      // Get active campaigns
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("id, title")
        .eq("active", true)
        .lte("start_date", now)
        .gte("end_date", now);

      if (!campaigns?.length) {
        setCampaignDiscounts([]);
        return;
      }

      const campaignIds = campaigns.map(c => c.id);

      // Get campaign products matching our product IDs
      const { data: cpData } = await supabase
        .from("campaign_products")
        .select("product_id, discount_percentage, campaign_id")
        .in("campaign_id", campaignIds)
        .in("product_id", productIds);

      if (!cpData?.length) {
        setCampaignDiscounts([]);
        return;
      }

      const results: CampaignDiscount[] = cpData.map(cp => {
        const camp = campaigns.find(c => c.id === cp.campaign_id);
        return {
          product_id: cp.product_id,
          discount_percentage: cp.discount_percentage || 0,
          campaign_title: camp?.title || "",
        };
      }).filter(d => d.discount_percentage > 0);

      setCampaignDiscounts(results);
    };

    fetch();
  }, [productIds.join(",")]);

  const getCampaignDiscount = (productId: string) =>
    campaignDiscounts.find(d => d.product_id === productId);

  return { campaignDiscounts, getCampaignDiscount };
}
