
CREATE TABLE public.email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resend_id text,
  email_to text,
  subject text,
  template_slug text,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_email_events_type ON public.email_events(event_type);
CREATE INDEX idx_email_events_created ON public.email_events(created_at DESC);
CREATE INDEX idx_email_events_resend_id ON public.email_events(resend_id);

ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email events" ON public.email_events
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert email events" ON public.email_events
  FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can read email events" ON public.email_events
  FOR SELECT TO service_role
  USING (true);
