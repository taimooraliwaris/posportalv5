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

export const toProduct = (row: Row<"products">): Product => ({
  id: row.id,
  name: row.name,
  price: Number(row.price),
  category: row.category_id,
  barcode: row.barcode,
  tone: asTone(row.tone),
  icon: row.icon,
});

export const toCategory = (row: Row<"categories">): Category => ({
  id: row.id,
  name: row.name,
  tone: asTone(row.tone),
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
  status: order.status,
  lines: order.lines as unknown as Json,
  payments: order.payments as unknown as Json,
  customer_id: order.customerId ?? null,
  note: order.note ?? "",
  note_tags: order.noteTags,
  pricelist_id: order.pricelistId,
  cashier,
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
  (await rows(supabase.from("products").select("*").order("id"))).map(toProduct);

export const fetchCategories = async () =>
  (await rows(supabase.from("categories").select("*").order("name"))).map(toCategory);

export const fetchCustomers = async () =>
  (await rows(supabase.from("customers").select("*").order("name"))).map(toCustomer);

export const fetchSuppliers = async () =>
  (await rows(supabase.from("suppliers").select("*").order("name"))).map(toSupplier);

export const fetchStock = async () =>
  (await rows(supabase.from("stock_items").select("*").order("product_id"))).map(toStockItem);

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
