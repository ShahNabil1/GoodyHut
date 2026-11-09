
-- Create product_deals table
CREATE TABLE public.product_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  deal_type text NOT NULL DEFAULT 'flash_sale',
  discount_percentage numeric NOT NULL DEFAULT 0,
  label text DEFAULT 'Hot Deal 🔥',
  start_date timestamp with time zone NOT NULL DEFAULT now(),
  end_date timestamp with time zone NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(product_id, deal_type)
);

-- Enable RLS
ALTER TABLE public.product_deals ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Product deals publicly readable"
  ON public.product_deals FOR SELECT TO public
  USING (true);

-- Admin manage
CREATE POLICY "Admins can insert deals"
  ON public.product_deals FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update deals"
  ON public.product_deals FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete deals"
  ON public.product_deals FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
