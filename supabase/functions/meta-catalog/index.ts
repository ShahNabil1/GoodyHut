import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeXml(str: string): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

interface VariantOption {
  id: string;
  name: string;
  price?: number | null;
  size?: string;
  weight?: string;
  min_quantity?: number | null;
  image_id?: string;
}

interface VariantGroup {
  id: string;
  name: string;
  options: VariantOption[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const siteUrl = "https://www.goodyhut.bd";

    // Fetch all products with images
    const { data: products, error: prodErr } = await supabase
      .from("products")
      .select("id, title, description, price, original_price, slug, in_stock, stock, category, variants, meta_description");

    if (prodErr) throw prodErr;

    // Fetch all product images
    const { data: allImages, error: imgErr } = await supabase
      .from("product_images")
      .select("product_id, image_url, sort_order")
      .order("sort_order", { ascending: true });

    if (imgErr) throw imgErr;

    // Fetch active deals
    const now = new Date().toISOString();
    const { data: deals } = await supabase
      .from("product_deals")
      .select("product_id, discount_percentage")
      .eq("active", true)
      .lte("start_date", now)
      .gte("end_date", now);

    const dealMap = new Map<string, number>();
    for (const d of deals || []) {
      dealMap.set(d.product_id, d.discount_percentage);
    }

    // Fetch active campaign discounts
    const { data: campaigns } = await supabase
      .from("campaigns")
      .select("id")
      .eq("active", true)
      .lte("start_date", now)
      .gte("end_date", now);

    const campaignIds = (campaigns || []).map((c) => c.id);
    let campaignMap = new Map<string, number>();
    if (campaignIds.length > 0) {
      const { data: cp } = await supabase
        .from("campaign_products")
        .select("product_id, discount_percentage")
        .in("campaign_id", campaignIds);
      for (const c of cp || []) {
        campaignMap.set(c.product_id, c.discount_percentage);
      }
    }

    // Group images by product
    const imageMap = new Map<string, string[]>();
    for (const img of allImages || []) {
      if (!imageMap.has(img.product_id)) imageMap.set(img.product_id, []);
      imageMap.get(img.product_id)!.push(img.image_url);
    }

    // Build XML items
    const items: string[] = [];

    for (const p of products || []) {
      const images = imageMap.get(p.id) || [];
      const primaryImage = images[0] || "";
      const additionalImages = images.slice(1, 11); // Max 10 additional
      const link = `${siteUrl}/product/${p.slug}`;
      const availability = p.in_stock && (p.stock === null || p.stock > 0) ? "in stock" : "out of stock";
      const description = p.meta_description || p.description || p.title;

      // Calculate best discount: Deal > Campaign
      const dealDiscount = dealMap.get(p.id) || 0;
      const campaignDiscount = campaignMap.get(p.id) || 0;
      const bestDiscount = Math.max(dealDiscount, campaignDiscount);

      const originalPrice = p.original_price || p.price;
      const salePrice = bestDiscount > 0
        ? Math.round(p.price * (1 - bestDiscount / 100))
        : p.price;

      const variants: VariantGroup[] = Array.isArray(p.variants) ? p.variants : [];
      const hasVariants = variants.length > 0 && variants.some((vg: VariantGroup) => vg.options?.length > 0);

      if (hasVariants) {
        // Generate one item per variant option
        for (const vg of variants) {
          const isColorVariant = /color|colour|strap/i.test(vg.name);
          const isSizeVariant = /size/i.test(vg.name);

          for (const opt of vg.options || []) {
            const variantId = `${p.id}_${opt.id}`;
            const variantPrice = opt.price || p.price;
            const variantOriginal = p.original_price || variantPrice;
            const variantSale = bestDiscount > 0
              ? Math.round(variantPrice * (1 - bestDiscount / 100))
              : variantPrice;

            let item = `    <item>
      <g:id>${escapeXml(variantId)}</g:id>
      <g:item_group_id>${escapeXml(p.id)}</g:item_group_id>
      <title>${escapeXml(p.title)} - ${escapeXml(opt.name)}</title>
      <description>${escapeXml(description)}</description>
      <link>${escapeXml(link)}</link>
      <g:image_link>${escapeXml(primaryImage)}</g:image_link>
${additionalImages.map((img) => `      <g:additional_image_link>${escapeXml(img)}</g:additional_image_link>`).join("\n")}
      <g:price>${variantOriginal.toFixed(2)} BDT</g:price>
      <g:sale_price>${variantSale.toFixed(2)} BDT</g:sale_price>
      <g:availability>${availability}</g:availability>
      <g:condition>new</g:condition>
      <g:brand>GoodyHut</g:brand>
      <g:product_type>${escapeXml(p.category)}</g:product_type>`;

            if (isColorVariant) {
              item += `\n      <g:color>${escapeXml(opt.name)}</g:color>`;
            }
            if (isSizeVariant || opt.size) {
              item += `\n      <g:size>${escapeXml(opt.size || opt.name)}</g:size>`;
            }

            item += `\n    </item>`;
            items.push(item);
          }
        }
      } else {
        // Single product item
        let item = `    <item>
      <g:id>${escapeXml(p.id)}</g:id>
      <title>${escapeXml(p.title)}</title>
      <description>${escapeXml(description)}</description>
      <link>${escapeXml(link)}</link>
      <g:image_link>${escapeXml(primaryImage)}</g:image_link>
${additionalImages.map((img) => `      <g:additional_image_link>${escapeXml(img)}</g:additional_image_link>`).join("\n")}
      <g:price>${originalPrice.toFixed(2)} BDT</g:price>
      <g:sale_price>${salePrice.toFixed(2)} BDT</g:sale_price>
      <g:availability>${availability}</g:availability>
      <g:condition>new</g:condition>
      <g:brand>GoodyHut</g:brand>
      <g:product_type>${escapeXml(p.category)}</g:product_type>
    </item>`;
        items.push(item);
      }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>GoodyHut Product Catalog</title>
    <link>${siteUrl}</link>
    <description>Wholesale products from China to Bangladesh</description>
${items.join("\n")}
  </channel>
</rss>`;

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("meta-catalog error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
