import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ProductDeal {
  id: string;
  product_id: string;
  deal_type: string;
  discount_percentage: number;
  label: string;
  start_date: string;
  end_date: string;
  active: boolean;
}

export function useProductDeals(productIds: string[]) {
  const [deals, setDeals] = useState<ProductDeal[]>([]);

  useEffect(() => {
    if (!productIds.length) { setDeals([]); return; }

    const fetchDeals = async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("product_deals")
        .select("*")
        .eq("active", true)
        .lte("start_date", now)
        .gte("end_date", now)
        .in("product_id", productIds);
      setDeals((data as ProductDeal[]) || []);
    };
    fetchDeals();
  }, [productIds.join(",")]);

  const getDeal = (productId: string) =>
    deals.find(d => d.product_id === productId);

  return { deals, getDeal };
}

export function useActiveDeals() {
  const [deals, setDeals] = useState<(ProductDeal & { product: any })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("product_deals")
        .select("*")
        .eq("active", true)
        .lte("start_date", now)
        .gte("end_date", now);

      if (!data?.length) { setDeals([]); setLoading(false); return; }

      const productIds = data.map(d => d.product_id);
      const { data: products } = await supabase
        .from("products")
        .select("id, title, slug, price, original_price, rating, sold_count, emoji")
        .in("id", productIds);

      const { data: images } = await supabase
        .from("product_images")
        .select("product_id, image_url, sort_order")
        .in("product_id", productIds)
        .order("sort_order", { ascending: true });

      const result = data.map(deal => {
        const prod = products?.find(p => p.id === deal.product_id);
        const img = images?.find(i => i.product_id === deal.product_id);
        return {
          ...deal,
          product: prod ? { ...prod, image_url: img?.image_url || null } : null,
        };
      }).filter(d => d.product);

      setDeals(result as any);
      setLoading(false);
    };
    fetch();
  }, []);

  return { deals, loading };
}
