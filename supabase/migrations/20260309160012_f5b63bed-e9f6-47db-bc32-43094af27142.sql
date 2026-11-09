
-- Create campaigns table
CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  banner_image_url text,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Campaigns publicly readable" ON public.campaigns
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins can insert campaigns" ON public.campaigns
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update campaigns" ON public.campaigns
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete campaigns" ON public.campaigns
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Create campaign_products junction table
CREATE TABLE public.campaign_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  discount_percentage numeric DEFAULT 0,
  UNIQUE (campaign_id, product_id)
);

ALTER TABLE public.campaign_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Campaign products publicly readable" ON public.campaign_products
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins can insert campaign products" ON public.campaign_products
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update campaign products" ON public.campaign_products
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete campaign products" ON public.campaign_products
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
