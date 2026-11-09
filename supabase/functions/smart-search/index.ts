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

    const { query, image_base64, mode } = await req.json();
    let embedding: number[] | null = null;

    if (mode === "image" && image_base64) {
      embedding = await getImageEmbedding(image_base64, JINA_API_KEY);
    } else if (mode === "text" && query) {
      embedding = await getTextEmbedding(query, JINA_API_KEY);
    }

    // If embedding failed, fallback to text search
    if (!embedding) {
      if (mode === "text" && query) {
        return await fallbackTextSearch(supabase, query);
      }
      throw new Error("Could not generate embedding");
    }

    const embeddingStr = `[${embedding.join(",")}]`;
    const isImageSearch = mode === "image";
    const { data: matches, error: matchError } = await supabase.rpc("match_products_by_embedding", {
      query_embedding: embeddingStr,
      match_threshold: isImageSearch ? 0.25 : 0.10,
      match_count: 20,
    });

    if (matchError) {
      console.error("pgvector error:", matchError);
      if (mode === "text" && query) return await fallbackTextSearch(supabase, query);
      throw matchError;
    }

    if (!matches?.length) {
      // For text mode, try fallback if vector search returns nothing
      if (mode === "text" && query) return await fallbackTextSearch(supabase, query);
      return jsonResponse({ results: [], mode });
    }

    // Relative threshold: only keep results within 65% of the top score
    const topSimilarity = matches[0]?.similarity || 0;
    const relativeThreshold = topSimilarity * 0.65;
    const filtered = matches.filter((m: { similarity: number }) => m.similarity >= relativeThreshold);

    const matchedIds = filtered.map((m: { product_id: string }) => m.product_id);
    const { data: products } = await supabase
      .from("products")
      .select("id, title, slug, price, original_price, category, emoji")
      .in("id", matchedIds);

    const images = await fetchProductImages(supabase, matchedIds);
    const simMap = new Map(filtered.map((m: { product_id: string; similarity: number }) => [m.product_id, m.similarity]));

    const sorted = (products || [])
      .map((p: { id: string }) => ({
        ...p,
        image_url: images[p.id] || null,
        similarity: simMap.get(p.id) || 0,
      }))
      .sort((a: { similarity: number }, b: { similarity: number }) => b.similarity - a.similarity);

    return jsonResponse({ results: sorted, mode });
  } catch (error) {
    console.error("Smart search error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// --- Jina API helpers ---

async function getTextEmbedding(text: string, apiKey: string): Promise<number[] | null> {
  try {
    const res = await fetch(JINA_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: JINA_MODEL,
        dimensions: DIMENSIONS,
        normalized: true,
        embedding_type: "float",
        input: [{ text }],
      }),
    });
    if (!res.ok) {
      console.error("Jina text embedding error:", res.status, (await res.text()).slice(0, 200));
      return null;
    }
    const data = await res.json();
    return data.data?.[0]?.embedding || null;
  } catch (e) {
    console.error("Jina text embedding failed:", e);
    return null;
  }
}

async function getImageEmbedding(base64: string, apiKey: string): Promise<number[] | null> {
  try {
    // Ensure proper data URI format
    const dataUri = base64.startsWith("data:") ? base64 : `data:image/jpeg;base64,${base64.includes(",") ? base64.split(",")[1] : base64}`;

    const res = await fetch(JINA_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: JINA_MODEL,
        dimensions: DIMENSIONS,
        normalized: true,
        embedding_type: "float",
        input: [{ image: dataUri }],
      }),
    });
    if (!res.ok) {
      console.error("Jina image embedding error:", res.status, (await res.text()).slice(0, 200));
      return null;
    }
    const data = await res.json();
    return data.data?.[0]?.embedding || null;
  } catch (e) {
    console.error("Jina image embedding failed:", e);
    return null;
  }
}

// --- Helpers ---

async function fallbackTextSearch(supabase: ReturnType<typeof createClient>, query: string) {
  const { data, error } = await supabase.rpc("search_products", { search_term: query, max_results: 20 });
  if (error) throw error;
  const productIds = (data || []).map((p: { id: string }) => p.id);
  const images = await fetchProductImages(supabase, productIds);
  return jsonResponse({
    results: (data || []).map((p: { id: string }) => ({ ...p, image_url: images[p.id] || null, similarity: null })),
    mode: "fallback_text",
  });
}

async function fetchProductImages(supabase: ReturnType<typeof createClient>, ids: string[]): Promise<Record<string, string>> {
  if (!ids.length) return {};
  const { data } = await supabase.from("product_images").select("product_id, image_url").in("product_id", ids).order("sort_order", { ascending: true });
  const map: Record<string, string> = {};
  (data || []).forEach((img: { product_id: string; image_url: string }) => {
    if (!map[img.product_id]) map[img.product_id] = img.image_url;
  });
  return map;
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
