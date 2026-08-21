-- Helper functions
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.is_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('Manager','Admin')
  );
$$;

REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_manager(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_manager(uuid) TO authenticated;

-- Lock down SECURITY DEFINER functions not meant to be called via the API
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- customers
DROP POLICY IF EXISTS "customers staff access" ON public.customers;
CREATE POLICY "customers staff access" ON public.customers
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- suppliers
DROP POLICY IF EXISTS "suppliers staff access" ON public.suppliers;
CREATE POLICY "suppliers staff access" ON public.suppliers
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- purchase_orders
DROP POLICY IF EXISTS "purchase orders staff access" ON public.purchase_orders;
CREATE POLICY "purchase orders staff access" ON public.purchase_orders
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- pricelists: remove public read
DROP POLICY IF EXISTS "pricelists readable" ON public.pricelists;
DROP POLICY IF EXISTS "pricelists writable by staff" ON public.pricelists;
CREATE POLICY "pricelists staff access" ON public.pricelists
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));
REVOKE ALL ON public.pricelists FROM anon;

-- stock_items: remove public read (cost/supplier data)
DROP POLICY IF EXISTS "stock readable" ON public.stock_items;
DROP POLICY IF EXISTS "stock writable by staff" ON public.stock_items;
CREATE POLICY "stock staff access" ON public.stock_items
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));
REVOKE ALL ON public.stock_items FROM anon;

-- profiles
DROP POLICY IF EXISTS "profiles readable by staff" ON public.profiles;
CREATE POLICY "profiles readable by staff" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_staff(auth.uid()));

-- security_events
DROP POLICY IF EXISTS "security events staff read" ON public.security_events;
DROP POLICY IF EXISTS "security events staff insert" ON public.security_events;
CREATE POLICY "security events manager read" ON public.security_events
  FOR SELECT TO authenticated
  USING (public.is_manager(auth.uid()));
CREATE POLICY "security events staff insert" ON public.security_events
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

-- stock_adjustments
DROP POLICY IF EXISTS "adjustments staff read" ON public.stock_adjustments;
DROP POLICY IF EXISTS "adjustments staff insert" ON public.stock_adjustments;
CREATE POLICY "adjustments staff read" ON public.stock_adjustments
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "adjustments staff insert" ON public.stock_adjustments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) AND (actor IS NULL OR actor = auth.uid()));