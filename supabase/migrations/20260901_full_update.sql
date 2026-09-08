-- 20260901_full_update.sql - Combined migration for POS portal enhancements

-- 1. Categories table (supports hierarchical sub‑categories)
CREATE TABLE public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  parent_id TEXT REFERENCES public.categories(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Extend products table
ALTER TABLE public.products
  ADD COLUMN subcategory_id TEXT REFERENCES public.categories(id),
  ADD COLUMN reorder_point NUMERIC NULL,
  ADD COLUMN claimable BOOLEAN DEFAULT FALSE,
  ADD COLUMN claim_terms TEXT NULL;

-- 3. System logs table
CREATE TABLE public.system_logs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Loyalty numbers table
CREATE TABLE public.loyalty_numbers (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES public.customers(id),
  number TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Extend orders table for loyalty reference
ALTER TABLE public.orders
  ADD COLUMN customer_loyalty_number TEXT;

-- 6. Adjust RLS policies for new tables (staff access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories staff access" ON public.categories FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_logs TO authenticated;
GRANT ALL ON public.system_logs TO service_role;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system_logs staff access" ON public.system_logs FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.loyalty_numbers TO authenticated;
GRANT ALL ON public.loyalty_numbers TO service_role;
ALTER TABLE public.loyalty_numbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loyalty_numbers staff access" ON public.loyalty_numbers FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- 7. Triggers for timestamps (if not already present)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER categories_updated BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER system_logs_updated BEFORE UPDATE ON public.system_logs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER loyalty_numbers_updated BEFORE UPDATE ON public.loyalty_numbers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
