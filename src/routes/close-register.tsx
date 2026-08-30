// @ts-nocheck
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  ArrowLeft,
  Banknote,
  Calculator,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Coins,
  CreditCard,
  FileSpreadsheet,
  History,
  Info,
  LogOut,
  Receipt,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { usePos } from "@/lib/pos-context";
import { formatRs } from "@/lib/pos-data";
import { useAuth } from "@/lib/auth-context";
import { useStore } from "@/lib/backend-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/close-register")({
  head: () => ({
    meta: [
      { title: "Close Register — Velora POS" },
      {
        name: "description",
        content: "Reconcile cash drawer, review shift financial summary, and close register.",
      },
      { property: "og:title", content: "Close Register — Velora POS" },
      {
        property: "og:description",
        content: "Reconcile cash drawer, review shift financial summary, and close register.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CloseRegisterPage,
});

const denominations = [5000, 1000, 500, 100, 50, 20, 10, 5, 2, 1];

function CloseRegisterPage() {
  const { openingCash, cashMoves, orders, closeRegister, activeSessionId, sessionOpenedAt } = usePos();
  const { currentUser } = useAuth();
  const store = useStore();
  const navigate = useNavigate();

  const [counted, setCounted] = useState("");
  const [note, setNote] = useState("");
  const [denomCounts, setDenomCounts] = useState<Record<number, number>>({});
  const [showDenomCalc, setShowDenomCalc] = useState(false);

  // Exact real-time figures scoped strictly to the current active session
  const completedOrders = useMemo(() => {
    return orders.filter((o) => {
      const isPaid = o.status === "paid" || o.status === "exchanged";
      if (!isPaid) return false;
      if (activeSessionId && o.sessionId) {
        return o.sessionId === activeSessionId;
      }
      if (sessionOpenedAt) {
        const orderTime = o.createdAt
          ? new Date(o.createdAt).getTime()
          : o.date && o.time
            ? new Date(`${o.date}T${o.time}`).getTime()
            : o.date
              ? new Date(o.date).getTime()
              : 0;
        const openTime = new Date(sessionOpenedAt).getTime();
        return Number.isFinite(orderTime) && orderTime >= openTime && orderTime > 0;
      }
      return false;
    });
  }, [orders, activeSessionId, sessionOpenedAt]);

  const cashMovesInSession = useMemo(() => {
    return cashMoves.filter((m) => {
      if (activeSessionId && m.sessionId) {
        return m.sessionId === activeSessionId;
      }
      if (sessionOpenedAt) {
        const moveTime = m.createdAt
          ? new Date(m.createdAt).getTime()
          : m.date
            ? new Date(m.date).getTime()
            : 0;
        const openTime = new Date(sessionOpenedAt).getTime();
        return Number.isFinite(moveTime) && moveTime >= openTime && moveTime > 0;
      }
      return false;
    });
  }, [cashMoves, activeSessionId, sessionOpenedAt]);

  const totalItemsSold = useMemo(() => {
    return completedOrders.reduce((sum, o) => sum + o.lines.reduce((s, l) => s + l.qty, 0), 0);
  }, [completedOrders]);

  const cashSales = useMemo(() => {
    return completedOrders
      .flatMap((o) => o.payments || [])
      .filter((p) => p.method === "Cash")
      .reduce((sum, p) => sum + p.amount, 0);
  }, [completedOrders]);

  const cardSales = useMemo(() => {
    return completedOrders
      .flatMap((o) => o.payments || [])
      .filter((p) => p.method === "Card")
      .reduce((sum, p) => sum + p.amount, 0);
  }, [completedOrders]);

  const accountSales = useMemo(() => {
    return completedOrders
      .flatMap((o) => o.payments || [])
      .filter((p) => p.method === "Customer Account")
      .reduce((sum, p) => sum + p.amount, 0);
  }, [completedOrders]);

  const totalGrossSales = cashSales + cardSales + accountSales;

  const cashIn = useMemo(() => {
    return cashMovesInSession
      .filter((m) => m.type === "in")
      .reduce((sum, m) => sum + m.amount, 0);
  }, [cashMovesInSession]);

  const cashOut = useMemo(() => {
    return cashMovesInSession
      .filter((m) => m.type === "out")
      .reduce((sum, m) => sum + m.amount, 0);
  }, [cashMovesInSession]);

  // Exact expected cash in drawer
  const expectedCash = openingCash + cashSales + cashIn - cashOut;

  // Handle denomination calculation
  const totalFromDenominations = useMemo(() => {
    return Object.entries(denomCounts).reduce((sum, [denom, count]) => {
      return sum + Number(denom) * (Number(count) || 0);
    }, 0);
  }, [denomCounts]);

  const handleDenomChange = (denom: number, countStr: string) => {
    const count = parseInt(countStr, 10) || 0;
    const next = { ...denomCounts, [denom]: Math.max(0, count) };
    setDenomCounts(next);
    const sum = Object.entries(next).reduce((s, [d, c]) => s + Number(d) * (Number(c) || 0), 0);
    setCounted(sum > 0 ? String(sum) : "");
  };

  const countedNum = Number(counted) || 0;
  const difference = countedNum - expectedCash;

  const handleClose = () => {
    if (counted === "" || isNaN(Number(counted))) {
      toast.error("Please enter the physical cash counted in drawer");
      return;
    }

    const summaryData = {
      id: activeSessionId || `ses-${Date.now().toString(36)}`,
      date: new Date().toISOString().slice(0, 10),
      counted: countedNum,
      note: note.trim(),
      openingCash,
      cashSales,
      cardSales,
      accountSales,
      totalSales: totalGrossSales,
      cashIn,
      cashOut,
      expectedCash,
      difference,
      ordersCount: completedOrders.length,
      itemsCount: totalItemsSold,
      cashier: currentUser?.name ?? store.cashier,
      openedAt: sessionOpenedAt ? new Date(sessionOpenedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "09:00",
      closedAt: new Date().toISOString(),
    };

    closeRegister(countedNum, note);
    try {
      const existingHistory = JSON.parse(localStorage.getItem("velora_session_history") || "[]");
      existingHistory.push({
        id: summaryData.id,
        date: summaryData.date,
        cashier: summaryData.cashier,
        openedAt: summaryData.openedAt,
        closedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        openingFloat: openingCash,
        totalSales: totalGrossSales,
        cashSales,
        cardSales,
        accountSales,
        variance: difference,
        orderCount: completedOrders.length,
        cashIn,
        cashOut,
        expectedCash,
        actualCounted: countedNum,
        note: note.trim(),
      });
      localStorage.setItem("velora_session_history", JSON.stringify(existingHistory));
      localStorage.setItem("velora_last_z_report", JSON.stringify(summaryData));
    } catch {}

    toast.success("Register closed and reconciled successfully");
    navigate({ to: "/z-report" });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" className="h-9 gap-2 font-medium" asChild>
            <Link to="/till">
              <ArrowLeft className="h-4 w-4" /> Back to Register
            </Link>
          </Button>
          <div className="h-4 w-px bg-border" />
          <h1 className="text-sm font-semibold sm:text-base">Shift Reconciliation &amp; Close Register</h1>
        </div>
        <div className="text-xs text-muted-foreground">
          Cashier: <strong className="text-foreground">{currentUser?.name ?? store.cashier}</strong>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 p-4 sm:p-6">
        <div className="grid gap-6 md:grid-cols-[1fr_340px]">
          {/* LEFT: FINANCIAL RECONCILIATION & CASH COUNT */}
          <div className="space-y-5">
            {/* 1. Cash Drawer Breakdown */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-primary" />
                  <h2 className="font-bold text-base text-foreground">Cash Drawer Reconciliation</h2>
                </div>
                <span className="text-xs font-mono text-muted-foreground">
                  {completedOrders.length} orders settled
                </span>
              </div>

              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Opening Cash Float:</span>
                  <span className="font-mono font-medium text-foreground">{formatRs(openingCash)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Cash Sales (+):</span>
                  <span className="font-mono font-medium text-success">+{formatRs(cashSales)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Cash Inflow Moves (+):</span>
                  <span className="font-mono font-medium text-success">+{formatRs(cashIn)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Cash Payouts / Expenses (-):</span>
                  <span className="font-mono font-medium text-destructive">-{formatRs(cashOut)}</span>
                </div>

                <div className="border-t border-border pt-3 flex justify-between font-bold text-base">
                  <span>Expected Cash in Drawer:</span>
                  <span className="font-mono text-primary text-lg">{formatRs(expectedCash)}</span>
                </div>
              </div>
            </div>

            {/* 2. Physical Cash Count */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-base text-foreground">Physical Cash Count</h3>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDenomCalc((v) => !v)}
                  className="h-8 text-xs gap-1 text-primary"
                >
                  <Calculator className="h-3.5 w-3.5" />
                  {showDenomCalc ? "Hide Denominations" : "Count by Currency Notes"}
                </Button>
              </div>

              {/* Denomination Counter Grid */}
              {showDenomCalc && (
                <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 animate-in fade-in duration-200">
                  <div className="mb-3 text-xs font-semibold text-muted-foreground">
                    Enter quantity of each note / coin in cash drawer:
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {denominations.map((d) => (
                      <div key={d} className="rounded-lg border border-border bg-card p-2 text-center">
                        <div className="font-mono text-xs font-bold text-foreground">Rs. {d}</div>
                        <Input
                          type="number"
                          min="0"
                          value={denomCounts[d] || ""}
                          onChange={(e) => handleDenomChange(d, e.target.value)}
                          placeholder="0"
                          className="h-8 text-center font-mono mt-1 text-xs"
                        />
                        <div className="text-[10px] text-muted-foreground font-mono mt-1">
                          ={formatRs((denomCounts[d] || 0) * d)}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-right text-xs font-bold text-foreground">
                    Denominations Total: <span className="font-mono text-primary">{formatRs(totalFromDenominations)}</span>
                  </div>
                </div>
              )}

              {/* Main Total Count Input */}
              <div>
                <label className="text-xs font-semibold text-foreground">Total Actual Cash Counted</label>
                <div className="relative mt-1.5">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-base font-bold text-muted-foreground">
                    Rs.
                  </span>
                  <Input
                    autoFocus
                    value={counted}
                    onChange={(e) => setCounted(e.target.value)}
                    inputMode="decimal"
                    placeholder="0.00"
                    className="h-12 pl-12 font-mono text-xl font-bold"
                  />
                </div>
              </div>

              {/* Real-time Variance / Difference */}
              <div className="rounded-xl border border-border bg-muted/40 p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-muted-foreground">Cash Discrepancy</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {difference === 0 && counted !== ""
                      ? "Perfect Match: Cash drawer is fully balanced."
                      : difference > 0
                        ? "Cash Surplus / Excess in drawer."
                        : difference < 0
                          ? "Cash Shortage in drawer."
                          : "Enter counted cash to compare."}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={cn(
                      "font-mono text-xl font-black",
                      difference === 0 && counted !== ""
                        ? "text-success"
                        : difference > 0
                          ? "text-primary"
                          : difference < 0
                            ? "text-destructive"
                            : "text-muted-foreground",
                    )}
                  >
                    {difference > 0 ? "+" : ""}
                    {formatRs(difference)}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Closing Note */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-2">
              <label className="text-xs font-semibold text-foreground">Shift / Closing Note</label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional notes regarding shift, drawer discrepancies, or handover remarks..."
                className="min-h-20 text-xs"
              />
            </div>
          </div>

          {/* RIGHT: OVERALL SALES BREAKDOWN & ACTIONS */}
          <div className="space-y-4">
            {/* Sales Summary Card */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-foreground">Shift Revenue Summary</h3>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Banknote className="h-3.5 w-3.5 text-success" /> Cash Sales:
                  </span>
                  <span className="font-mono font-medium text-foreground">{formatRs(cashSales)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5 text-primary" /> Card Sales:
                  </span>
                  <span className="font-mono font-medium text-foreground">{formatRs(cardSales)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-accent" /> Customer Account:
                  </span>
                  <span className="font-mono font-medium text-foreground">{formatRs(accountSales)}</span>
                </div>

                <div className="border-t border-border pt-2.5 flex justify-between font-bold text-sm">
                  <span>Total Gross Revenue:</span>
                  <span className="font-mono text-foreground">{formatRs(totalGrossSales)}</span>
                </div>

                <div className="flex justify-between text-muted-foreground pt-1 text-[11px]">
                  <span>Items Ring Up:</span>
                  <span>{totalItemsSold} units</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <Button
                className="h-12 w-full text-base font-bold shadow-md gap-2"
                disabled={counted === "" || isNaN(Number(counted))}
                onClick={handleClose}
              >
                <CheckCircle2 className="h-5 w-5" /> Confirm &amp; Close Register
              </Button>
              <Button variant="outline" className="h-10 w-full text-xs font-semibold" asChild>
                <Link to="/till">Cancel &amp; Return to Till</Link>
              </Button>
            </div>

            <div className="rounded-xl border border-border bg-muted/40 p-3 text-[11px] text-muted-foreground flex gap-2">
              <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
              <span>
                Closing the register finalizes the active shift, archives drawer movements, and generates the Z-Report for auditing.
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
