
-- Update handle_new_user to also store phone for phone-based signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email,
    CASE 
      WHEN NEW.phone IS NOT NULL AND NEW.phone != '' 
      THEN REPLACE(NEW.phone, '+', '')
      ELSE NULL 
    END
  )
  ON CONFLICT (id) DO UPDATE SET
    phone = COALESCE(
      CASE 
        WHEN NEW.phone IS NOT NULL AND NEW.phone != '' 
        THEN REPLACE(NEW.phone, '+', '')
        ELSE NULL 
      END,
      EXCLUDED.phone
    ),
    full_name = COALESCE(
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
      EXCLUDED.full_name
    );
  RETURN NEW;
END;
$$;

-- Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
