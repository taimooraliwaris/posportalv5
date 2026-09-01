CREATE TABLE public.register_sessions (
  id text PRIMARY KEY,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  cashier text NOT NULL DEFAULT ''::text,
  opened_at timestamp with time zone NOT NULL DEFAULT now(),
  closed_at timestamp with time zone,
  opening_float numeric NOT NULL DEFAULT 0,
  counted_cash numeric,
  expected_cash numeric,
  cash_sales numeric NOT NULL DEFAULT 0,
  card_sales numeric NOT NULL DEFAULT 0,
  account_sales numeric NOT NULL DEFAULT 0,
  total_sales numeric NOT NULL DEFAULT 0,
  cash_in numeric NOT NULL DEFAULT 0,
  cash_out numeric NOT NULL DEFAULT 0,
  variance numeric NOT NULL DEFAULT 0,
  order_count integer NOT NULL DEFAULT 0,
  note text NOT NULL DEFAULT ''::text,
  status text NOT NULL DEFAULT 'open'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.register_sessions TO authenticated;
GRANT ALL ON public.register_sessions TO service_role;

ALTER TABLE public.register_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "register sessions staff read"
  ON public.register_sessions FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "register sessions staff insert"
  ON public.register_sessions FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "register sessions staff update"
  ON public.register_sessions FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "register sessions manager delete"
  ON public.register_sessions FOR DELETE TO authenticated
  USING (public.is_manager(auth.uid()));

CREATE TRIGGER register_sessions_updated
  BEFORE UPDATE ON public.register_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX register_sessions_date_idx ON public.register_sessions (session_date DESC);

ALTER TABLE public.orders ADD COLUMN session_id text;
ALTER TABLE public.orders ADD COLUMN kind text NOT NULL DEFAULT 'sale'::text;
ALTER TABLE public.return_records ADD COLUMN session_id text;
ALTER TABLE public.cash_moves ADD COLUMN session_id text;

UPDATE public.orders SET kind = 'return' WHERE number ILIKE 'RET-%';
UPDATE public.orders SET kind = 'exchange' WHERE number ILIKE 'EXC-%';

CREATE INDEX orders_session_idx ON public.orders (session_id);
CREATE INDEX cash_moves_session_idx ON public.cash_moves (session_id);
CREATE INDEX return_records_session_idx ON public.return_records (session_id);