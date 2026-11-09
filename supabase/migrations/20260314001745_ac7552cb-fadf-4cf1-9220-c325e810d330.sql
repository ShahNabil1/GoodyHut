
-- Add customer_ip to orders table
ALTER TABLE public.orders ADD COLUMN customer_ip text;

-- Create blocked_ips table
CREATE TABLE public.blocked_ips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL UNIQUE,
  reason text,
  blocked_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;

-- Admin can manage blocked IPs
CREATE POLICY "Admins can manage blocked_ips" ON public.blocked_ips
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Public can read blocked_ips (for checkout check)
CREATE POLICY "Public can read blocked_ips" ON public.blocked_ips
  FOR SELECT TO public
  USING (true);
