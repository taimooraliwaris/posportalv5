-- Restores automatic staff bootstrap for new accounts.
--
-- Context: an earlier migration (20260823050826) locked INSERT on
-- public.user_roles to managers only, but no trigger was ever added to
-- seed a profiles/user_roles row when a new auth.users account is
-- created. Since nobody can be a manager without already having a
-- user_roles row, every signup since that migration has been unable to
-- get one at all -- new accounts fail every RLS check that goes through
-- is_staff()/is_manager(), including saving orders.
--
-- This trigger runs SECURITY DEFINER so it can write to profiles/
-- user_roles despite their manager-only policies. It only ever inserts
-- a row tied to the NEW auth.users row being created, so it can't be
-- used to grant roles to arbitrary users.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'Cashier')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill accounts created before this trigger existed, so anyone who
-- signed up during the gap (and isn't already staffed, e.g. via a manual
-- fix) gets a working account instead of being silently locked out.

INSERT INTO public.profiles (id, name, email)
SELECT u.id,
       COALESCE(u.raw_user_meta_data ->> 'name', split_part(u.email, '@', 1)),
       u.email
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'Cashier'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id
);
