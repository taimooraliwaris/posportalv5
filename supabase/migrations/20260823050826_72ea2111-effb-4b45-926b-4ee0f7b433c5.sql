GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.staff_exists();

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_manager(uuid) FROM anon;

CREATE POLICY "user roles manager insert" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_manager(auth.uid()));

CREATE POLICY "user roles manager update" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.is_manager(auth.uid()))
  WITH CHECK (public.is_manager(auth.uid()));

CREATE POLICY "user roles manager delete" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.is_manager(auth.uid()));

GRANT INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;