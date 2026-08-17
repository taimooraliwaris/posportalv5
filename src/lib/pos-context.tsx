import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  TAX_RATE,
  products as seedProducts,
  seedCustomers,
  type Customer,
  type Product,
} from "./pos-data";

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

let counter = 1002;
function makeOrder(number?: string): Order {
  const n = number ?? String(++counter);
  return {
    id: `o-${n}-${Math.random().toString(36).slice(2, 6)}`,
    number: n,
    receipt: `RCP/${n}`,
    time: now(),
    status: "ongoing",
    lines: [],
    payments: [],
    noteTags: [],
    pricelistId: "pl1",
  };
}

export function orderTotals(order: Order | undefined, discountRate = 0) {
  const lines = order?.lines ?? [];
  const gross = lines.reduce((sum, l) => sum + l.unitPrice * l.qty * (1 - l.discount / 100), 0);
  const subtotal = gross * (1 - discountRate);
  const taxes = subtotal * TAX_RATE;
  return { subtotal, taxes, total: subtotal + taxes };
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
  updateLine: (lineId: string, patch: Partial<CartLine>) => void;
  removeLine: (lineId: string) => void;

  addPayment: (method: PaymentLine["method"], amount: number) => void;
  updatePayment: (id: string, amount: number) => void;
  removePayment: (id: string) => void;
  validateOrder: () => void;

  customers: Customer[];
  addCustomer: (c: Omit<Customer, "id">) => Customer;

  productList: Product[];
  addProductToCatalog: (p: Omit<Product, "id">) => void;

  cashMoves: CashMove[];
  addCashMove: (m: Omit<CashMove, "id">) => void;

  lastPaidOrder: Order | null;

  returns: ReturnRecord[];
  processReturn: (
    input: Omit<ReturnRecord, "id" | "number" | "date" | "time">,
  ) => ReturnRecord;
  updateProductInCatalog: (id: string, patch: Partial<Product>) => void;
};

const PosContext = createContext<PosState | null>(null);

export function PosProvider({ children }: { children: ReactNode }) {
  const first = useMemo(() => makeOrder("1001"), []);
  const [orders, setOrders] = useState<Order[]>(() => [first, ...makePaidHistory()]);
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [activeOrderId, setActiveOrderId] = useState(first.id);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>(seedCustomers);
  const [productList, setProductList] = useState<Product[]>(seedProducts);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [openingCash, setOpeningCash] = useState(0);
  const [cashMoves, setCashMoves] = useState<CashMove[]>([]);
  const [lastPaidOrder, setLastPaidOrder] = useState<Order | null>(null);
  const [closedSummary, setClosedSummary] = useState<{ counted: number; note: string } | null>(
    null,
  );

  const activeOrder = orders.find((o) => o.id === activeOrderId);

  const updateOrder = useCallback((id: string, patch: Partial<Order>) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }, []);

  const addProduct = useCallback(
    (product: Product) => {
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== activeOrderId) return o;
          const existing = o.lines.find((l) => l.productId === product.id);
          if (existing) {
            return {
              ...o,
              lines: o.lines.map((l) => (l.id === existing.id ? { ...l, qty: l.qty + 1 } : l)),
            };
          }
          return {
            ...o,
            lines: [
              ...o.lines,
              {
                id: `l-${Math.random().toString(36).slice(2, 8)}`,
                productId: product.id,
                name: product.name,
                qty: 1,
                unitPrice: product.price,
                discount: 0,
              },
            ],
          };
        }),
      );
    },
    [activeOrderId],
  );

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
      const o = makeOrder();
      setOrders((prev) => [...prev, o]);
      setActiveOrderId(o.id);
    },
    deleteOrder: (id) => {
      setOrders((prev) => {
        const next = prev.filter((o) => o.id !== id);
        if (next.length === 0) {
          const o = makeOrder();
          setActiveOrderId(o.id);
          return [o];
        }
        if (id === activeOrderId) setActiveOrderId(next[0]!.id);
        return next;
      });
    },
    updateOrder,
    selectedLineId,
    setSelectedLineId,
    addProduct,
    updateLine: (lineId, patch) => {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === activeOrderId
            ? { ...o, lines: o.lines.map((l) => (l.id === lineId ? { ...l, ...patch } : l)) }
            : o,
        ),
      );
    },
    removeLine: (lineId) => {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === activeOrderId ? { ...o, lines: o.lines.filter((l) => l.id !== lineId) } : o,
        ),
      );
      setSelectedLineId(null);
    },
    addPayment: (method, amount) => {
      setOrders((prev) =>
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
      setOrders((prev) =>
        prev.map((o) =>
          o.id === activeOrderId
            ? { ...o, payments: o.payments.map((p) => (p.id === id ? { ...p, amount } : p)) }
            : o,
        ),
      );
    },
    removePayment: (id) => {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === activeOrderId ? { ...o, payments: o.payments.filter((p) => p.id !== id) } : o,
        ),
      );
    },
    validateOrder: () => {
      setOrders((prev) => {
        const next = prev.map((o) =>
          o.id === activeOrderId ? { ...o, status: "paid" as OrderStatus, time: now() } : o,
        );
        setLastPaidOrder(next.find((o) => o.id === activeOrderId) ?? null);
        return next;
      });
    },
    customers,
    addCustomer: (c) => {
      const created = { ...c, id: `c-${Math.random().toString(36).slice(2, 8)}` };
      setCustomers((prev) => [created, ...prev]);
      return created;
    },
    productList,
    addProductToCatalog: (p) => {
      setProductList((prev) => [
        { ...p, id: `p-${Math.random().toString(36).slice(2, 8)}` },
        ...prev,
      ]);
    },
    cashMoves,
    addCashMove: (m) => {
      setCashMoves((prev) => [
        ...prev,
        { ...m, id: `cm-${Math.random().toString(36).slice(2, 8)}` },
      ]);
    },
    lastPaidOrder,
  };

  return <PosContext.Provider value={value}>{children}</PosContext.Provider>;
}

export function usePos() {
  const ctx = useContext(PosContext);
  if (!ctx) throw new Error("usePos must be used inside PosProvider");
  return ctx;
}
