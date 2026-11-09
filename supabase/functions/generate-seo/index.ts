import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an SEO expert for GoodyHut — a China-to-Bangladesh B2B import and e-commerce platform. GoodyHut imports high-quality products directly from China and sells them in Bangladesh at competitive wholesale and retail prices. Your target audience includes both B2B wholesale importers and regular e-commerce retail customers in Bangladesh.

Generate highly optimized SEO content that appeals to both audiences. Consider import quality, competitive pricing, wholesale availability, and China-sourced product advantages.`;

function getFieldPrompt(field: string): string {
  switch (field) {
    case "meta_title":
      return `Generate a single SEO-optimized meta title in English only.
Rules:
- STRICTLY under 55 characters (hard limit, count carefully before responding)
- Include the product name and one key selling point
- Keep it short and punchy — do NOT try to fit too many words
- Do NOT end with "| GoodyHut" if the title is already near 50 characters
- Do NOT use quotes around the title
- Do NOT add any explanation, prefix, or label

Example good titles (notice how short they are):
- "TWS Earbuds Pro - Best Price in Bangladesh"
- "Wholesale Gaming Keyboard | GoodyHut"

Return ONLY the meta title text. Nothing else.`;

    case "meta_description":
      return `Generate a single SEO-optimized meta description in English only.
Rules:
- Maximum 155 characters (strict limit, count carefully)
- Highlight product benefits, China import quality, and competitive pricing
- Include a call-to-action (e.g., "Order now", "Shop today", "Buy wholesale")
- Target both B2B importers and retail buyers in Bangladesh
- Do NOT use quotes

Return ONLY the meta description text, nothing else. No explanation, no prefix.`;

    case "search_tags":
      return `Generate search tags for this product. You MUST include BOTH English AND Bengali tags.

CRITICAL RULES:
- Generate exactly 25-30 tags total
- At least 12 tags MUST be in English
- At least 10 tags MUST be in Bengali (বাংলা)
- Bengali tags must use correct standard Bengali spelling (শুদ্ধ বানান)
- Each tag should be 1-4 words
- Separate all tags with commas

REQUIRED English tags: product name, category, "wholesale", "import from china", "best price BD", brand name, product type in English
REQUIRED Bengali tags: product name in Bengali, "পাইকারি", "চায়না ইম্পোর্ট", "সেরা দাম", category in Bengali, "আমদানি পণ্য", "বাংলাদেশ"

Example output format:
wireless earbuds, bluetooth headphones, wholesale earbuds, import from china, best price BD, TWS earbuds, ওয়্যারলেস ইয়ারবাড, ব্লুটুথ হেডফোন, পাইকারি ইয়ারবাড, চায়না ইম্পোর্ট, সেরা দাম, আমদানি পণ্য

Return ONLY the comma-separated tags. No explanation, no prefix, no numbering.`;


    default:
      return "Generate SEO content for this product.";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const HF_TOKEN = Deno.env.get("HUGGINGFACE_API_TOKEN");
    if (!HF_TOKEN) {
      return new Response(
        JSON.stringify({ error: "HUGGINGFACE_API_TOKEN not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { title, description, specifications, variants, category, field } = await req.json();

    if (!title || !field) {
      return new Response(
        JSON.stringify({ error: "title and field are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build product context
    let productContext = `Product Title: ${title}`;
    if (category) productContext += `\nCategory: ${category}`;
    if (description) productContext += `\nDescription: ${description}`;
    if (specifications && Array.isArray(specifications) && specifications.length > 0) {
      const specsText = specifications
        .filter((s: any) => s.key && s.value)
        .map((s: any) => `${s.key}: ${s.value}`)
        .join(", ");
      if (specsText) productContext += `\nSpecifications: ${specsText}`;
    }
    if (variants && Array.isArray(variants) && variants.length > 0) {
      const variantText = variants
        .map((g: any) => `${g.name}: ${g.options?.map((o: any) => o.name).filter(Boolean).join(", ")}`)
        .filter(Boolean)
        .join("; ");
      if (variantText) productContext += `\nVariants: ${variantText}`;
    }

    const fieldPrompt = getFieldPrompt(field);

    // Use HF Inference Providers (OpenAI-compatible router)
    const hfUrl = "https://router.huggingface.co/v1/chat/completions";
    const models = [
      "Qwen/Qwen2.5-Coder-32B-Instruct",
      "google/gemma-2-2b-it",
    ];

    let response: Response | null = null;
    let lastError = "";

    for (const model of models) {
      try {
        response = await fetch(hfUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${HF_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: `${fieldPrompt}\n\n--- Product Data ---\n${productContext}` },
            ],
            max_tokens: 300,
            temperature: 0.7,
            top_p: 0.9,
          }),
        });

        if (response.ok) break;
        
        lastError = await response.text();
        console.error(`Model ${model} failed:`, response.status, lastError);
        response = null;
      } catch (e) {
        console.error(`Model ${model} threw:`, e.message);
        lastError = e.message;
      }
    }

    if (!response || !response.ok) {
      return new Response(
        JSON.stringify({ error: `All HuggingFace providers failed. Last error: ${lastError.slice(0, 200)}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const rawContent = data?.choices?.[0]?.message?.content?.trim() || "";

    // Clean up any residual tokens or whitespace
    const content = rawContent
      .replace(/<\|.*?\|>/g, "")
      .replace(/^["']|["']$/g, "")
      .trim();

    if (!content) {
      console.error("HuggingFace returned empty content:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "AI returned empty content" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result: any;
    if (field === "search_tags") {
      const tags = content
        .split(",")
        .map((t: string) => t.trim())
        .filter((t: string) => t.length > 0);
      result = { search_tags: tags };
    } else if (field === "meta_title") {
      // Hard cap at 60 chars, try to break at last space before limit
      let title = content;
      if (title.length > 60) {
        title = title.slice(0, 60);
        const lastSpace = title.lastIndexOf(" ");
        if (lastSpace > 30) title = title.slice(0, lastSpace);
      }
      result = { meta_title: title };
    } else if (field === "meta_description") {
      result = { meta_description: content.slice(0, 160) };
    } else {
      result = { content };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-seo error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
