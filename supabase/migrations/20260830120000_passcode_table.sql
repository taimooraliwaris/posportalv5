CREATE TABLE IF NOT EXISTS public.app_security (
    id text PRIMARY KEY DEFAULT 'default',
    passcode text NOT NULL DEFAULT '1234',
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.app_security ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read" ON public.app_security FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated update" ON public.app_security FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow anon read" ON public.app_security FOR SELECT TO anon USING (true);

INSERT INTO public.app_security (id, passcode) VALUES ('default', '1234') ON CONFLICT (id) DO NOTHING;
