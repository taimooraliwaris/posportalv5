export type CategoryId = string;

export type Category = {
  id: string;
  slug: string;
  name: string;
  name_ur?: string | null;
  icon?: string | null;
  color?: string | null;
  spec_schema?: any;
  parser_rules?: any;
  tone?: string | undefined;
};

export type Product = {
  id: string;
  category: string;
  category_id: string;
  item_code: string | null;
  name: string;
  name_ur: string | null;
  brand: string | null;
  cost_price: number;
  price: number;
  stock_qty: number;
  ctn_qty: number | null;
  foc_threshold: number | null;
  foc_qty: number | null;
  qrc_runs: number | null;
  specs: Record<string, any>;
  vehicle_model_id: string | null;
  is_active: boolean;
  category_slug?: string;
  category_name?: string;
  primary_model_code?: string;
  barcode: string;
  tone?: string | undefined;
  icon?: string | undefined;
};

export type Customer = {
  id: string;
  name: string;
  location?: string;
  email: string;
  phone?: string;
  company?: string;
};

export type Pricelist = {
  id: string;
  name: string;
  description: string;
  discount: number;
};

export const STORE = {
  name: "Velora Mart",
  brand: "Velora POS",
  tagline: "Point of Sale, Simplified.",
  email: "hello@veloramart.com",
  cashier: "Rida A.",
  network: "VeloraNet",
};


export const categories: Category[] = [];

export const products: Product[] = [];

export const seedCustomers: Customer[] = [
  {
    id: "c1",
    name: "Velora Portal",
    location: "Pakistan",
    email: "portal@velora.com",
    company: "Velora",
  },
  { id: "c2", name: "Retail Store", location: "Lahore", email: "retail@velora.com" },
  {
    id: "c3",
    name: "Ayesha Khan",
    location: "Karachi",
    email: "ayesha.k@gmail.com",
    phone: "+92 300 1234567",
  },
  {
    id: "c4",
    name: "Northline Traders",
    location: "Islamabad",
    email: "info@northline.pk",
    company: "Northline",
  },
];

export const pricelists: Pricelist[] = [
  { id: "pl1", name: "Default Price", description: "Standard retail pricing", discount: 0 },
  { id: "pl2", name: "Wholesale", description: "10% off for bulk buyers", discount: 0.1 },
  { id: "pl3", name: "VIP", description: "15% off for loyalty members", discount: 0.15 },
];

export const noteTags = [
  { label: "Wait", tone: "destructive" },
  { label: "To Serve", tone: "warning" },
  { label: "Emergency", tone: "sand" },
  { label: "No Dressing", tone: "sky" },
] as const;

export function formatRs(amount: number) {
  if (amount < 0) {
    return `-Rs. ${Math.abs(amount).toFixed(2)}`;
  }
  return `Rs. ${amount.toFixed(2)}`;
}

export const toneClass: Record<string, string> = {
  pink: "bg-pink text-cat-foreground",
  sand: "bg-sand text-cat-foreground",
  sage: "bg-sage text-cat-foreground",
  sky: "bg-sky text-cat-foreground",
};
