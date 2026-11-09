import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const JINA_API_URL = "https://api.jina.ai/v1/embeddings";
const JINA_MODEL = "jina-clip-v2";
const DIMENSIONS = 1024;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const JINA_API_KEY = Deno.env.get("JINA_API_KEY");
    if (!JINA_API_KEY) throw new Error("JINA_API_KEY not set");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { product_id, image_url, batch } = await req.json();

    if (batch) {
      const { data: images, error: imgErr } = await supabase
        .from("product_images")
        .select("product_id, image_url")
        .order("sort_order", { ascending: true });
      if (imgErr) throw imgErr;
      if (!images?.length) {
        return new Response(JSON.stringify({ message: "No products found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get first image per product
      const productImageMap: Record<string, string> = {};
      for (const img of images) {
        if (!productImageMap[img.product_id]) productImageMap[img.product_id] = img.image_url;
      }

      // Skip already-embedded products
      const { data: existing } = await supabase.from("product_embeddings").select("product_id");
      const existingIds = new Set((existing || []).map((e: { product_id: string }) => e.product_id));
      const toProcess = Object.entries(productImageMap).filter(([pid]) => !existingIds.has(pid));

      let processed = 0, failed = 0;
      for (const [pid, imgUrl] of toProcess) {
        try {
          const embedding = await getImageEmbedding(imgUrl, JINA_API_KEY);
          const { error } = await supabase.from("product_embeddings").upsert(
            { product_id: pid, embedding: `[${embedding.join(",")}]`, updated_at: new Date().toISOString() },
            { onConflict: "product_id" }
          );
          if (error) throw error;
          processed++;
        } catch (e) {
          console.error(`Failed for ${pid}:`, e);
          failed++;
        }
        await new Promise((r) => setTimeout(r, 200));
      }

      return new Response(
        JSON.stringify({ processed, failed, skipped: existingIds.size }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Single product
    if (!product_id || !image_url) throw new Error("product_id and image_url required");
    const embedding = await getImageEmbedding(image_url, JINA_API_KEY);
    const { error } = await supabase.from("product_embeddings").upsert(
      { product_id, embedding: `[${embedding.join(",")}]`, updated_at: new Date().toISOString() },
      { onConflict: "product_id" }
    );
    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, dimensions: embedding.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function getImageEmbedding(imageUrl: string, apiKey: string): Promise<number[]> {
  const res = await fetch(JINA_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: JINA_MODEL,
      dimensions: DIMENSIONS,
      normalized: true,
      embedding_type: "float",
      input: [{ image: imageUrl }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Jina API error ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  if (!data.data?.[0]?.embedding) {
    throw new Error("Unexpected Jina response: no embedding found");
  }
  return data.data[0].embedding;
}
