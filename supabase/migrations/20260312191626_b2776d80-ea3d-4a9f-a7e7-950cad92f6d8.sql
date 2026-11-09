
-- tracking_settings: key-value store for GTM, GA4, Meta Pixel IDs
CREATE TABLE public.tracking_settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tracking_settings ENABLE ROW LEVEL SECURITY;

-- Publicly readable
CREATE POLICY "Tracking settings publicly readable"
  ON public.tracking_settings FOR SELECT
  TO public USING (true);

-- Admins can manage
CREATE POLICY "Admins can manage tracking settings"
  ON public.tracking_settings FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed default keys
INSERT INTO public.tracking_settings (key, value) VALUES
  ('gtm_id', ''),
  ('ga4_id', ''),
  ('meta_pixel_id', ''),
  ('meta_capi_token', '');

-- tracking_events: server-side event log for audit
CREATE TABLE public.tracking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  user_id uuid,
  session_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tracking_events ENABLE ROW LEVEL SECURITY;

-- Only service_role and admins can read/write
CREATE POLICY "Service role can manage tracking events"
  ON public.tracking_events FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admins can read tracking events"
  ON public.tracking_events FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow insert from anon for edge function logging
CREATE POLICY "Anyone can insert tracking events"
  ON public.tracking_events FOR INSERT
  TO public WITH CHECK (true);
