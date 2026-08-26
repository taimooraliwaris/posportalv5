import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  cloudKeys,
  fetchOrders,
  fetchPricelists,
  fetchPurchaseOrders,
  fetchStaff,
  fetchStock,
  fetchStockAdjustments,
  fetchStoreSettings,
  fetchSuppliers,
  fetchTaxes,
  fromPricelist,
  fromPurchaseOrder,
  fromStockItem,
  fromStoreSettings,
  fromSupplier,
  fromTaxRate,
  randomId,
} from "./cloud-data";
import {
  seedPricelists,
  seedStaff,
  seedStock,
  seedStoreSettings,
  seedTaxes,
  suppliers as seedSuppliers,
  type HistoricalSale,
  type HistoricalSaleLine,
  type PricelistDetail,
  type PurchaseOrder,
  type SessionRecord,
  type StaffUser,
  type StockItem,
  type StoreSettings,
  type Supplier,
  type TaxRate,
} from "./backend-data";

export type StockAdjustment = {
  id: string;
  productId: string;
  from: number;
  to: number;
  reason: string;
  date: string;
};

type BackendState = {
  stock: StockItem[];
  stockFor: (productId: string) => StockItem | undefined;
  adjustStock: (productId: string, to: number, reason: string) => void;
  setProductMeta: (productId: string, patch: Partial<StockItem>) => void;
  addStockItem: (item: StockItem) => void;
  adjustments: StockAdjustment[];

  suppliers: Supplier[];
  addSupplier: (s: Omit<Supplier, "id">) => void;
  updateSupplier: (id: string, patch: Partial<Supplier>) => void;

  purchaseOrders: PurchaseOrder[];
  addPurchaseOrder: (po: Omit<PurchaseOrder, "id" | "number">) => void;
  setPurchaseOrderStatus: (id: string, status: PurchaseOrder["status"]) => void;

  pricelists: PricelistDetail[];
  addPricelist: (p: Omit<PricelistDetail, "id">) => void;
  updatePricelist: (id: string, patch: Partial<PricelistDetail>) => void;
  removePricelist: (id: string) => void;

  taxes: TaxRate[];
  saveTax: (tax: TaxRate) => void;
  removeTax: (id: string) => void;

  staff: StaffUser[];
  saveStaff: (user: StaffUser) => void;
  removeStaff: (id: string) => void;

  storeSettings: StoreSettings;
  updateStoreSettings: (patch: Partial<StoreSettings>) => void;

  sessions: SessionRecord[];
  sales: HistoricalSale[];

  lowStock: StockItem[];

  /** True until the first cloud read for inventory data settles. */
  loading: boolean;
};

const BackendContext = createContext<BackendState | null>(null);

export function BackendProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  // Every cloud read below is staff-only, so nothing is fetched until a real
  // session exists. Pre-auth renders fall back to the seed data.
  const { session } = useAuth();
  const signedIn = Boolean(session);

  const stockQuery = useQuery({
    queryKey: cloudKeys.stock,
    queryFn: fetchStock,
    enabled: signedIn,
  });
  const adjustmentsQuery = useQuery({
    queryKey: cloudKeys.adjustments,
    queryFn: fetchStockAdjustments,
    enabled: signedIn,
  });
  const suppliersQuery = useQuery({
    queryKey: cloudKeys.suppliers,
    queryFn: fetchSuppliers,
    enabled: signedIn,
  });
  const poQuery = useQuery({
    queryKey: cloudKeys.purchaseOrders,
    queryFn: fetchPurchaseOrders,
    enabled: signedIn,
  });
  const pricelistsQuery = useQuery({
    queryKey: cloudKeys.pricelists,
    queryFn: fetchPricelists,
    enabled: signedIn,
  });
  const taxesQuery = useQuery({
    queryKey: cloudKeys.taxes,
    queryFn: fetchTaxes,
    enabled: signedIn,
  });
  const settingsQuery = useQuery({
    queryKey: cloudKeys.storeSettings,
    queryFn: fetchStoreSettings,
  });
  const staffQuery = useQuery({
    queryKey: cloudKeys.staff,
    queryFn: fetchStaff,
    enabled: signedIn,
  });
  // Shares the React Query cache with PosProvider — no extra network round-trip.
  const ordersQuery = useQuery({
    queryKey: cloudKeys.orders,
    queryFn: fetchOrders,
    enabled: signedIn,
  });


  const seededStock = useMemo(() => seedStock(), []);
  const stock = stockQuery.data ?? seededStock;
  const adjustments = adjustmentsQuery.data ?? [];
  const suppliers = suppliersQuery.data ?? seedSuppliers;
  const purchaseOrders = poQuery.data ?? [];
  const pricelists = pricelistsQuery.data ?? seedPricelists;
  const taxes = taxesQuery.data ?? seedTaxes;
  const storeSettings = { ...seedStoreSettings, ...(settingsQuery.data ?? {}) };
  const staff = staffQuery.data?.length ? staffQuery.data : seedStaff;

  /** Derive sessions and sales from real persisted orders in the cloud. */
  const { sessions, sales } = useMemo<{
    sessions: SessionRecord[];
    sales: HistoricalSale[];
  }>(() => {
    const allOrders = ordersQuery.data ?? [];
    // Only settled orders feed reports; skip ongoing / payment-in-progress.
    const completedOrders = allOrders.filter(
      (o) => o.status === "paid" || o.status === "returned" || o.status === "exchanged",
    );

    const cashierFallback =
      settingsQuery.data?.cashier ?? seedStoreSettings.cashier;

    // ── Convert each completed order into a HistoricalSale ─────────────────
    const sales: HistoricalSale[] = completedOrders.map((order) => {
      // Determine dominant payment method by amount collected
      const methodTotals: Record<string, number> = {};
      for (const p of order.payments) {
        methodTotals[p.method] = (methodTotals[p.method] ?? 0) + p.amount;
      }
      const paymentMethods = ["Cash", "Card", "Customer Account"] as const;
      const method: HistoricalSale["method"] = paymentMethods.reduce(
        (best, m) => ((methodTotals[m] ?? 0) >= (methodTotals[best] ?? 0) ? m : best),
        "Cash" as HistoricalSale["method"],
      );

      // Use actual payments sum; fall back to 0 for edge cases
      const total =
        Math.round(
          order.payments.reduce((s, p) => s + p.amount, 0) * 100,
        ) / 100;

      const date = order.date ?? new Date().toISOString().slice(0, 10);
      const cashier = order.cashier || cashierFallback;

      const lines: HistoricalSaleLine[] = order.lines.map((l) => ({
        productId: l.productId,
        name: l.name,
        qty: l.qty,
        unitPrice: l.unitPrice,
      }));

      return {
        id: order.id,
        number: order.number,
        receipt: order.receipt,
        date,
        time: order.time,
        sessionId: `sess-${date}`,
        cashier,
        method,
        lines,
        total,
      };
    });

    // ── Group sales by date to synthesise SessionRecords ───────────────────
    const byDate = new Map<string, HistoricalSale[]>();
    for (const s of sales) {
      const bucket = byDate.get(s.date) ?? [];
      bucket.push(s);
      byDate.set(s.date, bucket);
    }

    const sessions: SessionRecord[] = Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dateSales]) => {
        const cashSales =
          Math.round(
            dateSales
              .filter((s) => s.method === "Cash")
              .reduce((sum, s) => sum + s.total, 0) * 100,
          ) / 100;
        const cardSales =
          Math.round(
            dateSales
              .filter((s) => s.method === "Card")
              .reduce((sum, s) => sum + s.total, 0) * 100,
          ) / 100;
        const totalSales =
          Math.round(dateSales.reduce((sum, s) => sum + s.total, 0) * 100) / 100;

        return {
          id: `sess-${date}`,
          date,
          cashier: dateSales[0]?.cashier ?? cashierFallback,
          openedAt: "09:00",
          closedAt: "21:00",
          openingFloat: 500,
          totalSales,
          cashSales,
          cardSales,
          variance: 0,
          orderCount: dateSales.length,
        };
      });

    return { sessions, sales };
  }, [ordersQuery.data, settingsQuery.data]);

  const write = useMutation({
    mutationFn: async (run: () => PromiseLike<{ error: { message: string } | null }>) => {
      const { error } = await run();
      if (error) throw new Error(error.message);
    },
    onError: (error: Error) => {
      toast.error(error.message);
      void queryClient.invalidateQueries({ queryKey: ["cloud"] });
    },
  });

  /** Optimistically patch a cached list, then push the change to the cloud. */
  function patchCache<T>(key: readonly unknown[], fallback: T[], updater: (list: T[]) => T[]) {
    queryClient.setQueryData<T[]>(key, (prev) => updater(prev ?? fallback));
  }

  const value: BackendState = {
    stock,
    stockFor: (productId) => stock.find((s) => s.productId === productId),
    adjustStock: (productId, to, reason) => {
      const current = stock.find((s) => s.productId === productId);
      if (!current) return;
      const next: StockItem = { ...current, onHand: to, history: [...current.history.slice(1), to] };
      patchCache<StockItem>(cloudKeys.stock, stock, (list) =>
        list.map((s) => (s.productId === productId ? next : s)),
      );
      patchCache<StockAdjustment>(cloudKeys.adjustments, adjustments, (list) => [
        {
          id: randomId("adj"),
          productId,
          from: current.onHand,
          to,
          reason,
          date: new Date().toISOString().slice(0, 10),
        },
        ...list,
      ]);
      write.mutate(() => supabase.from("stock_items").upsert(fromStockItem(next)));
      write.mutate(() =>
        supabase.from("stock_adjustments").insert({
          product_id: productId,
          from_qty: current.onHand,
          to_qty: to,
          reason,
        }),
      );
    },
    setProductMeta: (productId, patch) => {
      const current = stock.find((s) => s.productId === productId);
      if (!current) return;
      const next = { ...current, ...patch };
      patchCache<StockItem>(cloudKeys.stock, stock, (list) =>
        list.map((s) => (s.productId === productId ? next : s)),
      );
      write.mutate(() => supabase.from("stock_items").upsert(fromStockItem(next)));
    },
    addStockItem: (item) => {
      patchCache<StockItem>(cloudKeys.stock, stock, (list) => [item, ...list]);
      write.mutate(() => supabase.from("stock_items").upsert(fromStockItem(item)));
    },
    adjustments,

    suppliers,
    addSupplier: (s) => {
      const supplier: Supplier = { ...s, id: randomId("s") };
      patchCache<Supplier>(cloudKeys.suppliers, suppliers, (list) => [supplier, ...list]);
      write.mutate(() => supabase.from("suppliers").insert(fromSupplier(supplier)));
    },
    updateSupplier: (id, patch) => {
      const current = suppliers.find((s) => s.id === id);
      if (!current) return;
      const next = { ...current, ...patch };
      patchCache<Supplier>(cloudKeys.suppliers, suppliers, (list) =>
        list.map((s) => (s.id === id ? next : s)),
      );
      write.mutate(() => supabase.from("suppliers").upsert(fromSupplier(next)));
    },

    purchaseOrders,
    addPurchaseOrder: (po) => {
      const order: PurchaseOrder = {
        ...po,
        id: crypto.randomUUID(),
        number: `PO/${String(purchaseOrders.length + 1).padStart(4, "0")}`,
      };
      patchCache<PurchaseOrder>(cloudKeys.purchaseOrders, purchaseOrders, (list) => [
        order,
        ...list,
      ]);
      write.mutate(() => supabase.from("purchase_orders").insert(fromPurchaseOrder(order)));
    },
    setPurchaseOrderStatus: (id, status) => {
      const po = purchaseOrders.find((p) => p.id === id);
      if (!po) return;
      const next = { ...po, status };
      patchCache<PurchaseOrder>(cloudKeys.purchaseOrders, purchaseOrders, (list) =>
        list.map((p) => (p.id === id ? next : p)),
      );
      write.mutate(() => supabase.from("purchase_orders").upsert(fromPurchaseOrder(next)));

      // Receiving a PO rolls its quantities into on-hand stock.
      if (status === "received" && po.status !== "received") {
        const received = stock.map((item) => {
          const line = po.lines.find((l) => l.productId === item.productId);
          return line ? { ...item, onHand: item.onHand + line.qty } : item;
        });
        patchCache<StockItem>(cloudKeys.stock, stock, () => received);
        const touched = received.filter((item) =>
          po.lines.some((l) => l.productId === item.productId),
        );
        if (touched.length)
          write.mutate(() => supabase.from("stock_items").upsert(touched.map(fromStockItem)));
      }
    },

    pricelists,
    addPricelist: (p) => {
      const list: PricelistDetail = { ...p, id: randomId("pl") };
      patchCache<PricelistDetail>(cloudKeys.pricelists, pricelists, (prev) => [...prev, list]);
      write.mutate(() => supabase.from("pricelists").insert(fromPricelist(list)));
    },
    updatePricelist: (id, patch) => {
      const current = pricelists.find((p) => p.id === id);
      if (!current) return;
      const next = { ...current, ...patch };
      patchCache<PricelistDetail>(cloudKeys.pricelists, pricelists, (prev) =>
        prev.map((p) => (p.id === id ? next : p)),
      );
      write.mutate(() => supabase.from("pricelists").upsert(fromPricelist(next)));
    },
    removePricelist: (id) => {
      patchCache<PricelistDetail>(cloudKeys.pricelists, pricelists, (prev) =>
        prev.filter((p) => p.id !== id),
      );
      write.mutate(() => supabase.from("pricelists").delete().eq("id", id));
    },

    taxes,
    saveTax: (tax) => {
      patchCache<TaxRate>(cloudKeys.taxes, taxes, (prev) =>
        prev.some((t) => t.id === tax.id)
          ? prev.map((t) => (t.id === tax.id ? tax : t))
          : [...prev, tax],
      );
      write.mutate(() => supabase.from("tax_rates").upsert(fromTaxRate(tax)));
    },
    removeTax: (id) => {
      patchCache<TaxRate>(cloudKeys.taxes, taxes, (prev) => prev.filter((t) => t.id !== id));
      write.mutate(() => supabase.from("tax_rates").delete().eq("id", id));
    },

    staff,
    saveStaff: (user) => {
      patchCache<StaffUser>(cloudKeys.staff, staff, (prev) =>
        prev.some((u) => u.id === user.id)
          ? prev.map((u) => (u.id === user.id ? user : u))
          : [...prev, user],
      );
      write.mutate(() => supabase.from("profiles").update({ name: user.name }).eq("id", user.id));
      write.mutate(() =>
        supabase.from("user_roles").upsert(
          { user_id: user.id, role: user.role },
          { onConflict: "user_id,role" },
        ),
      );
    },
    removeStaff: (id) => {
      patchCache<StaffUser>(cloudKeys.staff, staff, (prev) => prev.filter((u) => u.id !== id));
      write.mutate(() => supabase.from("user_roles").delete().eq("user_id", id));
    },

    storeSettings,
    updateStoreSettings: (patch) => {
      const next = { ...storeSettings, ...patch };
      queryClient.setQueryData<StoreSettings>(cloudKeys.storeSettings, next);
      write.mutate(() => supabase.from("store_settings").upsert(fromStoreSettings(next)));
    },

    sessions,
    sales,
    lowStock: stock.filter((s) => s.active && s.onHand - s.reserved <= s.reorderPoint),
    loading: stockQuery.isLoading || suppliersQuery.isLoading,
  };

  return <BackendContext.Provider value={value}>{children}</BackendContext.Provider>;
}

/** Global store identity — always read through this so settings apply app-wide. */
export function useStore() {
  return useBackend().storeSettings;
}

export function useBackend() {
  const ctx = useContext(BackendContext);
  if (!ctx) throw new Error("useBackend must be used inside BackendProvider");
  return ctx;
}
