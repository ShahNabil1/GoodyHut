
-- Create similarity search function
-- Using plpgsql with explicit schema references for vector operations
CREATE OR REPLACE FUNCTION public.match_products_by_embedding(
  query_embedding text,
  match_threshold float DEFAULT 0.0,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  product_id uuid,
  similarity float
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY EXECUTE format(
    'SELECT pe.product_id, (1 - (pe.embedding OPERATOR(extensions.<=>) $1::extensions.vector(512)))::float as similarity
     FROM public.product_embeddings pe
     JOIN public.products p ON p.id = pe.product_id
     WHERE p.in_stock = true
       AND (1 - (pe.embedding OPERATOR(extensions.<=>) $1::extensions.vector(512)))::float > $2
     ORDER BY pe.embedding OPERATOR(extensions.<=>) $1::extensions.vector(512)
     LIMIT $3'
  ) USING query_embedding, match_threshold, match_count;
END;
$$;
