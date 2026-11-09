
-- Drop the restrictive SELECT policy and recreate as permissive
DROP POLICY IF EXISTS "Approved reviews publicly readable" ON public.reviews;
CREATE POLICY "Approved reviews publicly readable"
  ON public.reviews FOR SELECT
  TO public
  USING ((status = 'approved') OR (user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
