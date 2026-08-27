// @ts-nocheck
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "./auth-context";
import {
  categories as seedCategories,
  products as seedProducts,
  seedCustomers,
  type Category,
  type Customer,
  type Product,
} from "./pos-data";
import {
  cloudKeys,
  fetchCashMoves,
  fetchCategories,
  fetchCustomers,
  fetchOrders,
  fetchProducts,
  fetchReturns,
  
  fromOrder,
  fromReturnRecord,
  randomId,
} from "./cloud-data";

import {
  calculateOrderTotals,
  resolveProductTaxRate,
  type CalculatedOrderTotals,
  type TaxBreakdownItem,
} from "./tax-resolver";
export {
  calculateOrderTotals,
  resolveProductTaxRate,
  type CalculatedOrderTotals,
  type TaxBreakdownItem,
};

export type CartLine = {
  id: string;
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
  discount: number;
};

export type PaymentLine = {
  id: string;
  method: "Cash" | "Card" | "Customer Account";
  amount: number;
};

export type OrderStatus =
  | "ongoing"
  | "payment"
  | "paid"
  | "cancelled"
  | "returned"
  | "exchanged";

export type ReturnLine = {
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
  reason: string;
};

export type ReturnRecord = {
  id: string;
  number: string;
  kind: "return" | "exchange";
  date: string;
  time: string;
  originalOrderId: string;
  originalNumber: string;
  lines: ReturnLine[];
  replacements: ReturnLine[];
  refundAmount: number;
  difference: number;
  method: PaymentLine["method"];
  processedBy: string;
};

export type Order = {
  id: string;
  number: string;
  receipt: string;
  time: string;
  date?: string;
  cashier?: string;
  status: OrderStatus;
  lines: CartLine[];
  payments: PaymentLine[];
  customerId?: string;
  note?: string;
  noteTags: string[];
  pricelistId: string;
};

export type CashMove = { id: string; type: "in" | "out"; amount: number; reason: string };

function now() {
  return new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function makeOrder(number: string, cashierName = ""): Order {
  return {
    id: `o-${number}-${Math.random().toString(36).slice(2, 6)}`,
    number,
    receipt: `RCP/${number}`,
    time: now(),
    date: new Date().toISOString().slice(0, 10),
    status: "ongoing",
    lines: [],
    payments: [],
    noteTags: [],
    pricelistId: "pl1",
    cashier: cashierName,
  };
}

export function orderTotals(
  order: Order | undefined,
  discountRate = 0,
  options?: {
    taxes?: TaxRate[];
    products?: Product[];
    categories?: Category[];
  },
) {
  const lines = order?.lines ?? [];
  return calculateOrderTotals(lines, discountRate, options);
}

type PosState = {
  registerOpen: boolean;
  openingCash: number;
  openRegister: (amount: number) => void;
  closeRegister: (counted: number, note: string) => void;
  closedSummary: { counted: number; note: string } | null;
  orders: Order[];
  activeOrderId: string;
  activeOrder: Order | undefined;
  setActiveOrderId: (id: string) => void;
  newOrder: () => void;
  deleteOrder: (id: string) => void;
  updateOrder: (id: string, patch: Partial<Order>) => void;
  selectedLineId: string | null;
  setSelectedLineId: (id: string | null) => void;
  addProduct: (product: Product) => void;
  addProducts: (products: { product: Product; qty: number }[]) => void;
  addByBarcode: (code: string) => Product | null;
  findByBarcode: (code: string) => Product | null;
  updateLine: (lineId: string, patch: Partial<CartLine>) => void;
  removeLine: (lineId: string) => void;
  addPayment: (method: PaymentLine["method"], amount: number) => void;
  updatePayment: (id: string, amount: number) => void;
  removePayment: (id: string) => void;
  validateOrder: () => void;
  customers: Customer[];
  addCustomer: (c: Omit<Customer, "id">) => Customer;
  productList: Product[];
  addProductToCatalog: (p: Omit<Product, "id">) => Product;
  categoryList: Category[];
  addCategory: (name: string) => Category;
  cashMoves: CashMove[];
  addCashMove: (m: Omit<CashMove, "id">) => void;
  lastPaidOrder: Order | null;
  returns: ReturnRecord[];
  processReturn: (
    input: Omit<ReturnRecord, "id" | "number" | "date" | "time">,
  ) => ReturnRecord;
  updateProductInCatalog: (id: string, patch: Partial<Product>) => void;
  
  /** True until the first cloud read for catalog data settles. */
  loading: boolean;
};

const PosContext = createContext<PosState | null>(null);

const tonePalette = ["pink", "sand", "sage", "sky"] as const;

export function PosProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  // Catalog and order data is staff-only: hold every read (and every write)
  // until a session exists, otherwise the sign-in screen would try to create
  // and save an order as an anonymous visitor.
  const { session, currentUser } = useAuth();
  const signedIn = Boolean(session);

  const productsQuery = useQuery({
    queryKey: cloudKeys.products,
    queryFn: fetchProducts,
    enabled: signedIn,
  });
  const categoriesQuery = useQuery({
    queryKey: cloudKeys.categories,
    queryFn: fetchCategories,
    enabled: signedIn,
  });
  const customersQuery = useQuery({
    queryKey: cloudKeys.customers,
    queryFn: fetchCustomers,
    enabled: signedIn,
  });
  const ordersQuery = useQuery({
    queryKey: cloudKeys.orders,
    queryFn: fetchOrders,
    enabled: signedIn,
  });
  const returnsQuery = useQuery({
    queryKey: cloudKeys.returns,
    queryFn: fetchReturns,
    enabled: signedIn,
  });
  const cashQuery = useQuery({
    queryKey: cloudKeys.cashMoves,
    queryFn: fetchCashMoves,
    enabled: signedIn,
  });
  const taxesQuery = useQuery({
    queryKey: cloudKeys.taxes,
    queryFn: fetchTaxes,
    enabled: signedIn,
  });

  const productList = productsQuery.data ?? seedProducts;
  const categoryList = categoriesQuery.data ?? seedCategories;
  const customers = customersQuery.data ?? seedCustomers;
  const taxes = taxesQuery.data ?? seedTaxes;

  /* ---------------------------------------------------------------- orders */
  // Cart edits stay in local state for instant feedback and are mirrored to the
  // cloud on every change, so a reload (or another till) sees the same tabs.
  const [localOrders, setLocalOrders] = useState<Order[] | null>(null);
  const [activeOrderId, setActiveOrderId] = useState("");
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [openingCash, setOpeningCash] = useState(0);
  const [lastPaidOrder, setLastPaidOrder] = useState<Order | null>(null);
  const [closedSummary, setClosedSummary] = useState<{ counted: number; note: string } | null>(
    null,
  );

  const cashMoves = cashQuery.data ?? [];
  const returns = returnsQuery.data ?? [];
  const orders = localOrders ?? ordersQuery.data ?? [];

  // Seed local order state from the cloud once, then own it locally. Waits for
  // an authenticated read so we never invent an order the backend will reject.
  useEffect(() => {
    if (!signedIn || localOrders || !ordersQuery.data) return;
    const cloudOrders = ordersQuery.data;
    const ongoing = cloudOrders.find((o) => o.status === "ongoing" || o.status === "payment");
    if (ongoing) {
      setLocalOrders(cloudOrders);
      setActiveOrderId(ongoing.id);
      return;
    }
    const next = nextOrderNumber(cloudOrders);
    const fresh = makeOrder(next, currentUser?.name ?? "");
    setLocalOrders([fresh, ...cloudOrders]);
    setActiveOrderId(fresh.id);
    void persist(fresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, ordersQuery.data, localOrders]);

  const activeOrder = orders.find((o) => o.id === activeOrderId);

  const pendingWrites = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const signedInRef = useRef(signedIn);
  signedInRef.current = signedIn;

  /** Debounced upsert so a burst of cart edits becomes one write. */
  const persist = useCallback((order: Order) => {
    const timers = pendingWrites.current;
    const existing = timers.get(order.id);
    if (existing) clearTimeout(existing);
    timers.set(
      order.id,
      setTimeout(() => {
        timers.delete(order.id);
        // Signed out (or signing in): keep the cart local instead of firing a
        // write the backend will reject.
        if (!signedInRef.current) return;
        void supabase
          .from("orders")
          .upsert(fromOrder(order, currentUser?.name ?? ""))
          .then(({ error }) => {
            if (error) toast.error(`Could not save order ${order.number}: ${error.message}`);
          });
      }, 400),
    );
  }, [currentUser?.name]);

  const mutateOrders = useCallback(
    (updater: (list: Order[]) => Order[], persistIds?: string[]) => {
      setLocalOrders((prev) => {
        const base = prev ?? ordersQuery.data ?? [];
        const next = updater(base);
        const ids = persistIds ?? [activeOrderId];
        ids.forEach((id) => {
          const order = next.find((o) => o.id === id);
          if (order) persist(order);
        });
        return next;
      });
    },
    [activeOrderId, ordersQuery.data, persist],
  );

  const updateOrder = useCallback(
    (id: string, patch: Partial<Order>) => {
      mutateOrders(
        (prev) =>
          prev.map((o) => {
            if (o.id !== id) return o;
            const next = { ...o, ...patch };
            if ("customerId" in patch && !patch.customerId) {
              delete next.customerId;
            }
            return next;
          }),
        [id],
      );
    },
    [mutateOrders],
  );

  const addProducts = useCallback(
    (items: { product: Product; qty: number }[]) => {
      if (items.length === 0) return;
      mutateOrders((prev) =>
        prev.map((o) => {
          if (o.id !== activeOrderId) return o;
          let lines = o.lines;
          for (const { product, qty } of items) {
            const existing = lines.find((l) => l.productId === product.id);
            lines = existing
              ? lines.map((l) => (l.id === existing.id ? { ...l, qty: l.qty + qty } : l))
              : [
                  ...lines,
                  {
                    id: `l-${Math.random().toString(36).slice(2, 8)}`,
                    productId: product.id,
                    name: product.name,
                    qty,
                    unitPrice: product.price,
                    discount: 0,
                  },
                ];
          }
          return { ...o, lines };
        }),
      );
    },
    [activeOrderId, mutateOrders],
  );

  const addProduct = useCallback(
    (product: Product) => addProducts([{ product, qty: 1 }]),
    [addProducts],
  );

  const findByBarcode = useCallback(
    (code: string) => {
      const trimmed = code.trim();
      return (
        productList.find((p) => p.barcode === trimmed) ??
        productList.find((p) => p.id === trimmed) ??
        null
      );
    },
    [productList],
  );

  const addByBarcode = useCallback(
    (code: string) => {
      const product = findByBarcode(code);
      if (product) addProduct(product);
      return product;
    },
    [findByBarcode, addProduct],
  );

  /* ------------------------------------------------------------ catalog IO */

  const write = useMutation({
    mutationFn: async (run: () => PromiseLike<{ error: { message: string } | null }>) => {
      const { error } = await run();
      if (error) throw new Error(error.message);
    },
    onError: (error: Error, _vars, _ctx) => {
      toast.error(error.message);
      void queryClient.invalidateQueries({ queryKey: ["cloud"] });
    },
  });

  const value: PosState = {
    registerOpen,
    openingCash,
    openRegister: (amount) => {
      setOpeningCash(amount);
      setRegisterOpen(true);
      setClosedSummary(null);
    },
    closeRegister: (counted, note) => {
      setRegisterOpen(false);
      setClosedSummary({ counted, note });
    },
    closedSummary,
    orders,
    activeOrderId,
    activeOrder,
    setActiveOrderId,
    newOrder: () => {
      const order = makeOrder(nextOrderNumber(orders), currentUser?.name ?? "");
      mutateOrders((prev) => [order, ...prev], [order.id]);
      setActiveOrderId(order.id);
    },
    deleteOrder: (id) => {
      const remaining = orders.filter((o) => o.id !== id);
      if (remaining.length === 0) {
        const order = makeOrder(nextOrderNumber(orders), currentUser?.name ?? "");
        setLocalOrders([order]);
        setActiveOrderId(order.id);
        persist(order);
      } else {
        setLocalOrders(remaining);
        if (id === activeOrderId) setActiveOrderId(remaining[0]!.id);
      }
      write.mutate(() => supabase.from("orders").delete().eq("id", id));
    },
    updateOrder,
    selectedLineId,
    setSelectedLineId,
    addProduct,
    addProducts,
    addByBarcode,
    findByBarcode,
    updateLine: (lineId, patch) => {
      mutateOrders((prev) =>
        prev.map((o) =>
          o.id === activeOrderId
            ? { ...o, lines: o.lines.map((l) => (l.id === lineId ? { ...l, ...patch } : l)) }
            : o,
        ),
      );
    },
    removeLine: (lineId) => {
      mutateOrders((prev) =>
        prev.map((o) =>
          o.id === activeOrderId ? { ...o, lines: o.lines.filter((l) => l.id !== lineId) } : o,
        ),
      );
      setSelectedLineId(null);
    },
    addPayment: (method, amount) => {
      mutateOrders((prev) =>
        prev.map((o) =>
          o.id === activeOrderId
            ? {
                ...o,
                status: "payment",
                payments: [
                  ...o.payments,
                  { id: `pay-${Math.random().toString(36).slice(2, 8)}`, method, amount },
                ],
              }
            : o,
        ),
      );
    },
    updatePayment: (id, amount) => {
      mutateOrders((prev) =>
        prev.map((o) =>
          o.id === activeOrderId
            ? { ...o, payments: o.payments.map((p) => (p.id === id ? { ...p, amount } : p)) }
            : o,
        ),
      );
    },
    removePayment: (id) => {
      mutateOrders((prev) =>
        prev.map((o) =>
          o.id === activeOrderId ? { ...o, payments: o.payments.filter((p) => p.id !== id) } : o,
        ),
      );
    },
    validateOrder: () => {
      const paid = orders.find((o) => o.id === activeOrderId);
      if (!paid) return;
      const settled: Order = { ...paid, status: "paid", time: now() };
      setLastPaidOrder(settled);

      // Persist the settled order immediately to Supabase
      write.mutate(() =>
        supabase.from("orders").upsert(fromOrder(settled, currentUser?.name ?? "")),
      );

      mutateOrders((prev) => {
        const updated = prev.map((o) => (o.id === settled.id ? settled : o));
        const otherOngoing = updated.find(
          (o) => o.id !== settled.id && (o.status === "ongoing" || o.status === "payment"),
        );
        if (otherOngoing) {
          setActiveOrderId(otherOngoing.id);
          setSelectedLineId(null);
          return updated;
        }
        const fresh = makeOrder(nextOrderNumber(updated), currentUser?.name ?? "");
        setActiveOrderId(fresh.id);
        setSelectedLineId(null);
        persist(fresh);
        return [fresh, ...updated];
      }, [settled.id]);
    },
    customers,
    addCustomer: (c) => {
      const created: Customer = { ...c, id: randomId("c") };
      queryClient.setQueryData<Customer[]>(cloudKeys.customers, (prev) => [
        created,
        ...(prev ?? []),
      ]);
      write.mutate(() =>
        supabase.from("customers").upsert({
          id: created.id,
          name: created.name,
          email: created.email,
          location: created.location ?? null,
          phone: created.phone ?? null,
          company: created.company ?? null,
        }),
      );
      return created;
    },
    productList,
    addProductToCatalog: (p) => {
      const created: Product = { ...p, id: crypto.randomUUID() } as any;
      queryClient.setQueryData<Product[]>(cloudKeys.products, (prev) => [
        created,
        ...(prev ?? productList),
      ]);
      write.mutate(() =>
        supabase.from("products").upsert({
          id: created.id,
          name_en: created.name,
          sale_price: created.price,
          cost_price: created.cost_price || 0,
          category_id: created.category_id || created.category,
          item_code: created.barcode || created.item_code,
          stock_qty: created.stock_qty || 0,
          specs: created.specs || {},
          vehicle_model_id: created.vehicle_model_id || null,
        }),
      );
      return created;
    },
    categoryList,
    addCategory: (name) => {
      const created: Category = {
        id: name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        name: name.trim(),
        tone: tonePalette[categoryList.length % 4]!,
      };
      if (categoryList.some((c) => c.id === created.id)) return created;
      queryClient.setQueryData<Category[]>(cloudKeys.categories, (prev) => [
        ...(prev ?? categoryList),
        created,
      ]);
      write.mutate(() =>
        supabase
          .from("product_categories")
          .insert({ id: created.id, name: created.name, tone: created.tone }),
      );
      return created;
    },
    cashMoves,
    addCashMove: (m) => {
      const created: CashMove = { ...m, id: randomId("cm") };
      queryClient.setQueryData<CashMove[]>(cloudKeys.cashMoves, (prev) => [
        ...(prev ?? []),
        created,
      ]);
      write.mutate(() =>
        supabase.from("cash_moves").insert({
          id: created.id,
          move_type: created.type,
          amount: created.amount,
          reason: created.reason,
        }),
      );
    },
    lastPaidOrder,
    returns,
    processReturn: (input) => {
      const seq = returns.length + 1;
      const record: ReturnRecord = {
        ...input,
        id: randomId("ret"),
        number: `${input.kind === "return" ? "R" : "X"}/${String(1000 + seq)}`,
        date: new Date().toISOString().slice(0, 10),
        time: now(),
      };
      queryClient.setQueryData<ReturnRecord[]>(cloudKeys.returns, (prev) => [
        record,
        ...(prev ?? []),
      ]);
      write.mutate(() => supabase.from("return_records").insert(fromReturnRecord(record)));

      const status: OrderStatus = input.kind === "return" ? "returned" : "exchanged";
      const mirror: Order = {
        id: record.id,
        number: record.number,
        receipt: `RCP/${record.number}`,
        time: record.time,
        status,
        lines: (input.kind === "return" ? input.lines : input.replacements).map((l, index) => ({
          id: `${record.id}-l${index}`,
          productId: l.productId,
          name: l.name,
          qty: l.qty,
          unitPrice: l.unitPrice,
          discount: 0,
        })),
        payments: [],
        noteTags: [],
        pricelistId: "pl1",
      };
      mutateOrders(
        (prev) => [
          ...prev.map((o) => (o.id === input.originalOrderId ? { ...o, status } : o)),
          mirror,
        ],
        [input.originalOrderId, mirror.id],
      );
      return record;
    },
    updateProductInCatalog: (id, patch) => {
      queryClient.setQueryData<Product[]>(cloudKeys.products, (prev) =>
        (prev ?? productList).map((p) => (p.id === id ? { ...p, ...patch } : p)),
      );
      const row: Database["public"]["Tables"]["products"]["Update"] = {};
      if (patch.name !== undefined) row.name_en = patch.name;
      if (patch.price !== undefined) row.sale_price = patch.price;
      if (patch.category !== undefined) row.category_id = patch.category;
      if (patch.barcode !== undefined) row.item_code = patch.barcode;
      if (patch.stock_qty !== undefined) row.stock_qty = patch.stock_qty;
      write.mutate(() => supabase.from("products").update(row).eq("id", id));
    },
    taxes,
    loading: productsQuery.isLoading || categoriesQuery.isLoading,
  };

  return <PosContext.Provider value={value}>{children}</PosContext.Provider>;
}

function nextOrderNumber(orders: Order[]) {
  const highest = orders.reduce((max, o) => {
    const n = Number(o.number);
    return Number.isFinite(n) && n > max ? n : max;
  }, 1000);
  return String(highest + 1);
}

export function usePos() {
  const ctx = useContext(PosContext);
  if (!ctx) throw new Error("usePos must be used inside PosProvider");
  return ctx;
}

export function usePosOptional() {
  return useContext(PosContext);
}

/** Kept for screens that only need the memoised catalog lookups. */
export function useCatalog() {
  const { productList, categoryList } = usePos();
  return useMemo(() => ({ productList, categoryList }), [productList, categoryList]);
}
