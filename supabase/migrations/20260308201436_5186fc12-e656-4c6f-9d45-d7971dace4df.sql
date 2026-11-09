
-- Create OTP codes table for phone authentication
CREATE TABLE public.otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  otp_code text NOT NULL,
  purpose text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS (service role only - no public policies)
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- Index for fast lookups
CREATE INDEX idx_otp_codes_phone_purpose ON public.otp_codes(phone, purpose);

-- Function to check if phone is available (not bound to another account)
CREATE OR REPLACE FUNCTION public.check_phone_available(p_phone text, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE phone = p_phone AND id != p_user_id
  );
$$;
