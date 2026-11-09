INSERT INTO public.page_contents (page_slug, title, content)
VALUES (
  'footer-settings',
  'Footer Settings',
  '{
    "facebook_url": "#",
    "instagram_url": "#",
    "address": "Bogura, Bangladesh",
    "support_email": "support@goodyhut.bd",
    "support_phone": "+880 XXXX-XXXXXX"
  }'::jsonb
)
ON CONFLICT (page_slug) DO NOTHING;