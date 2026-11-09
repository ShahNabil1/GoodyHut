
-- Enable pgvector extension in public schema for easier access
CREATE EXTENSION IF NOT EXISTS vector SCHEMA extensions;

-- Create product_embeddings table
CREATE TABLE IF NOT EXISTS public.product_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  embedding extensions.vector(512),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id)
);

-- Enable RLS
ALTER TABLE public.product_embeddings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Product embeddings publicly readable"
  ON public.product_embeddings FOR SELECT TO public USING (true);

CREATE POLICY "Admins can insert embeddings"
  ON public.product_embeddings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update embeddings"
  ON public.product_embeddings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete embeddings"
  ON public.product_embeddings FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage embeddings"
  ON public.product_embeddings FOR ALL TO service_role
  USING (true) WITH CHECK (true);
