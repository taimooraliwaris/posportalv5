import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { usePersistentState } from "./use-persistent-state";
import {
  generateHistory,
  seedPricelists,
  seedPurchaseOrders,
  seedStaff,
  seedStock,
  seedStoreSettings,
  seedTaxes,
  suppliers as seedSuppliers,
  type HistoricalSale,
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

  storeSettings: StoreSettings;
  updateStoreSettings: (patch: Partial<StoreSettings>) => void;

  sessions: SessionRecord[];
  sales: HistoricalSale[];
};

const BackendContext = createContext<BackendState | null>(null);

export function BackendProvider({ children }: { children: ReactNode }) {
  const [stock, setStock] = useState<StockItem[]>(() => seedStock());
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>(seedSuppliers);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(seedPurchaseOrders);
  const [pricelists, setPricelists] = usePersistentState<PricelistDetail[]>(
    "velora.pricelists",
    seedPricelists,
  );
  const [taxes, setTaxes] = usePersistentState<TaxRate[]>("velora.taxes", seedTaxes);
  const [staff, setStaff] = useState<StaffUser[]>(seedStaff);
  const [storeSettings, setStoreSettings] = usePersistentState<StoreSettings>(
    "velora.store-settings",
    seedStoreSettings,
  );
  const history = useMemo(() => generateHistory(new Date()), []);

  const value: BackendState = {
    stock,
    stockFor: (productId) => stock.find((s) => s.productId === productId),
    adjustStock: (productId, to, reason) => {
      setStock((prev) =>
        prev.map((s) => {
          if (s.productId !== productId) return s;
          setAdjustments((list) => [
            {
              id: `adj-${Math.random().toString(36).slice(2, 8)}`,
              productId,
              from: s.onHand,
              to,
              reason,
              date: new Date().toISOString().slice(0, 10),
            },
            ...list,
          ]);
          return { ...s, onHand: to, history: [...s.history.slice(1), to] };
        }),
      );
    },
    setProductMeta: (productId, patch) => {
      setStock((prev) => prev.map((s) => (s.productId === productId ? { ...s, ...patch } : s)));
    },
    addStockItem: (item) => setStock((prev) => [item, ...prev]),
    adjustments,
    suppliers,
    addSupplier: (s) =>
      setSuppliers((prev) => [
        { ...s, id: `s-${Math.random().toString(36).slice(2, 8)}` },
        ...prev,
      ]),
    updateSupplier: (id, patch) =>
      setSuppliers((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s))),
    purchaseOrders,
    addPurchaseOrder: (po) =>
      setPurchaseOrders((prev) => [
        {
          ...po,
          id: `po-${Math.random().toString(36).slice(2, 8)}`,
          number: `PO/${String(prev.length + 1).padStart(4, "0")}`,
        },
        ...prev,
      ]),
    setPurchaseOrderStatus: (id, status) => {
      setPurchaseOrders((prev) =>
        prev.map((po) => {
          if (po.id !== id) return po;
          if (status === "received" && po.status !== "received") {
            setStock((items) =>
              items.map((item) => {
                const line = po.lines.find((l) => l.productId === item.productId);
                return line ? { ...item, onHand: item.onHand + line.qty } : item;
              }),
            );
          }
          return { ...po, status };
        }),
      );
    },
    pricelists,
    addPricelist: (p) =>
      setPricelists((prev) => [
        ...prev,
        { ...p, id: `pl-${Math.random().toString(36).slice(2, 8)}` },
      ]),
    updatePricelist: (id, patch) =>
      setPricelists((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p))),
    removePricelist: (id) => setPricelists((prev) => prev.filter((p) => p.id !== id)),
    taxes,
    saveTax: (tax) =>
      setTaxes((prev) =>
        prev.some((t) => t.id === tax.id)
          ? prev.map((t) => (t.id === tax.id ? tax : t))
          : [...prev, tax],
      ),
    removeTax: (id) => setTaxes((prev) => prev.filter((t) => t.id !== id)),
    staff,
    saveStaff: (user) =>
      setStaff((prev) =>
        prev.some((u) => u.id === user.id)
          ? prev.map((u) => (u.id === user.id ? user : u))
          : [...prev, user],
      ),
    storeSettings,
    updateStoreSettings: (patch) => setStoreSettings((prev) => ({ ...prev, ...patch })),
    sessions: history.sessions,
    sales: history.sales,
  };

  return <BackendContext.Provider value={value}>{children}</BackendContext.Provider>;
}

export function useBackend() {
  const ctx = useContext(BackendContext);
  if (!ctx) throw new Error("useBackend must be used inside BackendProvider");
  return ctx;
}
