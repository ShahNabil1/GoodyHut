
ALTER TABLE public.sms_templates 
ADD COLUMN IF NOT EXISTS slug text UNIQUE,
ADD COLUMN IF NOT EXISTS variables text[] DEFAULT '{}'::text[];

-- Update existing templates or ignore if slug already exists
