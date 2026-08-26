-- =============================================================================
-- Fix 1: Restore handle_new_user to create user_roles row for every new signup.
--        The previous migration (20260826052507) dropped the user_roles insert
--        from the trigger, breaking is_staff() → RLS → every order save.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;

  -- Every new signup gets Cashier by default.
  -- A Manager must explicitly promote them via the Settings → Users screen.
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'Cashier')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;

-- Recreate the trigger in case it was dropped
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- Backfill: users who signed up after 20260826052507 (and before this fix)
--           ended up with a profiles row but no user_roles row.
-- =============================================================================

INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'Cashier'
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id
);

-- =============================================================================
-- Fix 2: Let every authenticated user read their own role row.
--        Without this, fetchStaff() returns empty for Cashiers, and
--        currentUser falls back to the hard-coded default instead of the DB.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'user_roles'
      AND policyname = 'user roles self read'
  ) THEN
    CREATE POLICY "user roles self read" ON public.user_roles
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;
END$$;

-- =============================================================================
-- Fix 3: Role-aware RLS on orders.
--        Old single "FOR ALL" policy was fine in theory but non-obvious;
--        replace it with explicit per-operation policies so:
--          • Cashiers  → SELECT + INSERT + UPDATE  (no DELETE)
--          • Managers  → full CRUD (is_manager implies is_staff)
-- =============================================================================

DROP POLICY IF EXISTS "orders staff access" ON public.orders;

-- Any staff member can read all orders
CREATE POLICY "orders select"
  ON public.orders FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

-- Any staff member can create orders
CREATE POLICY "orders insert"
  ON public.orders FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

-- Any staff member can update orders (e.g. status changes)
CREATE POLICY "orders update"
  ON public.orders FOR UPDATE TO authenticated
  USING  (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- Only managers can hard-delete orders
CREATE POLICY "orders delete"
  ON public.orders FOR DELETE TO authenticated
  USING (public.is_manager(auth.uid()));

-- =============================================================================
-- Fix 4: Role-aware RLS on return_records (same split as orders).
-- =============================================================================

DROP POLICY IF EXISTS "returns staff access" ON public.return_records;

CREATE POLICY "returns select"
  ON public.return_records FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "returns insert"
  ON public.return_records FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "returns update"
  ON public.return_records FOR UPDATE TO authenticated
  USING  (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "returns delete"
  ON public.return_records FOR DELETE TO authenticated
  USING (public.is_manager(auth.uid()));

-- =============================================================================
-- Fix 5: Role-aware RLS on cash_moves (same split).
-- =============================================================================

DROP POLICY IF EXISTS "cash moves staff access" ON public.cash_moves;

CREATE POLICY "cash moves select"
  ON public.cash_moves FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "cash moves insert"
  ON public.cash_moves FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

-- Cash moves are immutable once written; only managers may correct a record
CREATE POLICY "cash moves delete"
  ON public.cash_moves FOR DELETE TO authenticated
  USING (public.is_manager(auth.uid()));
