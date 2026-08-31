import { products, formatRs, type Product } from "./pos-data";

export type Supplier = {
  id: string;
  name: string;
  contact: string;
  phone: string;
  productIds: string[];
  openBalance: number;
};

export type StockItem = {
  productId: string;
  onHand: number;
  reserved: number;
  reorderPoint: number;
  cost: number;
  supplierId: string;
  description: string;
  active: boolean;
  sku?: string;
  history: number[];
};

export type PoLine = { productId: string; qty: number; cost: number };

export type PurchaseOrderStatus = "draft" | "ordered" | "received" | "cancelled";

export type PurchaseOrder = {
  id: string;
  number: string;
  supplierId: string;
  date: string;
  status: PurchaseOrderStatus;
  lines: PoLine[];
};

export type RuleScopeKind = "store" | "category" | "product";

export type PricelistRule = {
  id: string;
  scope: string;
  type: "percentage" | "fixed" | "buy-x-get-y";
  value: number;
  /** Advanced rule-builder fields. */
  scopeKind?: RuleScopeKind;
  scopeId?: string;
  minQty?: number;
  freeQty?: number;
  startDate?: string;
  endDate?: string;
};

export type PricelistDetail = {
  id: string;
  name: string;
  ruleType: "percentage" | "fixed" | "buy-x-get-y";
  appliesTo: string;
  startDate?: string;
  endDate?: string;
  customerTag?: string;
  productCount: number;
  customerCount: number;
  rules: PricelistRule[];
};



export type StaffRole = "Cashier" | "Manager" | "Admin";

export type StaffUser = { id: string; name: string; email: string; role: StaffRole };

/** Audit trail entry shown in Settings → Security. */
export type SecurityEvent = {
  id: string;
  action: string;
  detail: string;
  actor: string;
  at: string;
};

export type StoreSettings = {
  name: string;
  brand: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  currency: string;
  receiptFooter: string;
  logoName: string;
  cashier: string;
  network: string;
};

export type SessionRecord = {
  id: string;
  date: string; // YYYY-MM-DD
  cashier: string;
  openedAt: string;
  closedAt: string;
  openingFloat: number;
  totalSales: number;
  cashSales: number;
  cardSales: number;
  variance: number;
  orderCount: number;
};

export type HistoricalSaleLine = {
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
};

export type HistoricalSale = {
  id: string;
  number: string;
  receipt: string;
  date: string;
  time: string;
  sessionId: string;
  cashier: string;
  method: "Cash" | "Card" | "Customer Account";
  lines: HistoricalSaleLine[];
  total: number;
};

export const rolePermissions: Record<StaffRole, string> = {
  Cashier: "Till, orders, returns",
  Manager: "Till, backend, reports, inventory",
  Admin: "Full access including users and settings",
};

export const returnReasons = ["Damaged", "Wrong Item", "Customer Changed Mind", "Other"] as const;

export const stockAdjustReasons = ["Stock Count", "Damaged", "Theft/Loss", "Other"] as const;

/** Deterministic pseudo-random generator so mock data never changes between renders. */
function makeRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

export function toDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Pakistan standard date display. */
export function formatDate(key: string) {
  const [y, m, d] = key.split("-");
  return `${d}/${m}/${y}`;
}

export function formatMoney(amount: number) {
  return formatRs(amount);
}

export const suppliers: Supplier[] = [
  {
    id: "s1",
    name: "Karachi Office Supplies",
    contact: "Imran Sheikh",
    phone: "+92 300 2233445",
    productIds: ["p1", "p2", "p3", "p4", "p5"],
    openBalance: 42500,
  },
  {
    id: "s2",
    name: "Lahore Furniture Works",
    contact: "Sana Malik",
    phone: "+92 321 8877665",
    productIds: ["p9", "p10", "p11", "p12", "p13", "p14"],
    openBalance: 118000,
  },
  {
    id: "s3",
    name: "Islamabad Seating Co.",
    contact: "Bilal Ahmed",
    phone: "+92 333 4455667",
    productIds: ["p15", "p16", "p17", "p18"],
    openBalance: 0,
  },
  {
    id: "s4",
    name: "Velora Central Warehouse",
    contact: "Store Team",
    phone: "+92 42 111 888 999",
    productIds: ["p6", "p7", "p8"],
    openBalance: 15750,
  },
];

function supplierFor(productId: string) {
  return suppliers.find((s) => s.productIds.includes(productId))?.id ?? "s1";
}

export function seedStock(list: Product[] = products): StockItem[] {
  const rand = makeRandom(20260817);
  return list.map((p, index) => {
    const onHand = Math.floor(rand() * 42);
    const history = Array.from({ length: 8 }, (_, i) =>
      Math.max(0, onHand + Math.floor(rand() * 14) - 7 + (7 - i)),
    );
    return {
      productId: p.id,
      onHand,
      reserved: Math.floor(rand() * 3),
      reorderPoint: 6 + (index % 4) * 2,
      cost: Math.round(p.price * 0.62 * 100) / 100,
      supplierId: supplierFor(p.id),
      description: `${p.name} — stocked item for the ${p.category} range.`,
      active: true,
      history,
    };
  });
}

export const seedPurchaseOrders: PurchaseOrder[] = [
  {
    id: "po1",
    number: "PO/0001",
    supplierId: "s1",
    date: "2026-08-02",
    status: "received",
    lines: [
      { productId: "p1", qty: 20, cost: 29 },
      { productId: "p2", qty: 15, cost: 24.8 },
    ],
  },
  {
    id: "po2",
    number: "PO/0002",
    supplierId: "s2",
    date: "2026-08-08",
    status: "ordered",
    lines: [
      { productId: "p9", qty: 6, cost: 192.2 },
      { productId: "p11", qty: 10, cost: 89.9 },
    ],
  },
  {
    id: "po3",
    number: "PO/0003",
    supplierId: "s3",
    date: "2026-08-14",
    status: "draft",
    lines: [{ productId: "p15", qty: 12, cost: 108.5 }],
  },
  {
    id: "po4",
    number: "PO/0004",
    supplierId: "s4",
    date: "2026-07-28",
    status: "cancelled",
    lines: [{ productId: "p7", qty: 8, cost: 40.3 }],
  },
];

export const seedPricelists: PricelistDetail[] = [
  {
    id: "pl1",
    name: "Default Price",
    ruleType: "percentage",
    appliesTo: "All products",
    productCount: 18,
    customerCount: 4,
    rules: [{ id: "r1", scope: "All products", type: "percentage", value: 0 }],
  },
  {
    id: "pl2",
    name: "Wholesale",
    ruleType: "percentage",
    appliesTo: "All products",
    customerTag: "Trade",
    productCount: 18,
    customerCount: 2,
    rules: [
      { id: "r2", scope: "All products", type: "percentage", value: 10 },
      { id: "r3", scope: "Desks", type: "percentage", value: 14 },
    ],
  },
  {
    id: "pl3",
    name: "VIP",
    ruleType: "percentage",
    appliesTo: "All products",
    customerTag: "Loyalty",
    productCount: 18,
    customerCount: 1,
    rules: [{ id: "r4", scope: "All products", type: "percentage", value: 15 }],
  },
  {
    id: "pl4",
    name: "Ramadan Sale",
    ruleType: "fixed",
    appliesTo: "Chairs",
    startDate: "2027-02-18",
    endDate: "2027-03-19",
    productCount: 4,
    customerCount: 0,
    rules: [
      { id: "r5", scope: "Task Chair", type: "fixed", value: 149 },
      { id: "r6", scope: "Visitor Stool", type: "fixed", value: 59 },
    ],
  },
];



export const seedStaff: StaffUser[] = [
  { id: "u1", name: "Rida A.", email: "rida@veloramart.com", role: "Cashier" },
  { id: "u2", name: "Hamza Qureshi", email: "hamza@veloramart.com", role: "Manager" },
  { id: "u3", name: "Nadia Soomro", email: "nadia@veloramart.com", role: "Admin" },
  { id: "u4", name: "Usman Tariq", email: "usman@veloramart.com", role: "Cashier" },
];

export const seedStoreSettings: StoreSettings = {
  name: "Velora Mart",
  brand: "Velora POS",
  tagline: "Point of Sale, Simplified.",
  phone: "+92 21 3456 7890",
  email: "hello@veloramart.com",
  address: "42 Zamzama Boulevard, Karachi, Pakistan",
  currency: "Rs.",
  receiptFooter: "Thank you for shopping at Velora Mart. Exchanges accepted within 14 days.",
  logoName: "velora-logo.png",
  cashier: "Rida A.",
  network: "VeloraNet",
};

const cashiers = ["Rida A.", "Hamza Qureshi", "Usman Tariq"];

/** Builds ~30 days of sessions and sales ending on the supplied date. */
export function generateHistory(reference: Date) {
  const rand = makeRandom(880517);
  const sessions: SessionRecord[] = [];
  const sales: HistoricalSale[] = [];
  let orderSeq = 500;

  for (let dayOffset = 30; dayOffset >= 1; dayOffset--) {
    const date = new Date(reference);
    date.setDate(date.getDate() - dayOffset);
    const key = toDateKey(date);
    const isSunday = date.getDay() === 0;
    const sessionCount = isSunday ? 1 : rand() > 0.75 ? 2 : 1;

    for (let s = 0; s < sessionCount; s++) {
      const sessionId = `sess-${key}-${s + 1}`;
      const cashier = cashiers[Math.floor(rand() * cashiers.length)]!;
      const orderCount = isSunday ? 3 + Math.floor(rand() * 3) : 5 + Math.floor(rand() * 7);
      let cashSales = 0;
      let cardSales = 0;

      for (let o = 0; o < orderCount; o++) {
        const lineCount = 1 + Math.floor(rand() * 3);
        const lines: HistoricalSaleLine[] = [];
        for (let l = 0; l < lineCount; l++) {
          const product = products[Math.floor(rand() * products.length)]!;
          const qty = 1 + Math.floor(rand() * 3);
          lines.push({ productId: product.id, name: product.name, qty, unitPrice: product.price });
        }
        const net = lines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);
        const total = Math.round(net * 1.18 * 100) / 100;
        const method: HistoricalSale["method"] =
          rand() > 0.55 ? "Cash" : rand() > 0.15 ? "Card" : "Customer Account";
        if (method === "Cash") cashSales += total;
        else cardSales += total;
        orderSeq += 1;
        const hour = 9 + Math.floor(rand() * 10);
        const minute = Math.floor(rand() * 60);
        sales.push({
          id: `hs-${orderSeq}`,
          number: String(orderSeq),
          receipt: `RCP/${orderSeq}`,
          date: key,
          time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
          sessionId,
          cashier,
          method,
          lines,
          total,
        });
      }

      const totalSales = Math.round((cashSales + cardSales) * 100) / 100;
      // Most closes balance exactly; a couple of days carry a small variance.
      const varianceRoll = rand();
      const variance =
        varianceRoll > 0.9
          ? Math.round((rand() * 240 - 120) * 100) / 100
          : varianceRoll > 0.85
            ? -Math.round(rand() * 60 * 100) / 100
            : 0;

      sessions.push({
        id: sessionId,
        date: key,
        cashier,
        openedAt: s === 0 ? "09:00" : "14:30",
        closedAt: s === 0 ? (sessionCount > 1 ? "14:15" : "21:05") : "21:20",
        openingFloat: 500,
        totalSales,
        cashSales: Math.round(cashSales * 100) / 100,
        cardSales: Math.round(cardSales * 100) / 100,
        variance,
        orderCount,
      });
    }
  }

  return { sessions, sales };
}

export function stockStatus(item: { onHand: number; reserved: number; reorderPoint: number }) {
  const available = item.onHand - item.reserved;
  if (available <= 0) return "out" as const;
  if (available <= item.reorderPoint) return "low" as const;
  return "healthy" as const;
}
