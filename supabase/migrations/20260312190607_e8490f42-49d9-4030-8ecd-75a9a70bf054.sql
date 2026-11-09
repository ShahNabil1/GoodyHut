
-- Update the developer role trigger to NOT auto-assign admin role
CREATE OR REPLACE FUNCTION public.handle_developer_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  developer_emails text[] := ARRAY['dev.goodyhut@gmail.com', 'shahriarnabil94@gmail.com'];
BEGIN
  -- Developers no longer need admin role; they have full access via isDeveloper check in frontend
  -- This function is kept as a no-op to avoid breaking the trigger
  RETURN NEW;
END;
$function$;
