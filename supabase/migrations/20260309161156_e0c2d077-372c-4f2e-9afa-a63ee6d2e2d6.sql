
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS min_order_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_discount numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS discount_description text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS rules_text text DEFAULT NULL;
