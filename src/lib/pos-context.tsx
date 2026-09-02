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
  fetchRegisterSessions,
  
  fromOrder,
  fromReturnRecord,
  randomId,
} from "./cloud-data";

import {
  paymentsByMethod,
  round2,
  stockDelta,
  sumLines,
  type DocumentKind,
} from "./money";
import {
  calculateOrderTotals,
  type CalculatedOrderTotals,
} from "./tax-resolver";
export {
  calculateOrderTotals,
  type CalculatedOrderTotals,
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
  sessionId?: string;
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
  createdAt?: string;
  sessionId?: string;
  /** Document type: a sale, a refund, or an exchange. Never inferred from the number. */
  kind?: DocumentKind;
  cashier?: string;
  status: OrderStatus;
  lines: CartLine[];
  payments: PaymentLine[];
  customerId?: string;
  note?: string;
  noteTags: string[];
  pricelistId: string;
};

export type CashMove = {
  id: string;
  type: "in" | "out";
  amount: number;
  reason: string;
  date?: string;
  createdAt?: string;
  sessionId?: string;
};

function now() {
  return new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function makeOrder(number: string, cashierName = "", sessionId?: string): Order {
  return {
    id: `o-${number}-${Math.random().toString(36).slice(2, 6)}`,
    number,
    receipt: `RCP/${number}`,
    time: now(),
    date: new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString(),
    sessionId: sessionId || "",
    kind: "sale",
    status: "ongoing",
    lines: [],
    payments: [],
    noteTags: [],
    pricelistId: "pl1",
    cashier: cashierName,
  };
}

export function orderTotals(order: Order | undefined, discountRate = 0) {
  const lines = order?.lines ?? [];
  return calculateOrderTotals(lines, discountRate);
}

export type SessionCloseSummary = {
  cashSales: number;
  cardSales: number;
  accountSales: number;
  totalSales: number;
  cashIn: number;
  cashOut: number;
  expectedCash: number;
  variance: number;
  orderCount: number;
};

type PosState = {
  registerOpen: boolean;
  activeSessionId: string | null;
  sessionOpenedAt: string | null;
  openingCash: number;
  openRegister: (amount: number) => void;
  closeRegister: (counted: number, note: string, summary?: SessionCloseSummary) => void;
  closedSummary: { counted: number; note: string } | null;
  pendingPreviousShiftClose: boolean;
  dismissPreviousShiftClose: () => void;
  showEndOfDayWarning: boolean;
  dismissEndOfDayWarning: () => void;
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
  updateCustomer: (id: string, patch: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
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
  deleteProductFromCatalog: (id: string) => void;
  
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
  

  const productList = productsQuery.data ?? seedProducts;
  const categoryList = categoriesQuery.data ?? seedCategories;
  const customers = customersQuery.data ?? seedCustomers;
  

  /* ---------------------------------------------------------------- orders */
  // Cart edits stay in local state for instant feedback and are mirrored to the
  // cloud on every change, so a reload (or another till) sees the same tabs.
  const [localOrders, setLocalOrders] = useState<Order[] | null>(null);
  const [activeOrderId, setActiveOrderId] = useState("");
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);

  const getTodayStr = () => new Date().toISOString().slice(0, 10);

  const [registerOpen, setRegisterOpen] = useState<boolean>(() => {
    try {
      const savedDate = localStorage.getItem("velora_register_date");
      const savedOpen = localStorage.getItem("velora_register_open");
      if (savedOpen === "true" && savedDate === new Date().toISOString().slice(0, 10)) {
        return true;
      }
    } catch {}
    return false;
  });

  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    try {
      const savedOpen = localStorage.getItem("velora_register_open");
      const savedId = localStorage.getItem("velora_active_session_id");
      if (savedOpen === "true" && savedId) return savedId;
    } catch {}
    return null;
  });

  const [sessionOpenedAt, setSessionOpenedAt] = useState<string | null>(() => {
    try {
      const savedOpen = localStorage.getItem("velora_register_open");
      const savedTime = localStorage.getItem("velora_session_opened_at");
      if (savedOpen === "true" && savedTime) return savedTime;
    } catch {}
    return null;
  });

  const [openingCash, setOpeningCash] = useState<number>(() => {
    try {
      const savedDate = localStorage.getItem("velora_register_date");
      const val = Number(localStorage.getItem("velora_opening_cash") || 0);
      if (savedDate === new Date().toISOString().slice(0, 10) && val > 0) return val;
    } catch {}
    return 0;
  });

  const [pendingPreviousShiftClose, setPendingPreviousShiftClose] = useState<boolean>(() => {
    try {
      const savedDate = localStorage.getItem("velora_register_date");
      const savedOpen = localStorage.getItem("velora_register_open");
      if (savedOpen === "true" && savedDate && savedDate !== new Date().toISOString().slice(0, 10)) {
        return true;
      }
    } catch {}
    return false;
  });

  const [showEndOfDayWarning, setShowEndOfDayWarning] = useState<boolean>(false);
  const [lastPaidOrder, setLastPaidOrder] = useState<Order | null>(null);
  const [closedSummary, setClosedSummary] = useState<{ counted: number; note: string } | null>(
    null,
  );

  // Monitor midnight date rollover & 15-min end-of-day alert
  useEffect(() => {
    const checkMidnightAndWarning = () => {
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      const hours = now.getHours();
      const minutes = now.getMinutes();

      // 1. Date change soft-close:
      const savedDate = localStorage.getItem("velora_register_date");
      const savedOpen = localStorage.getItem("velora_register_open") === "true";
      if (savedOpen && savedDate && savedDate !== today) {
        setRegisterOpen(false);
        setPendingPreviousShiftClose(true);
        try {
          localStorage.setItem("velora_register_open", "false");
        } catch {}
        toast.info("Date changed. Yesterday's shift soft-closed. Please review previous shift before starting today's register.");
      }

      // 2. 15-minute end-of-day warning:
      if (registerOpen && hours === 23 && minutes >= 45) {
        const warnedTonight = sessionStorage.getItem(`velora_warned_${today}`);
        if (!warnedTonight) {
          setShowEndOfDayWarning(true);
          sessionStorage.setItem(`velora_warned_${today}`, "true");
          toast.warning("Day ends in 15 minutes. Please reconcile and close the cash register.");
        }
      }
    };

    checkMidnightAndWarning();
    const interval = setInterval(checkMidnightAndWarning, 15000);
    return () => clearInterval(interval);
  }, [registerOpen]);

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
    const next = nextOrderNumber(cloudOrders, returnsQuery.data ?? []);
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
        queryClient.setQueryData(cloudKeys.orders, next);
        return next;
      });
    },
    [activeOrderId, ordersQuery.data, persist, queryClient],
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

  /**
   * Single write path for stock. Takes the map produced by `stockDelta` so a
   * sale, a return and an exchange all move inventory the same way — an
   * exchange of the same product for itself nets to zero instead of deducting
   * twice.
   */
  const applyStockDelta = (delta: Map<string, number>) => {
    for (const [productId, change] of delta.entries()) {
      if (!change) continue;
      const prod = productList.find((p) => p.id === productId);
      if (!prod) continue;
      const nextStock = Math.max(0, Number(prod.stock_qty ?? 0) + change);
      queryClient.setQueryData<Product[]>(cloudKeys.products, (prev) =>
        (prev ?? productList).map((p) => (p.id === productId ? { ...p, stock_qty: nextStock } : p)),
      );
      write.mutate(() =>
        supabase.from("products").update({ stock_qty: nextStock }).eq("id", productId),
      );
    }
  };



  const value: PosState = {
    registerOpen,
    activeSessionId,
    sessionOpenedAt,
    openingCash,
    openRegister: (amount) => {
      const today = new Date().toISOString().slice(0, 10);
      const openedAt = new Date().toISOString();
      const newSessionId = `ses-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

      setActiveSessionId(newSessionId);
      setSessionOpenedAt(openedAt);
      setOpeningCash(amount);
      setRegisterOpen(true);
      setPendingPreviousShiftClose(false);
      setClosedSummary(null);
      try {
        localStorage.setItem("velora_register_open", "true");
        localStorage.setItem("velora_active_session_id", newSessionId);
        localStorage.setItem("velora_session_opened_at", openedAt);
        localStorage.setItem("velora_register_date", today);
        localStorage.setItem("velora_opening_cash", String(amount));
      } catch {}

      // Persist the shift so every till and the back office see the same
      // session, and so a reload does not lose which orders belong to it.
      write.mutate(() =>
        supabase.from("register_sessions").upsert({
          id: newSessionId,
          session_date: today,
          cashier: currentUser?.name ?? "",
          opened_at: openedAt,
          opening_float: amount,
          status: "open",
        }),
      );

      // If an ongoing empty order already exists, associate it with this session
      const existingEmpty = orders.find(
        (o) => (o.status === "ongoing" || o.status === "payment") && (!o.lines || o.lines.length === 0),
      );
      if (existingEmpty) {
        setActiveOrderId(existingEmpty.id);
        mutateOrders((prev) =>
          prev.map((o) => (o.id === existingEmpty.id ? { ...o, sessionId: newSessionId, cashier: currentUser?.name ?? o.cashier } : o)),
        );
      }
    },
    closeRegister: (counted, note, summary) => {
      const closingId = activeSessionId;
      if (closingId) {
        write.mutate(() =>
          supabase
            .from("register_sessions")
            .update({
              closed_at: new Date().toISOString(),
              counted_cash: counted,
              note,
              status: "closed",
              cash_sales: summary?.cashSales ?? 0,
              card_sales: summary?.cardSales ?? 0,
              account_sales: summary?.accountSales ?? 0,
              total_sales: summary?.totalSales ?? 0,
              cash_in: summary?.cashIn ?? 0,
              cash_out: summary?.cashOut ?? 0,
              expected_cash: summary?.expectedCash ?? null,
              variance: summary?.variance ?? 0,
              order_count: summary?.orderCount ?? 0,
            })
            .eq("id", closingId),
        );
        void queryClient.invalidateQueries({ queryKey: cloudKeys.registerSessions });
      }
      setRegisterOpen(false);
      setPendingPreviousShiftClose(false);
      setClosedSummary({ counted, note });
      try {
        localStorage.setItem("velora_register_open", "false");
        localStorage.setItem("velora_register_date", new Date().toISOString().slice(0, 10));
        localStorage.removeItem("velora_opening_cash");
        localStorage.removeItem("velora_active_session_id");
        localStorage.removeItem("velora_session_opened_at");
      } catch {}
      setActiveSessionId(null);
      setSessionOpenedAt(null);
    },
    closedSummary,
    pendingPreviousShiftClose,
    dismissPreviousShiftClose: () => {
      setPendingPreviousShiftClose(false);
    },
    showEndOfDayWarning,
    dismissEndOfDayWarning: () => {
      setShowEndOfDayWarning(false);
    },
    orders,
    activeOrderId,
    activeOrder,
    setActiveOrderId,
    newOrder: () => {
      // If there is already an ongoing order with 0 lines, simply select it instead of creating duplicate blank orders
      const emptyOngoing = orders.find(
        (o) => (o.status === "ongoing" || o.status === "payment") && (!o.lines || o.lines.length === 0),
      );
      if (emptyOngoing) {
        setActiveOrderId(emptyOngoing.id);
        return;
      }
      const order = makeOrder(nextOrderNumber(orders, returns), currentUser?.name ?? "", activeSessionId ?? undefined);
      mutateOrders((prev) => [order, ...prev], [order.id]);
      setActiveOrderId(order.id);
    },
    deleteOrder: (id) => {
      const remaining = orders.filter((o) => o.id !== id);
      if (remaining.length === 0) {
        const order = makeOrder(nextOrderNumber(orders, returns), currentUser?.name ?? "");
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
      const settled: Order = {
        ...paid,
        status: "paid",
        time: now(),
        date: paid.date || new Date().toISOString().slice(0, 10),
        createdAt: paid.createdAt || new Date().toISOString(),
        sessionId: paid.sessionId || activeSessionId || "",
      };
      setLastPaidOrder(settled);

      // Persist the settled order immediately to Supabase
      write.mutate(() =>
        supabase.from("orders").upsert(fromOrder(settled, currentUser?.name ?? "")),
      );

      // One ledger path for every stock movement: a sale only ever deducts.
      applyStockDelta(stockDelta("sale", settled.lines));

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
        const fresh = makeOrder(nextOrderNumber(updated, returns), currentUser?.name ?? "", activeSessionId ?? undefined);
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
    updateCustomer: (id, patch) => {
      queryClient.setQueryData<Customer[]>(cloudKeys.customers, (prev) =>
        (prev ?? customers).map((c) => (c.id === id ? { ...c, ...patch } : c)),
      );
      const row: any = {};
      if (patch.name !== undefined) row.name = patch.name;
      if (patch.email !== undefined) row.email = patch.email;
      if (patch.phone !== undefined) row.phone = patch.phone;
      if (patch.location !== undefined) row.location = patch.location;
      if (patch.company !== undefined) row.company = patch.company;
      write.mutate(() => supabase.from("customers").update(row).eq("id", id));
    },
    deleteCustomer: (id) => {
      queryClient.setQueryData<Customer[]>(cloudKeys.customers, (prev) =>
        (prev ?? customers).filter((c) => c.id !== id),
      );
      write.mutate(() => supabase.from("customers").delete().eq("id", id));
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
      const created: CashMove = {
        ...m,
        id: randomId("cm"),
        sessionId: activeSessionId || "",
        date: new Date().toISOString().slice(0, 10),
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData<CashMove[]>(cloudKeys.cashMoves, (prev) => [
        created,
        ...(prev ?? []),
      ]);
      write.mutate(() =>
        supabase.from("cash_moves").insert({
          id: created.id,
          move_type: created.type,
          amount: created.amount,
          reason: created.reason,
          cashier: currentUser?.name ?? "Cashier",
          created_at: created.createdAt,
          session_id: created.sessionId || null,
        }),
      );
    },
    lastPaidOrder,
    returns,
    processReturn: (input) => {
      const prefix = input.kind === "return" ? "RET" : "EXC";
      const cleanOriginalNum = String(input.originalNumber).replace(/^(ORD-|RCP-)/i, "");
      const recordNumber = `${prefix}-${cleanOriginalNum}`;

      const record: ReturnRecord = {
        ...input,
        id: randomId(input.kind === "return" ? "ret" : "exc"),
        number: recordNumber,
        sessionId: input.sessionId || activeSessionId || "",
        date: new Date().toISOString().slice(0, 10),
        time: now(),
      };

      queryClient.setQueryData<ReturnRecord[]>(cloudKeys.returns, (prev) => [
        record,
        ...(prev ?? []),
      ]);
      write.mutate(() => supabase.from("return_records").insert(fromReturnRecord(record)));

      // 1 & 2. Compute net stock changes (Returns add stock, Replacements deduct stock)
      const stockChanges = new Map<string, number>();
      
      for (const line of input.lines) {
        stockChanges.set(line.productId, (stockChanges.get(line.productId) || 0) + line.qty);
      }
      
      if (input.kind === "exchange" && input.replacements) {
        for (const line of input.replacements) {
          stockChanges.set(line.productId, (stockChanges.get(line.productId) || 0) - line.qty);
        }
      }

      // Apply net changes
      for (const [productId, netChange] of stockChanges.entries()) {
        if (netChange === 0) continue; // No net change
        
        const prod = productList.find((p) => p.id === productId);
        if (prod) {
          const nextStock = Math.max(0, prod.stock_qty + netChange);
          queryClient.setQueryData<Product[]>(cloudKeys.products, (prev) =>
            (prev ?? productList).map((p) =>
              p.id === productId ? { ...p, stock_qty: nextStock } : p,
            ),
          );
          write.mutate(() =>
            supabase.from("products").update({ stock_qty: nextStock }).eq("id", productId),
          );
        }
      }

      // 3. Track cash drawer movements for cash returns / exchanges
      if (input.method === "Cash") {
        if (input.kind === "return" && input.refundAmount > 0) {
          const cashMove: CashMove = {
            id: randomId("cm"),
            type: "out",
            amount: input.refundAmount,
            reason: `Refund for Return ${record.number} (Order #${input.originalNumber})`,
            sessionId: activeSessionId || "",
            date: new Date().toISOString().slice(0, 10),
            createdAt: new Date().toISOString(),
          };
          queryClient.setQueryData<CashMove[]>(cloudKeys.cashMoves, (prev) => [
            cashMove,
            ...(prev ?? []),
          ]);
          write.mutate(() =>
            supabase.from("cash_moves").insert({
              id: cashMove.id,
              move_type: cashMove.type,
              amount: cashMove.amount,
              reason: cashMove.reason,
              cashier: currentUser?.name ?? "Cashier",
              created_at: cashMove.createdAt,
              session_id: cashMove.sessionId || null,
            }),
          );
        } else if (input.kind === "exchange") {
          if (input.difference < 0) {
            const cashMove: CashMove = {
              id: randomId("cm"),
              type: "out",
              amount: Math.abs(input.difference),
              reason: `Exchange Refund ${record.number} (Order #${input.originalNumber})`,
              sessionId: activeSessionId || "",
              date: new Date().toISOString().slice(0, 10),
              createdAt: new Date().toISOString(),
            };
            queryClient.setQueryData<CashMove[]>(cloudKeys.cashMoves, (prev) => [
              cashMove,
              ...(prev ?? []),
            ]);
            write.mutate(() =>
              supabase.from("cash_moves").insert({
                id: cashMove.id,
                move_type: cashMove.type,
                amount: cashMove.amount,
                reason: cashMove.reason,
                cashier: currentUser?.name ?? "Cashier",
                created_at: cashMove.createdAt,
              }),
            );
          } else if (input.difference > 0) {
            const cashMove: CashMove = {
              id: randomId("cm"),
              type: "in",
              amount: input.difference,
              reason: `Exchange Payment ${record.number} (Order #${input.originalNumber})`,
              sessionId: activeSessionId || "",
              date: new Date().toISOString().slice(0, 10),
              createdAt: new Date().toISOString(),
            };
            queryClient.setQueryData<CashMove[]>(cloudKeys.cashMoves, (prev) => [
              cashMove,
              ...(prev ?? []),
            ]);
            write.mutate(() =>
              supabase.from("cash_moves").insert({
                id: cashMove.id,
                move_type: cashMove.type,
                amount: cashMove.amount,
                reason: cashMove.reason,
                cashier: currentUser?.name ?? "Cashier",
                created_at: cashMove.createdAt,
              }),
            );
          }
        }
      }

      // 4. Update the original order with detailed audit information
      const status: OrderStatus = input.kind === "return" ? "returned" : "exchanged";
      const netPaymentAmount =
        input.kind === "return" ? -input.refundAmount : input.difference;

      const returnDetailsText = input.lines
        .map((l) => `${l.qty}x ${l.name} (Reason: ${l.reason})`)
        .join(", ");
      const replacementDetailsText =
        input.kind === "exchange" && input.replacements && input.replacements.length > 0
          ? ` | Replaced with: ` +
            input.replacements.map((r) => `${r.qty}x ${r.name}`).join(", ")
          : "";
      const auditLog = `[${record.number}] Returned: ${returnDetailsText}${replacementDetailsText} (Settled via ${input.method})`;

      const mirror: Order = {
        id: record.id,
        number: record.number,
        receipt: `RCP/${record.number}`,
        time: record.time,
        date: record.date,
        status,
        lines: (input.kind === "return" ? input.lines : input.replacements).map((l, index) => ({
          id: `${record.id}-l${index}`,
          productId: l.productId,
          name: l.name,
          qty: l.qty,
          unitPrice: l.unitPrice,
          discount: 0,
        })),
        payments: [
          {
            id: `pay-${record.id}`,
            method: input.method,
            amount: netPaymentAmount,
          },
        ],
        note: auditLog,
        noteTags: [input.kind],
        pricelistId: "pl1",
      };

      // Mutate local state and persist both the updated original order and the mirror order
      mutateOrders(
        (prev) => [
          ...prev.map((o) => {
            if (o.id === input.originalOrderId) {
              const updatedNote = o.note ? `${o.note} | ${auditLog}` : auditLog;
              return {
                ...o,
                status,
                note: updatedNote,
                noteTags: Array.from(new Set([...(o.noteTags || []), input.kind])),
              };
            }
            return o;
          }),
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
    deleteProductFromCatalog: (id) => {
      queryClient.setQueryData<Product[]>(cloudKeys.products, (prev) =>
        (prev ?? productList).filter((p) => p.id !== id),
      );
      write.mutate(() => supabase.from("products").delete().eq("id", id));
    },
    
    loading: productsQuery.isLoading || categoriesQuery.isLoading,
  };

  return <PosContext.Provider value={value}>{children}</PosContext.Provider>;
}

function extractDigitsNumber(val: any): number {
  if (!val) return 0;
  const str = String(val);
  const segment = str.split(/[-/]/).pop() || str;
  const digits = segment.replace(/[^\d]/g, "");
  const num = parseInt(digits, 10);
  return Number.isFinite(num) && num < 10000000 ? num : 0;
}

function nextOrderNumber(orders: Order[] = [], extra: { number?: string }[] = []) {
  let highest = 1000;

  for (const o of orders) {
    const n = extractDigitsNumber(o.number);
    if (n > highest) highest = n;
    const r = extractDigitsNumber(o.receipt);
    if (r > highest) highest = r;
  }

  for (const x of extra) {
    const n = extractDigitsNumber(x?.number);
    if (n > highest) highest = n;
  }

  try {
    const saved = parseInt(localStorage.getItem("velora_last_order_seq") || "0", 10);
    if (Number.isFinite(saved) && saved > highest) {
      highest = saved;
    }
  } catch {}

  const next = highest + 1;
  try {
    localStorage.setItem("velora_last_order_seq", String(next));
  } catch {}

  return String(next);
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

