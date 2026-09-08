ALTER TABLE public.cash_moves ADD COLUMN session_id TEXT NOT NULL DEFAULT '';
ALTER TABLE public.orders ADD COLUMN session_id TEXT NOT NULL DEFAULT '';
ALTER TABLE public.return_records ADD COLUMN session_id TEXT NOT NULL DEFAULT '';

ALTER TABLE public.orders ADD CONSTRAINT unique_order_number UNIQUE (number);
ALTER TABLE public.orders ADD COLUMN discount_rate NUMERIC NOT NULL DEFAULT 0;


CREATE TABLE public.register_sessions (
  id TEXT PRIMARY KEY,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  opening_cash NUMERIC NOT NULL DEFAULT 0,
  closing_cash NUMERIC,
  cashier TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  note TEXT
);

ALTER TABLE public.register_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff access" ON public.register_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION decrement_stock(p_id text, amount int)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE products
  SET stock_qty = stock_qty - amount
  WHERE id = p_id AND stock_qty >= amount;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient stock';
  END IF;
END;
$$;
