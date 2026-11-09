
-- Insert admin role for existing developer user
INSERT INTO public.user_roles (user_id, role)
VALUES ('b07c5834-0872-47c1-9bc6-6fd49f4c4b46', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Create function to auto-assign admin role for developer emails
CREATE OR REPLACE FUNCTION public.handle_developer_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Create trigger on auth.users for new signups
DROP TRIGGER IF EXISTS on_developer_signup ON auth.users;
CREATE TRIGGER on_developer_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_developer_role();
