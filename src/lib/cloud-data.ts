// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import type { Category, Customer, Product } from "./pos-data";
import type {
  PricelistDetail,
  PricelistRule,
  PurchaseOrder,
  PurchaseOrderStatus,
  PoLine,
  StockItem,
  StaffRole,
  StaffUser,
  StoreSettings,
  Supplier,
  TaxRate,
} from "./backend-data";
import { seedStoreSettings } from "./backend-data";
import type { CartLine, CashMove, Order, OrderStatus, PaymentLine, ReturnLine, ReturnRecord } from "./pos-context";

type Tables = Database["public"]["Tables"];
type Row<K extends keyof Tables> = Tables[K]["Row"];

type Tone = Category["tone"];

const tones: Tone[] = ["pink", "sand", "sage", "sky"];
const asTone = (value: string): Tone => (tones.includes(value as Tone) ? (value as Tone) : "sky");

export const randomId = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;

/* ------------------------------------------------------------------ catalog */

export const toProduct = (row: Row<"v_products"> | Row<"products">): Product => ({
  id: row.id,
  name: row.name_en,
  name_ur: row.name_ur,
  brand: row.brand,
  price: Number(row.sale_price),
  cost_price: Number(row.cost_price),
  category: row.category_id,
  category_id: row.category_id,
  item_code: row.item_code,
  barcode: row.item_code || row.id,
  stock_qty: row.stock_qty,
  ctn_qty: row.ctn_qty,
  foc_threshold: row.foc_threshold,
  foc_qty: row.foc_qty,
  qrc_runs: row.qrc_runs,
  specs: typeof row.specs === 'object' && row.specs !== null ? row.specs : {},
  vehicle_model_id: row.vehicle_model_id,
  is_active: row.is_active,
  category_slug: 'category_slug' in row ? row.category_slug : undefined,
  category_name: 'category_name' in row ? row.category_name : undefined,
  primary_model_code: 'primary_model_code' in row ? row.primary_model_code : undefined,
  tone: "sky",
  icon: "Box",
});

export const toCategory = (row: Row<"product_categories">): Category => ({
  id: row.id,
  slug: row.slug,
  name: row.name_en,
  name_ur: row.name_ur,
  icon: row.icon,
  color: row.color,
  spec_schema: row.spec_schema,
  parser_rules: row.parser_rules,
  tone: asTone(row.color || "sky"),
});

export const toCustomer = (row: Row<"customers">): Customer => ({
  id: row.id,
  name: row.name,
  email: row.email,
  ...(row.location ? { location: row.location } : {}),
  ...(row.phone ? { phone: row.phone } : {}),
  ...(row.company ? { company: row.company } : {}),
});

export const toSupplier = (row: Row<"suppliers">): Supplier => ({
  id: row.id,
  name: row.name,
  contact: row.contact,
  phone: row.phone,
  productIds: row.product_ids ?? [],
  openBalance: Number(row.open_balance),
});

export const toStockItem = (row: Row<"stock_items">): StockItem => ({
  productId: row.product_id,
  onHand: row.on_hand,
  reserved: row.reserved,
  reorderPoint: row.reorder_point,
  cost: Number(row.cost),
  supplierId: row.supplier_id ?? "",
  description: row.description,
  active: row.active,
  ...(row.sku ? { sku: row.sku } : {}),
  history: Array.isArray(row.history) ? (row.history as number[]) : [],
});

export const toPurchaseOrder = (row: Row<"purchase_orders">): PurchaseOrder => ({
  id: row.id,
  number: row.number,
  supplierId: row.supplier_id ?? "",
  date: row.order_date,
  status: row.status as PurchaseOrderStatus,
  lines: (Array.isArray(row.lines) ? row.lines : []) as unknown as PoLine[],
});

export const toPricelist = (row: Row<"pricelists">): PricelistDetail => ({
  id: row.id,
  name: row.name,
  ruleType: row.rule_type as PricelistDetail["ruleType"],
  appliesTo: row.applies_to,
  ...(row.start_date ? { startDate: row.start_date } : {}),
  ...(row.end_date ? { endDate: row.end_date } : {}),
  ...(row.customer_tag ? { customerTag: row.customer_tag } : {}),
  productCount: row.product_count,
  customerCount: row.customer_count,
  rules: (Array.isArray(row.rules) ? row.rules : []) as unknown as PricelistRule[],
});

export const toTaxRate = (row: Row<"tax_rates">): TaxRate => ({
  id: row.id,
  name: row.name,
  percentage: Number(row.percentage),
  appliesTo: row.applies_to,
});

export const toStoreSettings = (row: Row<"store_settings">): StoreSettings => ({
  name: row.name,
  brand: row.brand,
  tagline: row.tagline,
  address: row.address,
  phone: row.phone,
  email: row.email,
  currency: row.currency,
  receiptFooter: row.receipt_footer,
  logoName: row.logo_name,
  cashier: row.cashier,
  network: row.network,
});

/* ------------------------------------------------------------------- orders */

export const toOrder = (row: Row<"orders">): Order => ({
  id: row.id,
  number: row.number,
  receipt: row.receipt,
  time: row.order_time,
  date: row.order_date,
  cashier: row.cashier || "",
  status: row.status as OrderStatus,
  lines: (Array.isArray(row.lines) ? row.lines : []) as unknown as CartLine[],
  payments: (Array.isArray(row.payments) ? row.payments : []) as unknown as PaymentLine[],
  ...(row.customer_id ? { customerId: row.customer_id } : {}),
  ...(row.note ? { note: row.note } : {}),
  noteTags: row.note_tags ?? [],
  pricelistId: row.pricelist_id,
});

export const fromOrder = (order: Order, cashier = ""): Tables["orders"]["Insert"] => ({
  id: order.id,
  number: order.number,
  receipt: order.receipt,
  order_time: order.time,
  order_date: order.date ?? new Date().toISOString().slice(0, 10),
  status: order.status,
  lines: order.lines as unknown as Json,
  payments: order.payments as unknown as Json,
  customer_id: order.customerId ?? null,
  note: order.note ?? "",
  note_tags: order.noteTags,
  pricelist_id: order.pricelistId,
  cashier: order.cashier || cashier,
});

export const toReturnRecord = (row: Row<"return_records">): ReturnRecord => ({
  id: row.id,
  number: row.number,
  kind: row.kind as ReturnRecord["kind"],
  date: row.return_date,
  time: row.return_time,
  originalOrderId: row.original_order_id,
  originalNumber: row.original_number,
  lines: (Array.isArray(row.lines) ? row.lines : []) as unknown as ReturnLine[],
  replacements: (Array.isArray(row.replacements) ? row.replacements : []) as unknown as ReturnLine[],
  refundAmount: Number(row.refund_amount),
  difference: Number(row.difference),
  method: row.method as ReturnRecord["method"],
  processedBy: row.processed_by,
});

export const fromReturnRecord = (
  record: ReturnRecord,
): Tables["return_records"]["Insert"] => ({
  id: record.id,
  number: record.number,
  kind: record.kind,
  return_date: record.date,
  return_time: record.time,
  original_order_id: record.originalOrderId,
  original_number: record.originalNumber,
  lines: record.lines as unknown as Json,
  replacements: record.replacements as unknown as Json,
  refund_amount: record.refundAmount,
  difference: record.difference,
  method: record.method,
  processed_by: record.processedBy,
});

export const toCashMove = (row: Row<"cash_moves">): CashMove => ({
  id: row.id,
  type: row.move_type as CashMove["type"],
  amount: Number(row.amount),
  reason: row.reason,
});

/* ------------------------------------------------------------------ fetchers */

async function rows<T>(promise: PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const { data, error } = await promise;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export const cloudKeys = {
  products: ["cloud", "products"] as const,
  categories: ["cloud", "categories"] as const,
  customers: ["cloud", "customers"] as const,
  suppliers: ["cloud", "suppliers"] as const,
  stock: ["cloud", "stock"] as const,
  adjustments: ["cloud", "adjustments"] as const,
  purchaseOrders: ["cloud", "purchase-orders"] as const,
  pricelists: ["cloud", "pricelists"] as const,
  taxes: ["cloud", "taxes"] as const,
  storeSettings: ["cloud", "store-settings"] as const,
  orders: ["cloud", "orders"] as const,
  returns: ["cloud", "returns"] as const,
  cashMoves: ["cloud", "cash-moves"] as const,
  staff: ["cloud", "staff"] as const,
  securityEvents: ["cloud", "security-events"] as const,
};

export const fetchProducts = async () =>
  (await rows(supabase.from("v_products").select("*").order("id"))).map(toProduct as any);

export const fetchCategories = async () =>
  (await rows(supabase.from("product_categories").select("*").order("name_en"))).map(toCategory);

export const fetchCustomers = async () =>
  (await rows(supabase.from("customers").select("*").order("name"))).map(toCustomer);

export const fetchSuppliers = async () =>
  (await rows(supabase.from("suppliers").select("*").order("name"))).map(toSupplier);

export const fetchStock = async () => [];

export const fetchPurchaseOrders = async () =>
  (await rows(supabase.from("purchase_orders").select("*").order("order_date", { ascending: false }))).map(
    toPurchaseOrder,
  );

export const fetchPricelists = async () =>
  (await rows(supabase.from("pricelists").select("*").order("name"))).map(toPricelist);

export const fetchTaxes = async () =>
  (await rows(supabase.from("tax_rates").select("*").order("name"))).map(toTaxRate);

export const fetchStoreSettings = async (): Promise<StoreSettings> => {
  const { data, error } = await supabase.from("store_settings").select("*").eq("id", "default").maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toStoreSettings(data) : seedStoreSettings;
};

export const fetchOrders = async () =>
  (await rows(supabase.from("orders").select("*").order("created_at", { ascending: false }))).map(toOrder);

export const fetchReturns = async () =>
  (await rows(supabase.from("return_records").select("*").order("created_at", { ascending: false }))).map(
    toReturnRecord,
  );

export const fetchCashMoves = async () =>
  (await rows(supabase.from("cash_moves").select("*").order("created_at"))).map(toCashMove);

/** Throws on failure so callers can roll optimistic cache updates back. */
export async function expectOk(promise: PromiseLike<{ error: { message: string } | null }>) {
  const { error } = await promise;
  if (error) throw new Error(error.message);
}

/* ------------------------------------------------- adjustments & staff */

export type CloudAdjustment = {
  id: string;
  productId: string;
  from: number;
  to: number;
  reason: string;
  date: string;
};

export const fetchStockAdjustments = async (): Promise<CloudAdjustment[]> => [];


export const fetchStaff = async (): Promise<StaffUser[]> => {
  const profiles = await rows(supabase.from("profiles").select("*").order("name"));
  const roles = await rows(supabase.from("user_roles").select("user_id, role"));
  return profiles.map((p) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    role: (roles.find((r) => r.user_id === p.id)?.role ?? "Cashier") as StaffRole,
  }));
};

/* ------------------------------------------------------------- writers */

export const fromStockItem = (item: StockItem): Tables["stock_items"]["Insert"] => ({
  product_id: item.productId,
  on_hand: item.onHand,
  reserved: item.reserved,
  reorder_point: item.reorderPoint,
  cost: item.cost,
  supplier_id: item.supplierId || null,
  description: item.description,
  active: item.active,
  sku: item.sku ?? null,
  history: item.history as unknown as Json,
});

export const fromSupplier = (s: Supplier): Tables["suppliers"]["Insert"] => ({
  id: s.id,
  name: s.name,
  contact: s.contact,
  phone: s.phone,
  product_ids: s.productIds,
  open_balance: s.openBalance,
});

export const fromPurchaseOrder = (po: PurchaseOrder): Tables["purchase_orders"]["Insert"] => ({
  id: po.id,
  number: po.number,
  supplier_id: po.supplierId || null,
  order_date: po.date,
  status: po.status,
  lines: po.lines as unknown as Json,
});

export const fromPricelist = (p: PricelistDetail): Tables["pricelists"]["Insert"] => ({
  id: p.id,
  name: p.name,
  rule_type: p.ruleType,
  applies_to: p.appliesTo,
  start_date: p.startDate ?? null,
  end_date: p.endDate ?? null,
  customer_tag: p.customerTag ?? null,
  product_count: p.productCount,
  customer_count: p.customerCount,
  rules: p.rules as unknown as Json,
});

export const fromTaxRate = (t: TaxRate): Tables["tax_rates"]["Insert"] => ({
  id: t.id,
  name: t.name,
  percentage: t.percentage,
  applies_to: t.appliesTo,
});

export const fromStoreSettings = (s: StoreSettings): Tables["store_settings"]["Insert"] => ({
  id: "default",
  name: s.name,
  brand: s.brand,
  tagline: s.tagline,
  address: s.address,
  phone: s.phone,
  email: s.email,
  currency: s.currency,
  receipt_footer: s.receiptFooter,
  logo_name: s.logoName,
  cashier: s.cashier,
  network: s.network,
});
