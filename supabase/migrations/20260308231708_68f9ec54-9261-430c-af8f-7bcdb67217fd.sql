
CREATE TABLE public.personal_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  discount_type text NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric NOT NULL DEFAULT 0,
  active boolean DEFAULT true,
  note text,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  UNIQUE(user_id, product_id)
);

ALTER TABLE public.personal_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage personal discounts" ON public.personal_discounts FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can read own discounts" ON public.personal_discounts FOR SELECT TO authenticated
  USING (user_id = auth.uid());
