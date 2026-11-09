
-- Add slug column
ALTER TABLE public.products ADD COLUMN slug text UNIQUE;

-- Generate slugs from existing titles
UPDATE public.products SET slug = lower(regexp_replace(regexp_replace(title, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));

-- Make slug NOT NULL after populating
ALTER TABLE public.products ALTER COLUMN slug SET NOT NULL;
