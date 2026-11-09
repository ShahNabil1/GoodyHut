
-- Update embedding column to 1024 dimensions for jina-clip-v2
ALTER TABLE public.product_embeddings DROP COLUMN embedding;
ALTER TABLE public.product_embeddings ADD COLUMN embedding extensions.vector(1024);

-- Recreate the match function for 1024 dims
CREATE OR REPLACE FUNCTION public.match_products_by_embedding(
  query_embedding text,
  match_threshold float DEFAULT 0.0,
  match_count int DEFAULT 20
)
RETURNS TABLE (product_id uuid, similarity float)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY EXECUTE format(
    'SELECT pe.product_id, (1 - (pe.embedding OPERATOR(extensions.<=>) $1::extensions.vector(1024)))::float as similarity
     FROM public.product_embeddings pe
     JOIN public.products p ON p.id = pe.product_id
     WHERE p.in_stock = true
       AND (1 - (pe.embedding OPERATOR(extensions.<=>) $1::extensions.vector(1024)))::float > $2
     ORDER BY pe.embedding OPERATOR(extensions.<=>) $1::extensions.vector(1024)
     LIMIT $3'
  ) USING query_embedding, match_threshold, match_count;
END;
$$;
