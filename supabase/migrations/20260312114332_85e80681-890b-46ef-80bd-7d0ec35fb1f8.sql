
-- Add search_tags column to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS search_tags text[] DEFAULT '{}'::text[];

-- Update search_products to also search in search_tags
CREATE OR REPLACE FUNCTION public.search_products(search_term text, max_results integer DEFAULT 20)
 RETURNS SETOF products
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT p.*
  FROM products p
  LEFT JOIN categories c ON p.category_id = c.id
  WHERE 
    p.in_stock = true
    AND (
      p.title ILIKE '%' || search_term || '%'
      OR p.description ILIKE '%' || search_term || '%'
      OR p.category ILIKE '%' || search_term || '%'
      OR c.name ILIKE '%' || search_term || '%'
      OR extensions.similarity(p.title, search_term) > 0.15
      OR extensions.similarity(p.category, search_term) > 0.15
      OR EXISTS (
        SELECT 1 FROM unnest(p.search_tags) AS tag
        WHERE tag ILIKE '%' || search_term || '%'
          OR extensions.similarity(tag, search_term) > 0.3
      )
    )
  GROUP BY p.id
  ORDER BY 
    MIN(CASE WHEN p.title ILIKE '%' || search_term || '%' THEN 0 ELSE 1 END),
    MIN(CASE 
      WHEN EXISTS (SELECT 1 FROM unnest(p.search_tags) AS tag WHERE tag ILIKE '%' || search_term || '%') THEN 0 
      ELSE 1 
    END),
    MAX(extensions.similarity(p.title, search_term)) DESC,
    MAX(p.sold_count) DESC NULLS LAST
  LIMIT max_results;
$$;
