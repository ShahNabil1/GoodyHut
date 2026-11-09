import type { VercelRequest, VercelResponse } from "@vercel/node";

const SUPABASE_URL = "https://oeyprcwaslsmucjsukbz.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9leXByY3dhc2xzbXVjanN1a2J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MDU4NDAsImV4cCI6MjA4ODM4MTg0MH0.Qvf6tqL3We3A23fGioLm0hu4YY7KNZ7Kp5_xgURpApQ";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const slug = req.query.slug as string;
  const origin = `https://${req.headers.host}`;

  if (!slug) {
    return res.redirect(302, origin);
  }

  try {
    // Fetch product
    const productRes = await fetch(
      `${SUPABASE_URL}/rest/v1/products?select=id,title,price,meta_title,meta_description,slug&slug=eq.${encodeURIComponent(slug)}&limit=1`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Accept: "application/vnd.pgrst.object+json",
        },
      }
    );

    if (!productRes.ok) {
      return res.redirect(302, `${origin}/product/${slug}`);
    }

    const product = await productRes.json();

    // Fetch first image
    const imgRes = await fetch(
      `${SUPABASE_URL}/rest/v1/product_images?select=image_url&product_id=eq.${product.id}&order=sort_order.asc&limit=1`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );

    const images = await imgRes.json();
    const ogImage = images?.[0]?.image_url || `${origin}/favicon-96x96.png`;

    const title = product.meta_title || product.title;
    const description =
      product.meta_description ||
      `Buy ${product.title} at ৳${product.price} from GoodyHut. Wholesale import from China to Bangladesh.`;
    const url = `${origin}/product/${slug}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)} - GoodyHut</title>
  <meta name="description" content="${escapeHtml(description)}" />

  <meta property="og:type" content="product" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:url" content="${escapeHtml(url)}" />
  <meta property="og:site_name" content="GoodyHut" />
  <meta property="product:price:amount" content="${product.price}" />
  <meta property="product:price:currency" content="BDT" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />

  <link rel="canonical" href="${escapeHtml(url)}" />
  <meta http-equiv="refresh" content="0;url=${escapeHtml(url)}" />
</head>
<body>
  <p>Redirecting to <a href="${escapeHtml(url)}">${escapeHtml(title)}</a>...</p>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).send(html);
  } catch {
    return res.redirect(302, `${origin}/product/${slug}`);
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
