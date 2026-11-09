
-- Add payment fields to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_type text DEFAULT 'full',
ADD COLUMN IF NOT EXISTS payment_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_method text,
ADD COLUMN IF NOT EXISTS payment_proof_url text,
ADD COLUMN IF NOT EXISTS payment_verified boolean DEFAULT false;

-- Create storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload payment proofs
CREATE POLICY "Users can upload payment proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-proofs');

-- Allow public read access to payment proofs
CREATE POLICY "Payment proofs are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-proofs');
