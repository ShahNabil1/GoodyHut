const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://www.goodyhut.bd";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch products and categories in parallel
    const [productsRes, categoriesRes] = await Promise.all([
      supabase
        .from("products")
        .select("slug, created_at")
        .eq("in_stock", true)
        .order("created_at", { ascending: false })
        .limit(49000),
      supabase
        .from("categories")
        .select("slug, created_at")
        .order("sort_order", { ascending: true })
        .limit(500),
    ]);

    const products = productsRes.data || [];
    const categories = categoriesRes.data || [];

    // Static pages
    const staticPages = [
      { loc: "/", changefreq: "daily", priority: "1.0" },
      { loc: "/deals", changefreq: "daily", priority: "0.9" },
      { loc: "/about", changefreq: "monthly", priority: "0.5" },
      { loc: "/contact", changefreq: "monthly", priority: "0.5" },
      { loc: "/how-it-works", changefreq: "monthly", priority: "0.6" },
      { loc: "/shipping-info", changefreq: "monthly", priority: "0.5" },
      { loc: "/help", changefreq: "monthly", priority: "0.4" },
      { loc: "/customs-guide", changefreq: "monthly", priority: "0.4" },
      { loc: "/privacy-policy", changefreq: "yearly", priority: "0.3" },
      { loc: "/terms-of-service", changefreq: "yearly", priority: "0.3" },
      { loc: "/returns-policy", changefreq: "yearly", priority: "0.3" },
    ];

    const today = new Date().toISOString().split("T")[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

    // Static pages
    for (const page of staticPages) {
      xml += `  <url>
    <loc>${SITE_URL}${page.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
    }

    // Category pages
    for (const cat of categories) {
      const lastmod = cat.created_at
        ? new Date(cat.created_at).toISOString().split("T")[0]
        : today;
      xml += `  <url>
    <loc>${SITE_URL}/category/${cat.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
    }

    // Product pages
    for (const product of products) {
      const lastmod = product.created_at
        ? new Date(product.created_at).toISOString().split("T")[0]
        : today;
      xml += `  <url>
    <loc>${SITE_URL}/product/${product.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
    }

    xml += `</urlset>`;

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (error) {
    console.error("Sitemap generation error:", error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`,
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/xml; charset=utf-8",
        },
        status: 500,
      }
    );
  }
});
