-- Sales orders, returns and cash movements now live in the database
CREATE TABLE public.orders (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL,
  receipt TEXT NOT NULL,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  order_time TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ongoing',
  lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  payments JSONB NOT NULL DEFAULT '[]'::jsonb,
  customer_id TEXT,
  note TEXT NOT NULL DEFAULT '',
  note_tags TEXT[] NOT NULL DEFAULT '{}'::text[],
  pricelist_id TEXT NOT NULL DEFAULT 'pl1',
  cashier TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders staff access" ON public.orders FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER orders_updated BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.return_records (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'return',
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  return_time TEXT NOT NULL DEFAULT '',
  original_order_id TEXT NOT NULL DEFAULT '',
  original_number TEXT NOT NULL DEFAULT '',
  lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  replacements JSONB NOT NULL DEFAULT '[]'::jsonb,
  refund_amount NUMERIC NOT NULL DEFAULT 0,
  difference NUMERIC NOT NULL DEFAULT 0,
  method TEXT NOT NULL DEFAULT 'Cash',
  processed_by TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.return_records TO authenticated;
GRANT ALL ON public.return_records TO service_role;
ALTER TABLE public.return_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "returns staff access" ON public.return_records FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER return_records_updated BEFORE UPDATE ON public.return_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.cash_moves (
  id TEXT PRIMARY KEY,
  move_type TEXT NOT NULL DEFAULT 'in',
  amount NUMERIC NOT NULL DEFAULT 0,
  reason TEXT NOT NULL DEFAULT '',
  cashier TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_moves TO authenticated;
GRANT ALL ON public.cash_moves TO service_role;
ALTER TABLE public.cash_moves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cash moves staff access" ON public.cash_moves FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- Managers need to see the whole staff list and their roles
CREATE POLICY "user roles manager read" ON public.user_roles FOR SELECT TO authenticated
  USING (public.is_manager(auth.uid()));

-- Lets the sign-in screen know whether the store still needs its first admin
CREATE OR REPLACE FUNCTION public.staff_exists()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles);
$$;
REVOKE ALL ON FUNCTION public.staff_exists() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.staff_exists() TO anon, authenticated;