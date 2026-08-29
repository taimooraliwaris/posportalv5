// @ts-nocheck
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  Minus,
  Plus,
  Printer,
  QrCode,
  RefreshCcw,
  Search,
  Undo2,
  PackageCheck,
  ShoppingBag,
  CreditCard,
  Banknote,
  UserCheck,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePos, orderTotals, type Order, type ReturnLine } from "@/lib/pos-context";
import { formatRs, type Product } from "@/lib/pos-data";
import { returnReasons } from "@/lib/backend-data";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/backend-context";
import { useScanTarget } from "@/lib/scan-mode-context";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { printReport, escapeHtml } from "@/lib/print-report";

export const Route = createFileRoute("/returns")({
  head: () => ({
    meta: [
      { title: "Return / Exchange — Velora POS" },
      {
        name: "description",
        content: "Look up a past receipt to refund or exchange items at the till.",
      },
      { property: "og:title", content: "Return / Exchange — Velora POS" },
      {
        property: "og:description",
        content: "Look up a past receipt to refund or exchange items at the till.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReturnExchangePage,
});

type Draft = { qty: number; reason: string };
type PaymentMethod = "Cash" | "Card" | "Customer Account";

function ReturnExchangePage() {
  const { currentUser } = useAuth();
  const store = useStore();
  const { orders, productList, categoryList, processReturn } = usePos();
  const navigate = useNavigate();

  // Search & Navigation State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Return / Exchange Mode & Line Items
  const [mode, setMode] = useState<"return" | "exchange">("return");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [replacements, setReplacements] = useState<Record<string, number>>({});
  const [method, setMethod] = useState<PaymentMethod>("Cash");

  // Exchange Product Picker Filtering
  const [productQuery, setProductQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Result state after confirmation
  const [completedResult, setCompletedResult] = useState<{
    kind: "return" | "exchange";
    number: string;
    date: string;
    time: string;
    originalNumber: string;
    returnLines: ReturnLine[];
    replacementLines: ReturnLine[];
    refundAmount: number;
    difference: number;
    method: PaymentMethod;
  } | null>(null);

  // Filter only paid/completed orders for return lookup
  const paidOrders = useMemo(() => {
    return orders
      .filter((o) => o.status === "paid" || o.status === "exchanged" || o.status === "returned")
      .sort((a, b) => (b.time && a.time ? b.time.localeCompare(a.time) : 0));
  }, [orders]);

  // Real-time search query matching
  const matchingOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return paidOrders.slice(0, 50);
    return paidOrders.filter((o) => {
      const num = o.number.toLowerCase();
      const rc = o.receipt.toLowerCase();
      const cashier = (o.cashier || "").toLowerCase();
      const hasProduct = o.lines.some((l) => l.name.toLowerCase().includes(q));
      return num.includes(q) || rc.includes(q) || cashier.includes(q) || hasProduct;
    });
  }, [paidOrders, searchQuery]);

  // Return lines calculated from drafts
  const returnLines: ReturnLine[] = useMemo(() => {
    if (!selectedOrder) return [];
    return selectedOrder.lines
      .filter((l) => (drafts[l.id]?.qty ?? 0) > 0)
      .map((l) => ({
        productId: l.productId,
        name: l.name,
        qty: drafts[l.id]!.qty,
        unitPrice: l.unitPrice,
        reason: drafts[l.id]?.reason || returnReasons[0],
      }));
  }, [selectedOrder, drafts]);

  // Return refund credit total
  const returnCreditTotal = useMemo(() => {
    return returnLines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);
  }, [returnLines]);

  // Replacement lines for exchange
  const replacementLines: ReturnLine[] = useMemo(() => {
    return Object.entries(replacements)
      .filter(([, qty]) => qty > 0)
      .map(([productId, qty]) => {
        const product = productList.find((p) => p.id === productId);
        return {
          productId,
          name: product?.name || "Replacement Item",
          qty,
          unitPrice: product?.price || 0,
          reason: "Exchange Replacement",
        };
      });
  }, [replacements, productList]);

  // Replacement items total
  const replacementTotal = useMemo(() => {
    return replacementLines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);
  }, [replacementLines]);

  // Net difference for exchange:
  // > 0 means Replacement costs more -> Customer owes difference
  // < 0 means Return credit is more -> Customer gets refund
  // == 0 means Even exchange
  const difference = replacementTotal - returnCreditTotal;

  // Select an order to start return/exchange
  const selectOrder = (order: Order) => {
    setSelectedOrder(order);
    setDrafts(
      Object.fromEntries(
        order.lines.map((l) => [l.id, { qty: 0, reason: returnReasons[0] }]),
      ),
    );
    setReplacements({});
    setCompletedResult(null);
  };

  // Reset entire return workflow
  const resetWorkflow = () => {
    setSelectedOrder(null);
    setDrafts({});
    setReplacements({});
    setCompletedResult(null);
    setSearchQuery("");
  };

  // Barcode scanner integration for receipts & exchange products
  useScanTarget(
    "return",
    ({ code }) => {
      // If currently picking exchange items, scanning a product barcode adds it to replacements
      if (selectedOrder && mode === "exchange") {
        const product = productList.find(
          (p) => p.barcode === code || p.item_code === code || p.id === code,
        );
        if (product) {
          setReplacements((prev) => ({ ...prev, [product.id]: (prev[product.id] ?? 0) + 1 }));
          toast.success(`Added ${product.name} as exchange item`);
          return "added";
        }
      }

      // Otherwise, scan searches & selects receipt
      const raw = code.trim().toLowerCase();
      const normalized = raw.replace(/^(rcp\/|rcp-|#)/i, "");
      const match = orders.find((o) => {
        const num = o.number.toLowerCase().trim();
        const rc = o.receipt.toLowerCase().trim().replace(/^(rcp\/|rcp-|#)/i, "");
        const id = o.id.toLowerCase().trim();
        const fullRc = o.receipt.toLowerCase().trim();
        return (
          num === normalized ||
          rc === normalized ||
          fullRc === raw ||
          id === raw ||
          num === raw
        );
      });

      if (match) {
        toast.success(`Receipt ${match.receipt} scanned`);
        selectOrder(match);
        return "info";
      }

      setSearchQuery(code);
      toast.error(`No receipt matches barcode ${code}`);
      return "unknown";
    },
    true,
  );

  // Quick Demo Scan
  const triggerQuickScan = () => {
    const random = paidOrders[Math.floor(Math.random() * paidOrders.length)];
    if (!random) {
      toast.error("No paid receipts available to scan");
      return;
    }
    toast.success(`Receipt ${random.receipt} selected`);
    selectOrder(random);
  };

  // Filter replacement products in catalog
  const filteredProducts = useMemo(() => {
    return productList.filter((p) => {
      if (selectedCategory && p.category !== selectedCategory && p.category_id !== selectedCategory) {
        return false;
      }
      if (productQuery.trim()) {
        const q = productQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.item_code?.toLowerCase().includes(q) ||
          p.barcode?.includes(q)
        );
      }
      return true;
    });
  }, [productList, selectedCategory, productQuery]);

  // Set max quantity for all items
  const handleReturnAll = () => {
    if (!selectedOrder) return;
    const allDrafts: Record<string, Draft> = {};
    for (const line of selectedOrder.lines) {
      allDrafts[line.id] = {
        qty: line.qty,
        reason: drafts[line.id]?.reason || returnReasons[0],
      };
    }
    setDrafts(allDrafts);
  };

  // Clear all return quantities
  const handleClearAll = () => {
    if (!selectedOrder) return;
    const cleared: Record<string, Draft> = {};
    for (const line of selectedOrder.lines) {
      cleared[line.id] = {
        qty: 0,
        reason: drafts[line.id]?.reason || returnReasons[0],
      };
    }
    setDrafts(cleared);
  };

  // Process and finalize return or exchange
  const handleConfirm = () => {
    if (!selectedOrder || returnLines.length === 0) {
      toast.error("Please select at least one item to return");
      return;
    }

    if (mode === "exchange" && replacementLines.length === 0) {
      toast.error("Please select at least one replacement item for exchange");
      return;
    }

    const cashierName = currentUser?.name ?? store.cashier;
    const finalRefund = mode === "return" ? returnCreditTotal : difference < 0 ? Math.abs(difference) : 0;
    const finalDiff = mode === "exchange" ? difference : -returnCreditTotal;

    const record = processReturn({
      kind: mode,
      originalOrderId: selectedOrder.id,
      originalNumber: selectedOrder.number,
      lines: returnLines,
      replacements: mode === "exchange" ? replacementLines : [],
      refundAmount: finalRefund,
      difference: finalDiff,
      method,
      processedBy: cashierName,
    });

    setCompletedResult({
      kind: mode,
      number: record.number,
      date: record.date || new Date().toISOString().slice(0, 10),
      time: record.time || new Date().toLocaleTimeString(),
      originalNumber: selectedOrder.number,
      returnLines,
      replacementLines: mode === "exchange" ? replacementLines : [],
      refundAmount: finalRefund,
      difference: finalDiff,
      method,
    });

    toast.success(
      mode === "return"
        ? `Refund of ${formatRs(returnCreditTotal)} processed successfully`
        : `Exchange ${record.number} completed successfully`,
    );
  };

  // Print receipt function
  const handlePrintReceipt = () => {
    if (!completedResult) return;
    const { kind, number, date, time, originalNumber, returnLines, replacementLines, method, refundAmount, difference } = completedResult;

    const linesHtml = returnLines
      .map(
        (l) => `
        <tr>
          <td>${escapeHtml(l.name)} <span style="font-size:10px; color:#6b7280;">(${escapeHtml(l.reason)})</span></td>
          <td class="num">-${l.qty}</td>
          <td class="num">${formatRs(l.unitPrice)}</td>
          <td class="num" style="color:#b91c1c;">-${formatRs(l.qty * l.unitPrice)}</td>
        </tr>`,
      )
      .join("");

    const repLinesHtml = replacementLines
      .map(
        (l) => `
        <tr>
          <td>${escapeHtml(l.name)} <span style="font-size:10px; color:#047857;">(Replacement)</span></td>
          <td class="num">+${l.qty}</td>
          <td class="num">${formatRs(l.unitPrice)}</td>
          <td class="num" style="color:#047857;">+${formatRs(l.qty * l.unitPrice)}</td>
        </tr>`,
      )
      .join("");

    const bodyHtml = `
      <div class="head">
        <h1>${escapeHtml(store.name || "Velora POS")}</h1>
        <div class="meta">${escapeHtml(store.tagline || "")}</div>
        <div class="meta">Receipt #${escapeHtml(number)} · Original Order #${escapeHtml(originalNumber)}</div>
        <div class="meta">${escapeHtml(date)} ${escapeHtml(time)}</div>
      </div>
      <h2>${kind === "return" ? "Return / Refund Voucher" : "Exchange Voucher"}</h2>
      <table>
        <thead>
          <tr>
            <th>Item Description</th>
            <th class="num">Qty</th>
            <th class="num">Price</th>
            <th class="num">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${linesHtml}
          ${repLinesHtml}
        </tbody>
      </table>
      <div style="margin-top: 16px;">
        <div class="row">
          <span>Return Credit Value:</span>
          <span>${formatRs(returnCreditTotal)}</span>
        </div>
        ${
          kind === "exchange"
            ? `
          <div class="row">
            <span>Replacement Items Total:</span>
            <span>${formatRs(replacementTotal)}</span>
          </div>
          <div class="row strong">
            <span>${difference >= 0 ? "Amount Collected:" : "Net Refund Paid:"}</span>
            <span>${formatRs(Math.abs(difference))}</span>
          </div>
        `
            : `
          <div class="row strong">
            <span>Net Refund Paid (${escapeHtml(method)}):</span>
            <span>${formatRs(refundAmount)}</span>
          </div>
        `
        }
      </div>
      <div class="foot">
        <div>Processed by: ${escapeHtml(currentUser?.name ?? store.cashier)}</div>
        <div>Thank you for shopping with us!</div>
      </div>
    `;

    printReport(`${kind === "return" ? "Return" : "Exchange"} Receipt - ${number}`, bodyHtml);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Top Header Navigation */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" className="h-9 gap-2 font-medium" asChild>
            <Link to="/till">
              <ArrowLeft className="h-4 w-4" /> Back to Register
            </Link>
          </Button>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <RefreshCcw className="h-4 w-4 text-primary" />
            <h1 className="text-sm font-semibold tracking-tight sm:text-base">
              Returns &amp; Exchanges
            </h1>
          </div>
        </div>

        {selectedOrder && !completedResult && (
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:inline-block">
              Selected: <strong className="text-foreground">{selectedOrder.receipt}</strong>
            </span>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={resetWorkflow}>
              Change Receipt
            </Button>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="min-h-0 flex-1 overflow-y-auto">
        {/* VIEW 1: SEARCH & RECEIPT SELECTION */}
        {!selectedOrder && !completedResult && (
          <div className="mx-auto w-full max-w-4xl p-4 sm:p-6">
            <div className="mb-6 text-center">
              <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Lookup Receipt for Return or Exchange
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Scan the customer's receipt barcode or search by order number, receipt ID, or items.
              </p>
            </div>

            {/* Search Input and Scanner trigger */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search receipt #, order #, cashier, or product name..."
                  className="h-12 pl-10 text-base shadow-sm"
                  autoFocus
                />
              </div>
              <Button
                variant="secondary"
                className="h-12 gap-2 px-4 shadow-sm"
                onClick={triggerQuickScan}
                title="Quick demo scan receipt"
              >
                <QrCode className="h-5 w-5 text-primary" />
                <span className="hidden sm:inline">Scan Sample</span>
              </Button>
            </div>

            <div className="mt-3 flex items-center justify-between px-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-success" />
                <span>Scanner Active: Ready to read barcode directly from anywhere</span>
              </div>
              <span>{matchingOrders.length} completed receipts found</span>
            </div>

            {/* List of matching receipts */}
            <div className="mt-5 space-y-3">
              {matchingOrders.map((ord) => {
                const totals = orderTotals(ord);
                const itemCount = ord.lines.reduce((s, l) => s + l.qty, 0);

                return (
                  <div
                    key={ord.id}
                    onClick={() => selectOrder(ord)}
                    className="group flex cursor-pointer flex-col justify-between gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary hover:shadow-md sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground group-hover:text-primary">
                          {ord.receipt || `RCP/${ord.number}`}
                        </span>
                        <span className="rounded bg-secondary px-2 py-0.5 text-[11px] font-mono text-secondary-foreground">
                          Order #{ord.number}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                            ord.status === "returned"
                              ? "bg-destructive/10 text-destructive border border-destructive/20"
                              : ord.status === "exchanged"
                                ? "bg-accent/10 text-accent border border-accent/20"
                                : "bg-success/10 text-success border border-success/20",
                          )}
                        >
                          {ord.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>Paid at {ord.time || "N/A"}</span>
                        <span>Cashier: {ord.cashier || store.cashier}</span>
                        <span>{itemCount} items</span>
                      </div>

                      <div className="truncate text-xs text-muted-foreground/80">
                        {ord.lines.map((l) => `${l.qty}× ${l.name}`).join(", ")}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-center">
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Total Paid</div>
                        <div className="font-mono text-base font-bold text-foreground">
                          {formatRs(totals.total)}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        className="h-8 gap-1.5 px-3 group-hover:bg-primary group-hover:text-primary-foreground"
                      >
                        <PackageCheck className="h-3.5 w-3.5" />
                        Select
                      </Button>
                    </div>
                  </div>
                );
              })}

              {matchingOrders.length === 0 && (
                <div className="rounded-xl border border-dashed border-border p-12 text-center">
                  <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground/50" />
                  <p className="mt-3 text-sm font-medium text-foreground">No matching receipts found</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Try searching with a different receipt number or item name.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: RETURN & EXCHANGE WORKSPACE */}
        {selectedOrder && !completedResult && (
          <div className="mx-auto flex h-full max-w-7xl flex-col p-4 sm:p-6">
            {/* Top Order Information Ribbon */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-foreground">
                    Receipt {selectedOrder.receipt}
                  </h2>
                  <span className="rounded bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
                    Order #{selectedOrder.number}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Original Date: {selectedOrder.date || "Today"} · Paid: {formatRs(orderTotals(selectedOrder).total)} · Cashier: {selectedOrder.cashier || store.cashier}
                </p>
              </div>

              {/* Mode Toggle: Return vs Exchange */}
              <div className="flex rounded-lg border border-border bg-muted/60 p-1">
                <button
                  type="button"
                  onClick={() => setMode("return")}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold transition-all",
                    mode === "return"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Undo2 className="h-3.5 w-3.5" />
                  Direct Return &amp; Refund
                </button>
                <button
                  type="button"
                  onClick={() => setMode("exchange")}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold transition-all",
                    mode === "exchange"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <RefreshCcw className="h-3.5 w-3.5" />
                  Product Exchange
                </button>
              </div>
            </div>

            {/* Main Interactive Grid */}
            <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[1fr_360px]">
              {/* LEFT COLUMN: Items to Return + Replacements Picker (if exchange) */}
              <div className="space-y-6 overflow-y-auto pr-1">
                {/* 1. Original Items to Return */}
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between border-b border-border pb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        1. Select Items to Return
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Specify how many units the customer is returning and the reason.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleReturnAll}
                        className="h-7 text-xs text-primary"
                      >
                        Return All
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearAll}
                        className="h-7 text-xs text-muted-foreground"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {selectedOrder.lines.map((line) => {
                      const draft = drafts[line.id] ?? { qty: 0, reason: returnReasons[0] };
                      const isReturning = draft.qty > 0;

                      return (
                        <div
                          key={line.id}
                          className={cn(
                            "flex flex-col gap-3 rounded-lg border p-3 transition-colors sm:flex-row sm:items-center sm:justify-between",
                            isReturning
                              ? "border-primary/40 bg-primary/5"
                              : "border-border bg-background",
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm text-foreground">{line.name}</div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              <span>Purchased: <strong>{line.qty}</strong> units</span>
                              <span>Price: <strong>{formatRs(line.unitPrice)}</strong></span>
                              {isReturning && (
                                <span className="font-semibold text-primary">
                                  Credit: {formatRs(draft.qty * line.unitPrice)}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-3">
                            {/* Stepper */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setDrafts((prev) => ({
                                    ...prev,
                                    [line.id]: {
                                      ...draft,
                                      qty: Math.max(0, draft.qty - 1),
                                    },
                                  }))
                                }
                                disabled={draft.qty <= 0}
                                className="grid h-9 w-9 place-items-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-muted disabled:opacity-30"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="grid h-9 w-11 place-items-center rounded-md border border-border bg-card font-mono text-sm font-bold">
                                {draft.qty}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setDrafts((prev) => ({
                                    ...prev,
                                    [line.id]: {
                                      ...draft,
                                      qty: Math.min(line.qty, draft.qty + 1),
                                    },
                                  }))
                                }
                                disabled={draft.qty >= line.qty}
                                className="grid h-9 w-9 place-items-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-muted disabled:opacity-30"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            {/* Reason Dropdown */}
                            <select
                              value={draft.reason}
                              onChange={(e) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [line.id]: { ...draft, reason: e.target.value },
                                }))
                              }
                              disabled={draft.qty === 0}
                              className="h-9 rounded-md border border-border bg-card px-2.5 text-xs font-medium text-foreground disabled:opacity-50"
                            >
                              {returnReasons.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Replacement Picker (Exchange Mode Only) */}
                {mode === "exchange" && (
                  <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                    <div className="mb-3 border-b border-border pb-3">
                      <h3 className="text-sm font-semibold text-foreground">
                        2. Pick Replacement Products
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Search store catalog or scan product barcodes to add replacement items.
                      </p>

                      {/* Search Bar + Category Filters */}
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="Search replacement product..."
                            value={productQuery}
                            onChange={(e) => setProductQuery(e.target.value)}
                            className="h-9 pl-9 text-xs"
                          />
                        </div>
                        <div className="flex gap-1 overflow-x-auto">
                          <Button
                            variant={selectedCategory === null ? "default" : "outline"}
                            size="sm"
                            className="h-9 text-xs"
                            onClick={() => setSelectedCategory(null)}
                          >
                            All Categories
                          </Button>
                          {categoryList.slice(0, 4).map((c) => (
                            <Button
                              key={c.id}
                              variant={selectedCategory === c.id || selectedCategory === c.slug ? "default" : "outline"}
                              size="sm"
                              className="h-9 text-xs whitespace-nowrap"
                              onClick={() => setSelectedCategory(c.id)}
                            >
                              {c.name}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Catalog Grid */}
                    <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
                      {filteredProducts.slice(0, 24).map((prod) => {
                        const repQty = replacements[prod.id] ?? 0;

                        return (
                          <div
                            key={prod.id}
                            onClick={() =>
                              setReplacements((prev) => ({
                                ...prev,
                                [prod.id]: (prev[prod.id] ?? 0) + 1,
                              }))
                            }
                            className={cn(
                              "group flex cursor-pointer flex-col justify-between rounded-lg border p-2.5 transition-all hover:border-primary hover:bg-primary/5",
                              repQty > 0 ? "border-primary bg-primary/5" : "border-border bg-background",
                            )}
                          >
                            <div>
                              <div className="line-clamp-2 text-xs font-semibold text-foreground">
                                {prod.name}
                              </div>
                              <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                                {prod.item_code || prod.barcode || "N/A"}
                              </div>
                            </div>

                            <div className="mt-2 flex items-center justify-between">
                              <span className="font-mono text-xs font-bold text-foreground">
                                {formatRs(prod.price)}
                              </span>
                              {repQty > 0 ? (
                                <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                                  {repQty}
                                </span>
                              ) : (
                                <Plus className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Selected Replacements List */}
                    {replacementLines.length > 0 && (
                      <div className="mt-4 border-t border-border pt-3">
                        <h4 className="mb-2 text-xs font-semibold text-foreground">
                          Selected Replacements ({replacementLines.length})
                        </h4>
                        <div className="space-y-1.5">
                          {replacementLines.map((rep) => (
                            <div
                              key={rep.productId}
                              className="flex items-center justify-between rounded-md border border-border bg-secondary/30 px-3 py-2 text-xs"
                            >
                              <span className="font-medium text-foreground">{rep.name}</span>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setReplacements((prev) => ({
                                        ...prev,
                                        [rep.productId]: Math.max(0, (prev[rep.productId] ?? 0) - 1),
                                      }))
                                    }
                                    className="grid h-6 w-6 place-items-center rounded border border-border bg-card"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </button>
                                  <span className="w-6 text-center font-bold">{rep.qty}</span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setReplacements((prev) => ({
                                        ...prev,
                                        [rep.productId]: (prev[rep.productId] ?? 0) + 1,
                                      }))
                                    }
                                    className="grid h-6 w-6 place-items-center rounded border border-border bg-card"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>
                                <span className="w-20 text-right font-mono font-semibold">
                                  {formatRs(rep.qty * rep.unitPrice)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setReplacements((prev) => {
                                      const next = { ...prev };
                                      delete next[rep.productId];
                                      return next;
                                    })
                                  }
                                  className="text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: Settlement Summary & Confirmation */}
              <div className="space-y-4">
                {/* Financial Overview Card */}
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-foreground">Financial Settlement</h3>

                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Items to Return:</span>
                      <span className="font-medium text-foreground">
                        {returnLines.reduce((s, l) => s + l.qty, 0)} units
                      </span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Return Credit:</span>
                      <span className="text-foreground">{formatRs(returnCreditTotal)}</span>
                    </div>

                    {mode === "exchange" && (
                      <>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Replacement Total:</span>
                          <span className="text-foreground">{formatRs(replacementTotal)}</span>
                        </div>
                        <div className="border-t border-dashed border-border pt-2" />
                        <div className="flex items-center justify-between text-sm font-bold">
                          <span>
                            {difference > 0
                              ? "Customer to Pay:"
                              : difference < 0
                                ? "Refund to Customer:"
                                : "Balance Difference:"}
                          </span>
                          <span
                            className={cn(
                              "font-mono",
                              difference > 0
                                ? "text-primary"
                                : difference < 0
                                  ? "text-success"
                                  : "text-foreground",
                            )}
                          >
                            {difference === 0
                              ? "Even Exchange (Rs. 0.00)"
                              : formatRs(Math.abs(difference))}
                          </span>
                        </div>
                      </>
                    )}

                    {mode === "return" && (
                      <>
                        <div className="border-t border-dashed border-border pt-2" />
                        <div className="flex items-center justify-between text-sm font-bold">
                          <span>Net Refund Due:</span>
                          <span className="font-mono text-success">
                            {formatRs(returnCreditTotal)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Payment / Refund Method Selection */}
                  <div className="mt-5 space-y-2">
                    <label className="text-xs font-semibold text-foreground">
                      {mode === "return" || difference < 0
                        ? "Refund Method:"
                        : "Payment Method:"}
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(["Cash", "Card", "Customer Account"] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setMethod(m)}
                          className={cn(
                            "flex flex-col items-center justify-center gap-1 rounded-lg border p-2 text-center text-xs font-medium transition-all",
                            method === m
                              ? "border-primary bg-primary/10 text-primary font-semibold shadow-sm"
                              : "border-border bg-background text-muted-foreground hover:bg-muted",
                          )}
                        >
                          {m === "Cash" && <Banknote className="h-4 w-4" />}
                          {m === "Card" && <CreditCard className="h-4 w-4" />}
                          {m === "Customer Account" && <UserCheck className="h-4 w-4" />}
                          <span>{m}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Main Action Button */}
                  <div className="mt-6 space-y-2">
                    <Button
                      className="h-12 w-full text-sm font-bold shadow-md"
                      disabled={
                        returnLines.length === 0 ||
                        (mode === "exchange" && replacementLines.length === 0)
                      }
                      onClick={handleConfirm}
                    >
                      {mode === "return" ? (
                        <>
                          <Undo2 className="mr-2 h-4 w-4" />
                          Confirm Refund ({formatRs(returnCreditTotal)})
                        </>
                      ) : difference > 0 ? (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Collect {formatRs(difference)} &amp; Exchange
                        </>
                      ) : difference < 0 ? (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Refund {formatRs(Math.abs(difference))} &amp; Exchange
                        </>
                      ) : (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Complete Even Exchange
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      className="h-9 w-full text-xs"
                      onClick={resetWorkflow}
                    >
                      Cancel &amp; Return to Search
                    </Button>
                  </div>
                </div>

                {/* Helpful POS Notice */}
                <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p>
                    Stock quantities for returned items are automatically returned to inventory. Cash movements are recorded in the register.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: CONFIRMATION & RECEIPT PRINT */}
        {completedResult && (
          <div className="mx-auto flex h-full max-w-lg flex-col justify-center p-4">
            <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-lg">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success">
                <Check className="h-8 w-8" strokeWidth={3} />
              </div>

              <h2 className="mt-4 text-xl font-bold text-foreground">
                {completedResult.kind === "return"
                  ? "Return & Refund Completed!"
                  : "Exchange Completed!"}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Reference: <strong className="text-foreground">{completedResult.number}</strong> against Receipt {selectedOrder?.receipt || completedResult.originalNumber}
              </p>

              {/* Receipt Summary Card */}
              <div className="mt-5 space-y-2 rounded-xl border border-dashed border-border bg-muted/30 p-4 text-left text-xs">
                <div className="font-semibold text-foreground">Returned Items:</div>
                {completedResult.returnLines.map((l) => (
                  <div key={l.productId} className="flex justify-between text-muted-foreground">
                    <span>
                      {l.qty}× {l.name} ({l.reason})
                    </span>
                    <span className="font-mono text-destructive">
                      -{formatRs(l.qty * l.unitPrice)}
                    </span>
                  </div>
                ))}

                {completedResult.replacementLines.length > 0 && (
                  <>
                    <div className="mt-2 border-t border-dashed border-border pt-2 font-semibold text-foreground">
                      Replacement Items:
                    </div>
                    {completedResult.replacementLines.map((l) => (
                      <div key={l.productId} className="flex justify-between text-muted-foreground">
                        <span>
                          {l.qty}× {l.name}
                        </span>
                        <span className="font-mono text-success">
                          +{formatRs(l.qty * l.unitPrice)}
                        </span>
                      </div>
                    ))}
                  </>
                )}

                <div className="border-t border-border pt-2 text-sm font-bold flex justify-between">
                  <span>
                    {completedResult.kind === "return"
                      ? "Refund Paid:"
                      : completedResult.difference >= 0
                        ? "Amount Paid by Customer:"
                        : "Refund Paid to Customer:"}
                  </span>
                  <span className="font-mono">
                    {completedResult.kind === "return"
                      ? formatRs(completedResult.refundAmount)
                      : formatRs(Math.abs(completedResult.difference))}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground text-center pt-1">
                  Settled via {completedResult.method} · Processed by {currentUser?.name ?? store.cashier}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 grid grid-cols-2 gap-3">
                <Button
                  variant="secondary"
                  className="h-11 gap-2 font-semibold"
                  onClick={handlePrintReceipt}
                >
                  <Printer className="h-4 w-4" /> Print Receipt
                </Button>
                <Button
                  className="h-11 font-semibold"
                  onClick={() => navigate({ to: "/till" })}
                >
                  Back to Register
                </Button>
              </div>

              <button
                type="button"
                onClick={resetWorkflow}
                className="mt-3 text-xs font-medium text-primary hover:underline"
              >
                Process Another Return or Exchange
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
