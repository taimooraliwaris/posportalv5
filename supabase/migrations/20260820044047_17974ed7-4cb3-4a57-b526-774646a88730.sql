
CREATE TYPE public.app_role AS ENUM ('Cashier','Manager','Admin');

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tone TEXT NOT NULL DEFAULT 'sky',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories readable" ON public.categories FOR SELECT USING (true);
CREATE POLICY "categories writable by staff" ON public.categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER categories_updated BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  category_id TEXT NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  barcode TEXT NOT NULL UNIQUE,
  tone TEXT NOT NULL DEFAULT 'sky',
  icon TEXT NOT NULL DEFAULT 'Package',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products readable" ON public.products FOR SELECT USING (true);
CREATE POLICY "products writable by staff" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  product_ids TEXT[] NOT NULL DEFAULT '{}',
  open_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "suppliers staff access" ON public.suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER suppliers_updated BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  email TEXT NOT NULL DEFAULT '',
  phone TEXT,
  company TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers staff access" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER customers_updated BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.stock_items (
  product_id TEXT PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  on_hand INTEGER NOT NULL DEFAULT 0,
  reserved INTEGER NOT NULL DEFAULT 0,
  reorder_point INTEGER NOT NULL DEFAULT 0,
  cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  supplier_id TEXT REFERENCES public.suppliers(id) ON DELETE SET NULL,
  description TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  sku TEXT,
  history JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.stock_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_items TO authenticated;
GRANT ALL ON public.stock_items TO service_role;
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock readable" ON public.stock_items FOR SELECT USING (true);
CREATE POLICY "stock writable by staff" ON public.stock_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER stock_items_updated BEFORE UPDATE ON public.stock_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.stock_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  from_qty INTEGER NOT NULL,
  to_qty INTEGER NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  actor UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.stock_adjustments TO authenticated;
GRANT ALL ON public.stock_adjustments TO service_role;
ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "adjustments staff read" ON public.stock_adjustments FOR SELECT TO authenticated USING (true);
CREATE POLICY "adjustments staff insert" ON public.stock_adjustments FOR INSERT TO authenticated WITH CHECK (true);

CREATE TABLE public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL,
  supplier_id TEXT REFERENCES public.suppliers(id) ON DELETE SET NULL,
  order_date DATE NOT NULL DEFAULT current_date,
  status TEXT NOT NULL DEFAULT 'draft',
  lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_orders TO authenticated;
GRANT ALL ON public.purchase_orders TO service_role;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "purchase orders staff access" ON public.purchase_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER purchase_orders_updated BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.pricelists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL DEFAULT 'percentage',
  applies_to TEXT NOT NULL DEFAULT 'All products',
  start_date DATE,
  end_date DATE,
  customer_tag TEXT,
  product_count INTEGER NOT NULL DEFAULT 0,
  customer_count INTEGER NOT NULL DEFAULT 0,
  rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pricelists TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricelists TO authenticated;
GRANT ALL ON public.pricelists TO service_role;
ALTER TABLE public.pricelists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pricelists readable" ON public.pricelists FOR SELECT USING (true);
CREATE POLICY "pricelists writable by staff" ON public.pricelists FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER pricelists_updated BEFORE UPDATE ON public.pricelists FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.tax_rates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  percentage NUMERIC(6,3) NOT NULL DEFAULT 0,
  applies_to TEXT NOT NULL DEFAULT 'All products',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tax_rates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tax_rates TO authenticated;
GRANT ALL ON public.tax_rates TO service_role;
ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tax rates readable" ON public.tax_rates FOR SELECT USING (true);
CREATE POLICY "tax rates writable by staff" ON public.tax_rates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER tax_rates_updated BEFORE UPDATE ON public.tax_rates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.store_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  tagline TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  currency TEXT NOT NULL DEFAULT 'Rs.',
  receipt_footer TEXT NOT NULL DEFAULT '',
  logo_name TEXT NOT NULL DEFAULT '',
  cashier TEXT NOT NULL DEFAULT '',
  network TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.store_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.store_settings TO authenticated;
GRANT ALL ON public.store_settings TO service_role;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "store settings readable" ON public.store_settings FOR SELECT USING (true);
CREATE POLICY "store settings writable by staff" ON public.store_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER store_settings_updated BEFORE UPDATE ON public.store_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable by staff" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles self insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user roles self read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)), COALESCE(NEW.email,''))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'Cashier')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL,
  actor TEXT NOT NULL DEFAULT '',
  detail TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  attempt INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.security_events TO authenticated;
GRANT ALL ON public.security_events TO service_role;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "security events staff read" ON public.security_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "security events staff insert" ON public.security_events FOR INSERT TO authenticated WITH CHECK (true);

INSERT INTO public.categories (id,name,tone) VALUES
('misc','Misc','pink'),
('desks','Desks','sky'),
('chairs','Chairs','sand');

INSERT INTO public.products (id,name,price,category_id,barcode,tone,icon) VALUES
('p1','Pedal Bin',47,'misc','8901001','pink','Trash2'),
('p2','Office Lamp',40,'misc','8901002','sand','Lamp'),
('p3','Storage Box',18.5,'misc','8901003','sky','Package'),
('p4','Desk Organizer',22,'misc','8901004','sage','Boxes'),
('p5','Desk Pad',15.75,'misc','8901005','pink','Square'),
('p6','Flipover Board',89,'misc','8901006','sky','Presentation'),
('p7','Whiteboard',65,'misc','8901007','sage','PenLine'),
('p8','Acoustic Screen',120,'misc','8901008','sand','PanelsTopLeft'),
('p9','Corner Desk',310,'desks','8902001','sky','Table'),
('p10','Standing Desk',420,'desks','8902002','sage','LayoutPanelTop'),
('p11','Drawer Unit',145,'desks','8902003','sand','Archive'),
('p12','Large Cabinet',260,'desks','8902004','pink','DoorClosed'),
('p13','Meeting Table',890,'desks','8902005','sky','Rows3'),
('p14','Side Bench',130,'desks','8902006','sage','Minus'),
('p15','Task Chair',175,'chairs','8903001','sand','Armchair'),
('p16','Two-Seat Sofa',540,'chairs','8903002','sky','Sofa'),
('p17','Lounge Pod',760,'chairs','8903003','sage','Armchair'),
('p18','Visitor Stool',68,'chairs','8903004','pink','CircleDot');

INSERT INTO public.suppliers (id,name,contact,phone,product_ids,open_balance) VALUES
('s1','Karachi Office Supplies','Imran Sheikh','+92 300 2233445',ARRAY['p1','p2','p3','p4','p5']::text[],42500),
('s2','Lahore Furniture Works','Sana Malik','+92 321 8877665',ARRAY['p9','p10','p11','p12','p13','p14']::text[],118000),
('s3','Islamabad Seating Co.','Bilal Ahmed','+92 333 4455667',ARRAY['p15','p16','p17','p18']::text[],0),
('s4','Velora Central Warehouse','Store Team','+92 42 111 888 999',ARRAY['p6','p7','p8']::text[],15750);

INSERT INTO public.customers (id,name,location,email,phone,company) VALUES
('c1','Velora Portal','Pakistan','portal@velora.com',null,'Velora'),
('c2','Retail Store','Lahore','retail@velora.com',null,null),
('c3','Ayesha Khan','Karachi','ayesha.k@gmail.com','+92 300 1234567',null),
('c4','Northline Traders','Islamabad','info@northline.pk',null,'Northline');

INSERT INTO public.stock_items (product_id,on_hand,reserved,reorder_point,cost,supplier_id,description,active,sku,history) VALUES
('p1',15,2,6,29.14,'s1','Pedal Bin — stocked item for the misc range.',true,null,'[24,25,19,15,20,20,10,18]'::jsonb),
('p2',5,2,8,24.8,'s1','Office Lamp — stocked item for the misc range.',true,null,'[16,9,10,3,8,2,0,4]'::jsonb),
('p3',18,1,10,11.47,'s1','Storage Box — stocked item for the misc range.',true,null,'[26,21,24,25,25,20,17,18]'::jsonb),
('p4',28,0,12,13.64,'s1','Desk Organizer — stocked item for the misc range.',true,null,'[38,27,38,31,26,29,26,21]'::jsonb),
('p5',0,2,6,9.77,'s1','Desk Pad — stocked item for the misc range.',true,null,'[6,9,4,9,3,0,0,0]'::jsonb),
('p6',20,2,8,55.18,'s4','Flipover Board — stocked item for the misc range.',true,null,'[27,19,22,18,21,17,15,22]'::jsonb),
('p7',28,0,10,40.3,'s4','Whiteboard — stocked item for the misc range.',true,null,'[30,34,29,31,28,23,22,28]'::jsonb),
('p8',35,0,12,74.4,'s4','Acoustic Screen — stocked item for the misc range.',true,null,'[37,45,34,37,39,38,41,34]'::jsonb),
('p9',23,0,6,192.2,'s2','Corner Desk — stocked item for the desks range.',true,null,'[28,28,33,26,30,20,19,27]'::jsonb),
('p10',7,1,8,260.4,'s2','Standing Desk — stocked item for the desks range.',true,null,'[19,6,16,7,14,8,2,4]'::jsonb),
('p11',26,0,10,89.9,'s2','Drawer Unit — stocked item for the desks range.',true,null,'[27,32,24,32,26,22,22,23]'::jsonb),
('p12',36,1,12,161.2,'s2','Large Cabinet — stocked item for the desks range.',true,null,'[39,44,39,42,34,38,36,41]'::jsonb),
('p13',28,0,6,551.8,'s2','Meeting Table — stocked item for the desks range.',true,null,'[31,28,31,27,25,27,30,28]'::jsonb),
('p14',27,1,8,80.6,'s2','Side Bench — stocked item for the desks range.',true,null,'[32,35,33,27,32,26,29,26]'::jsonb),
('p15',39,1,10,108.5,'s3','Task Chair — stocked item for the chairs range.',true,null,'[49,51,39,37,35,37,45,44]'::jsonb),
('p16',30,2,12,334.8,'s3','Two-Seat Sofa — stocked item for the chairs range.',true,null,'[38,37,32,37,38,38,32,33]'::jsonb),
('p17',31,0,6,471.2,'s3','Lounge Pod — stocked item for the chairs range.',true,null,'[35,32,35,35,39,28,32,29]'::jsonb),
('p18',37,1,8,42.16,'s3','Visitor Stool — stocked item for the chairs range.',true,null,'[41,47,38,42,44,45,31,40]'::jsonb);

INSERT INTO public.pricelists (id,name,rule_type,applies_to,start_date,end_date,customer_tag,product_count,customer_count,rules) VALUES
('pl1','Default Price','percentage','All products',null,null,null,18,4,'[{"id":"r1","scope":"All products","type":"percentage","value":0}]'::jsonb),
('pl2','Wholesale','percentage','All products',null,null,'Trade',18,2,'[{"id":"r2","scope":"All products","type":"percentage","value":10},{"id":"r3","scope":"Desks","type":"percentage","value":14}]'::jsonb),
('pl3','VIP','percentage','All products',null,null,'Loyalty',18,1,'[{"id":"r4","scope":"All products","type":"percentage","value":15}]'::jsonb),
('pl4','Ramadan Sale','fixed','Chairs','2027-02-18'::date,'2027-03-19'::date,null,4,0,'[{"id":"r5","scope":"Task Chair","type":"fixed","value":149},{"id":"r6","scope":"Visitor Stool","type":"fixed","value":59}]'::jsonb);

INSERT INTO public.tax_rates (id,name,percentage,applies_to) VALUES
('t1','GST 18%',18,'All products'),
('t2','Reduced 5%',5,'Essential goods'),
('t3','Exempt',0,'Exported goods');

INSERT INTO public.store_settings (id,name,brand,tagline,address,phone,email,currency,receipt_footer,logo_name,cashier,network) VALUES
('default','Velora Mart','Velora POS','Point of Sale, Simplified.','42 Zamzama Boulevard, Karachi, Pakistan','+92 21 3456 7890','hello@veloramart.com','Rs.','Thank you for shopping at Velora Mart. Exchanges accepted within 14 days.','velora-logo.png','Rida A.','VeloraNet');
