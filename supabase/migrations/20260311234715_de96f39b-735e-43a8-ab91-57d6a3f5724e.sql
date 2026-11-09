ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS due_payment_proof_url text,
  ADD COLUMN IF NOT EXISTS due_payment_method text,
  ADD COLUMN IF NOT EXISTS due_payment_verified boolean DEFAULT false;