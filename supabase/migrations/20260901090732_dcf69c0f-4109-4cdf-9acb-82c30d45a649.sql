-- 1. New accounts no longer auto-become staff
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  -- No role is granted automatically: a Manager must explicitly assign one.
  RETURN NEW;
END;
$function$;

-- 2. Backend passcode no longer readable by anonymous visitors
DROP POLICY IF EXISTS "Allow anon read" ON public.app_security;
REVOKE ALL ON public.app_security FROM anon;
DROP POLICY IF EXISTS "Allow authenticated read" ON public.app_security;
CREATE POLICY "app security staff read" ON public.app_security
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "Allow authenticated update" ON public.app_security;
CREATE POLICY "app security manager update" ON public.app_security
  FOR UPDATE TO authenticated
  USING (public.is_manager(auth.uid()))
  WITH CHECK (public.is_manager(auth.uid()));

-- 3. backend_passcode: authoritative role check instead of a JWT claim
DROP POLICY IF EXISTS "Enable update for Managers and Admins" ON public.backend_passcode;
CREATE POLICY "backend passcode manager update" ON public.backend_passcode
  FOR UPDATE TO authenticated
  USING (public.is_manager(auth.uid()))
  WITH CHECK (public.is_manager(auth.uid()));
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.backend_passcode;
CREATE POLICY "backend passcode staff read" ON public.backend_passcode
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
REVOKE ALL ON public.backend_passcode FROM anon;

-- 4. Cost prices no longer public
DROP POLICY IF EXISTS "Public Read Products" ON public.products;
CREATE POLICY "Staff Read Products" ON public.products
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
REVOKE ALL ON public.products FROM anon;
REVOKE ALL ON public.v_products FROM anon;
GRANT SELECT ON public.v_products TO authenticated;

-- 5. View runs with the caller's permissions, not the owner's
ALTER VIEW public.v_products SET (security_invoker = on);