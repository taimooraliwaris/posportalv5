// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { ArrowLeft, FileText, Printer, CheckCircle2, AlertCircle, ShoppingBag, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePos } from "@/lib/pos-context";
import { formatRs } from "@/lib/pos-data";
import { useStore } from "@/lib/backend-context";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { printZReportDocument } from "@/lib/print-service";

export const Route = createFileRoute("/z-report")({
  head: () => ({
    meta: [
      { title: "Z Report — Velora POS" },
      { name: "description", content: "Official end-of-shift Z report and financial reconciliation summary." },
      { property: "og:title", content: "Z Report — Velora POS" },
      { property: "og:description", content: "Official end-of-shift Z report and financial reconciliation summary." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ZReportPage,
});

function ZReportPage() {
  const { closedSummary, orders, cashMoves, openingCash, activeSessionId, sessionOpenedAt } = usePos();
  const { currentUser } = useAuth();
  const store = useStore();
  const [viewMode, setViewMode] = useState<"summary" | "orders">("summary");

  // Load last closed summary from storage if context was reset
  const snapshot = useMemo(() => {
    if (closedSummary) return closedSummary;
    try {
      const saved = localStorage.getItem("velora_last_z_report");
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  }, [closedSummary]);

  const paidOrders = useMemo(() => {
    if (snapshot?.id) {
      const match = orders.filter((o) => o.sessionId === snapshot.id && o.status === "paid");
      if (match.length > 0) return match;
    }
    return orders.filter((o) => {
      if (o.status !== "paid") return false;
      if (activeSessionId && o.sessionId) return o.sessionId === activeSessionId;
      if (sessionOpenedAt && o.createdAt) return new Date(o.createdAt).getTime() >= new Date(sessionOpenedAt).getTime();
      return true;
    });
  }, [orders, snapshot?.id, activeSessionId, sessionOpenedAt]);

  const cashMovesInSession = useMemo(() => {
    if (snapshot?.id) {
      const match = cashMoves.filter((m) => m.sessionId === snapshot.id);
      if (match.length > 0) return match;
    }
    return cashMoves.filter((m) => {
      if (activeSessionId && m.sessionId) return m.sessionId === activeSessionId;
      if (sessionOpenedAt && m.createdAt) return new Date(m.createdAt).getTime() >= new Date(sessionOpenedAt).getTime();
      return false;
    });
  }, [cashMoves, snapshot?.id, activeSessionId, sessionOpenedAt]);

  const totalSales = snapshot?.totalSales ?? paidOrders.reduce(
    (sum, o) => sum + calculateOrderTotals(o.lines).total,
    0,
  );


  const cashPayments = snapshot?.cashSales ?? paidOrders
    .flatMap((o) => o.payments || [])
    .filter((p) => p.method === "Cash")
    .reduce((s, p) => s + p.amount, 0);

  const cardPayments = snapshot?.cardSales ?? paidOrders
    .flatMap((o) => o.payments || [])
    .filter((p) => p.method === "Card")
    .reduce((s, p) => s + p.amount, 0);

  const accountPayments = snapshot?.accountSales ?? paidOrders
    .flatMap((o) => o.payments || [])
    .filter((p) => p.method === "Customer Account")
    .reduce((s, p) => s + p.amount, 0);

  const cashIn = snapshot?.cashIn ?? cashMovesInSession.filter((m) => m.type === "in").reduce((s, m) => s + m.amount, 0);
  const cashOut = snapshot?.cashOut ?? cashMovesInSession.filter((m) => m.type === "out").reduce((s, m) => s + m.amount, 0);
  const openingFloatVal = snapshot?.openingCash ?? openingCash;

  const expectedCash = snapshot?.expectedCash ?? (openingFloatVal + cashPayments + cashIn - cashOut);
  const counted = snapshot?.counted ?? expectedCash;
  const difference = snapshot?.difference ?? (counted - expectedCash);

  const handlePrintZReport = () => {
    printZReportDocument({
      openingCash: openingFloatVal,
      cashSales: cashPayments,
      cardSales: cardPayments,
      accountSales: accountPayments,
      totalSales,
      cashIn,
      cashOut,
      expectedCash,
      counted,
      difference,
      ordersCount: snapshot?.ordersCount ?? paidOrders.length,
      cashier: snapshot?.cashier ?? (currentUser?.name ?? store.cashier),
      note: snapshot?.note,
    }, store);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" className="h-9 gap-2 font-medium" asChild>
            <Link to="/till">
              <ArrowLeft className="h-4 w-4" /> Back to Till
            </Link>
          </Button>
          <div className="h-4 w-px bg-border" />
          <h1 className="text-sm font-semibold sm:text-base">Shift Z-Report</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setViewMode(v => v === "summary" ? "orders" : "summary")} className="h-9 text-xs">
            {viewMode === "summary" ? "View Order Details" : "View Financial Summary"}
          </Button>
          <Button size="sm" className="h-9 gap-1.5 font-semibold" onClick={handlePrintZReport}>
            <Printer className="h-4 w-4" /> Print Z-Report
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 p-4 sm:p-6">
        {viewMode === "summary" ? (
          <div className="space-y-4">
            {/* Store & Shift Info */}
            <div className="rounded-2xl border border-border bg-card p-5 text-center shadow-sm">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary text-xl font-black text-primary-foreground">
                V
              </div>
              <h2 className="mt-2 text-lg font-bold text-foreground">{store.name || "Velora POS"}</h2>
              <p className="text-xs text-muted-foreground">
                {new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })} · {new Date().toLocaleTimeString()}
              </p>
              <div className="mt-2 flex items-center justify-center gap-4 text-xs text-muted-foreground font-medium">
                <span>Cashier: <strong className="text-foreground">{currentUser?.name ?? store.cashier}</strong></span>
                <span>Orders: <strong className="text-foreground">{paidOrders.length}</strong></span>
              </div>
            </div>

            {/* Financial Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Sales Revenue */}
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Revenue Breakdown
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Cash Sales:</span>
                    <span className="font-mono font-medium text-foreground">{formatRs(cashPayments)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Card Sales:</span>
                    <span className="font-mono font-medium text-foreground">{formatRs(cardPayments)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Customer Account:</span>
                    <span className="font-mono font-medium text-foreground">{formatRs(accountPayments)}</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between font-bold text-sm">
                    <span>Total Sales:</span>
                    <span className="font-mono text-foreground">{formatRs(totalSales)}</span>
                  </div>
                </div>
              </div>

              {/* Cash Drawer Flow */}
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Cash Flow Summary
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Opening Float:</span>
                    <span className="font-mono font-medium text-foreground">{formatRs(openingCash)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Cash In (+):</span>
                    <span className="font-mono font-medium text-success">+{formatRs(cashIn)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Cash Out (-):</span>
                    <span className="font-mono font-medium text-destructive">-{formatRs(cashOut)}</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between font-bold text-sm">
                    <span>Expected Drawer:</span>
                    <span className="font-mono text-primary">{formatRs(expectedCash)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Reconciliation Banner */}
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-foreground">Cash Drawer Reconciliation</h3>
                  <p className="text-xs text-muted-foreground">
                    Physical count vs system calculated drawer expectation.
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">Variance</div>
                  <div
                    className={cn(
                      "font-mono text-lg font-black",
                      difference === 0 ? "text-success" : difference > 0 ? "text-primary" : "text-destructive",
                    )}
                  >
                    {difference > 0 ? "+" : ""}{formatRs(difference)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-border/60 pt-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Expected:</span>
                  <div className="font-mono font-bold text-sm text-foreground">{formatRs(expectedCash)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Counted:</span>
                  <div className="font-mono font-bold text-sm text-foreground">{formatRs(counted)}</div>
                </div>
              </div>

              {snapshot?.note && (
                <div className="rounded-lg bg-card/60 p-2.5 text-xs text-muted-foreground border border-border/50">
                  <strong>Closing Note:</strong> {snapshot.note}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button className="h-11 flex-1 font-bold" onClick={handlePrintZReport}>
                <Printer className="mr-2 h-4 w-4" /> Print Thermal Z-Report
              </Button>
              <Button variant="outline" className="h-11 px-6" asChild>
                <Link to="/till">Back to Register</Link>
              </Button>
            </div>
          </div>
        ) : (
          /* Order Breakdown Table */
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-foreground">Shift Transactions ({paidOrders.length})</h2>
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
              {paidOrders.map((o) => {
                const orderTotal = o.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
                const itemCount = o.lines.reduce((s, l) => s + l.qty, 0);

                return (
                  <div key={o.id} className="flex items-center justify-between p-3 text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 font-bold text-foreground">
                        <span>{o.receipt || `RCP/${o.number}`}</span>
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                          #{o.number}
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        {o.time} · {itemCount} items · {o.payments.map((p) => p.method).join(", ")}
                      </div>
                    </div>
                    <div className="font-mono font-bold text-sm text-foreground">
                      {formatRs(orderTotal)}
                    </div>
                  </div>
                );
              })}

              {paidOrders.length === 0 && (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No orders completed during this session.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
