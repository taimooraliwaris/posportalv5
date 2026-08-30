// @ts-nocheck
import { useState, useMemo } from "react";
import { ArrowDownLeft, ArrowUpRight, Banknote, Clock, History, Plus, Receipt, Trash2, Wallet } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { usePos } from "@/lib/pos-context";
import { formatRs } from "@/lib/pos-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const commonReasons = {
  in: [
    "Opening Float / Change",
    "Cash Top-up",
    "Customer Account Advance Payment",
    "Cash Returned from Purchase",
    "Other Inflow",
  ],
  out: [
    "Petty Cash / Shop Expense",
    "Supplier Payment",
    "Staff Advance / Salary Payout",
    "Owner Withdrawal / Drawing",
    "Bank Cash Deposit",
    "Tea / Refreshment",
    "Other Outflow",
  ],
};

const presetAmounts = [500, 1000, 2000, 5000, 10000];

export function CashInOutModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { addCashMove, cashMoves, openingCash, orders, activeSessionId, sessionOpenedAt } = usePos();
  const [tab, setTab] = useState<"entry" | "history">("entry");
  const [type, setType] = useState<"in" | "out">("in");
  const [amount, setAmount] = useState("");
  const [selectedReason, setSelectedReason] = useState(commonReasons.in[0]!);
  const [customNote, setCustomNote] = useState("");

  // Scope orders and cash moves strictly to the current active shift session
  const sessionOrders = useMemo(() => {
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

  const sessionCashMoves = useMemo(() => {
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

  // Calculate current estimated cash drawer balance for this shift
  const cashSalesTotal = useMemo(() => {
    return sessionOrders
      .flatMap((o) => o.payments || [])
      .filter((p) => p.method === "Cash")
      .reduce((sum, p) => sum + p.amount, 0);
  }, [sessionOrders]);

  const cashInTotal = useMemo(() => {
    return sessionCashMoves
      .filter((m) => m.type === "in")
      .reduce((sum, m) => sum + m.amount, 0);
  }, [sessionCashMoves]);

  const cashOutTotal = useMemo(() => {
    return sessionCashMoves
      .filter((m) => m.type === "out")
      .reduce((sum, m) => sum + m.amount, 0);
  }, [sessionCashMoves]);

  const estimatedDrawerCash = openingCash + cashSalesTotal + cashInTotal - cashOutTotal;

  const handleTypeChange = (newType: "in" | "out") => {
    setType(newType);
    setSelectedReason(commonReasons[newType][0]!);
  };

  const handlePresetClick = (preset: number) => {
    const current = Number(amount) || 0;
    setAmount(String(current + preset));
  };

  const handleSubmit = () => {
    const num = Number(amount);
    if (!num || num <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const finalReason = customNote.trim()
      ? `${selectedReason}: ${customNote.trim()}`
      : selectedReason;

    addCashMove({
      type,
      amount: num,
      reason: finalReason,
    });

    toast.success(
      `Recorded Cash ${type === "in" ? "In" : "Out"} of ${formatRs(num)} (${selectedReason})`,
    );

    setAmount("");
    setCustomNote("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-hidden p-0">
        <DialogHeader className="border-b border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                <Banknote className="h-4 w-4" />
              </div>
              <DialogTitle className="text-base font-bold">Cash Management</DialogTitle>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase font-semibold text-muted-foreground">Drawer Balance</div>
              <div className="font-mono text-sm font-bold text-foreground">
                {formatRs(estimatedDrawerCash)}
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
          <div className="border-b border-border bg-muted/40 px-4 pt-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="entry" className="gap-1.5 text-xs font-semibold">
                <Plus className="h-3.5 w-3.5" /> Record Cash Move
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1.5 text-xs font-semibold">
                <History className="h-3.5 w-3.5" /> Transaction History ({sessionCashMoves.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="entry" className="space-y-4 p-4 mt-0">
            {/* Transaction Type Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleTypeChange("in")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border p-3 font-semibold text-sm transition-all",
                  type === "in"
                    ? "border-success bg-success/10 text-success shadow-sm"
                    : "border-border bg-card text-muted-foreground hover:bg-muted",
                )}
              >
                <ArrowDownLeft className="h-4 w-4" /> Cash In (Inflow)
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange("out")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border p-3 font-semibold text-sm transition-all",
                  type === "out"
                    ? "border-destructive bg-destructive/10 text-destructive shadow-sm"
                    : "border-border bg-card text-muted-foreground hover:bg-muted",
                )}
              >
                <ArrowUpRight className="h-4 w-4" /> Cash Out (Payout)
              </button>
            </div>

            {/* Amount Entry */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Transaction Amount</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm font-semibold text-muted-foreground">
                  Rs.
                </span>
                <Input
                  autoFocus
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="h-12 pl-12 font-mono text-xl font-bold"
                />
              </div>

              {/* Preset Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {presetAmounts.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handlePresetClick(p)}
                    className="rounded-md border border-border bg-secondary/50 px-2.5 py-1 text-xs font-mono font-medium text-foreground hover:bg-secondary"
                  >
                    +{p}
                  </button>
                ))}
                {amount && (
                  <button
                    type="button"
                    onClick={() => setAmount("")}
                    className="rounded-md border border-border bg-card px-2 py-1 text-xs text-muted-foreground hover:text-destructive"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Reason & Category */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Reason / Category</label>
              <select
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="h-10 w-full rounded-md border border-border bg-card px-3 text-xs font-medium text-foreground"
              >
                {commonReasons[type].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Optional Details / Note
              </label>
              <Input
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="e.g. Paid to vendor for shop supplies..."
                className="h-9 text-xs"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                className={cn(
                  "h-11 flex-1 font-bold text-sm shadow-md",
                  type === "in" ? "bg-success text-success-foreground hover:bg-success/90" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                )}
                disabled={!Number(amount) || Number(amount) <= 0}
                onClick={handleSubmit}
              >
                Confirm Cash {type === "in" ? "In" : "Out"} ({formatRs(Number(amount) || 0)})
              </Button>
              <Button variant="outline" className="h-11 px-4" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="history" className="p-4 mt-0">
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {sessionCashMoves.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "grid h-7 w-7 place-items-center rounded-md font-bold",
                        m.type === "in"
                          ? "bg-success/10 text-success"
                          : "bg-destructive/10 text-destructive",
                      )}
                    >
                      {m.type === "in" ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                    </span>
                    <div>
                      <div className="font-semibold text-foreground capitalize">
                        Cash {m.type}: {m.reason || "Manual Movement"}
                      </div>
                      <div className="text-[10px] text-muted-foreground">ID: {m.id}</div>
                    </div>
                  </div>
                  <div
                    className={cn(
                      "font-mono font-bold text-sm",
                      m.type === "in" ? "text-success" : "text-destructive",
                    )}
                  >
                    {m.type === "in" ? "+" : "-"}{formatRs(m.amount)}
                  </div>
                </div>
              ))}

              {sessionCashMoves.length === 0 && (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No cash movements recorded yet in this session.
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-between border-t border-border pt-3 text-xs">
              <div className="space-y-0.5">
                <div>Total In: <span className="font-mono font-bold text-success">+{formatRs(cashInTotal)}</span></div>
                <div>Total Out: <span className="font-mono font-bold text-destructive">-{formatRs(cashOutTotal)}</span></div>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setTab("entry")}>
                + New Transaction
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
