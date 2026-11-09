
-- Coupons table for personalized coupon codes
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  discount_type text NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric NOT NULL DEFAULT 0,
  min_order_amount numeric DEFAULT 0,
  max_uses integer DEFAULT 1,
  used_count integer DEFAULT 0,
  expires_at timestamp with time zone,
  active boolean DEFAULT true,
  product_ids uuid[] DEFAULT '{}',
  cart_item_ids uuid[] DEFAULT '{}',
  note text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage coupons" ON public.coupons FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can read own coupons" ON public.coupons FOR SELECT TO authenticated
  USING (user_id = auth.uid());
