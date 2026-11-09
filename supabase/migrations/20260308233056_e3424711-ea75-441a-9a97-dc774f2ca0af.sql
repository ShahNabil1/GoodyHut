
CREATE TABLE public.sms_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL DEFAULT gen_random_uuid(),
  recipient_phone text NOT NULL,
  recipient_name text,
  recipient_user_id uuid,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  error_message text,
  sent_by uuid REFERENCES auth.users(id),
  mode text DEFAULT 'bulk',
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sms_logs" ON public.sms_logs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_sms_logs_campaign ON public.sms_logs(campaign_id);
CREATE INDEX idx_sms_logs_status ON public.sms_logs(status);
