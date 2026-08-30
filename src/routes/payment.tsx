import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Check, Plus, X, Printer, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Keypad } from "@/components/pos/Keypad";
import { PrintModal, SendReceiptModal } from "@/components/pos/ReceiptModals";
import { usePos, orderTotals, type PaymentLine } from "@/lib/pos-context";
import { formatRs, pricelists } from "@/lib/pos-data";
import { useScanTarget } from "@/lib/scan-mode-context";
import { useNumericEntry } from "@/lib/use-numeric-entry";
import { printOrderReceipt } from "@/lib/print-service";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/payment")({
  head: () => ({
    meta: [
      { title: "Payment — Velora POS" },
      { name: "description", content: "Record payments and complete the sale." },
      { property: "og:title", content: "Payment — Velora POS" },
      { property: "og:description", content: "Record payments and complete the sale." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Payment,
});

const methods: PaymentLine["method"][] = ["Cash", "Card", "Customer Account"];

function Payment() {
  const {
    activeOrder,
    addPayment,
    removePayment,
    validateOrder,
    lastPaidOrder,
    productList,
    categoryList,
    customers,
    updateOrder,
  } = usePos();
  const navigate = useNavigate();
  const [printOpen, setPrintOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [method, setMethod] = useState<PaymentLine["method"]>("Cash");

  const pricelist = pricelists.find((p) => p.id === activeOrder?.pricelistId) ?? pricelists[0]!;
  const { total, subtotal } = orderTotals(activeOrder, pricelist.discount);

  // Scan customer card or account barcode at payment
  useScanTarget(
    "payment",
    ({ code }) => {
      const trimmed = code.trim().toLowerCase();
      const matched = customers.find(
        (c) =>
          c.id.toLowerCase() === trimmed ||
          c.name.toLowerCase() === trimmed ||
          c.email.toLowerCase() === trimmed ||
          c.phone?.toLowerCase() === trimmed,
      );
      if (matched) {
        if (activeOrder) updateOrder(activeOrder.id, { customerId: matched.id });
        setMethod("Customer Account");
        toast.success(`Customer ${matched.name} linked to payment`);
        return "added";
      }
      toast.info(`Scanned code: ${code}`);
      return "info";
    },
    !showSuccess,
  );

  const payments = activeOrder?.payments ?? [];
  const tendered = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(0, total - tendered);
  const change = Math.max(0, tendered - total);
  const covered = tendered >= total && total > 0;

  const entry = useNumericEntry({
    enabled: !showSuccess,
    onEnter: () => submit(),
    onEscape: () => undefined,
  });

  const addTender = (amount: number) => {
    if (!activeOrder || amount <= 0) return;
    addPayment(method, amount);
    entry.setValue("");
  };

  const handleValidate = () => {
    validateOrder();
    setShowSuccess(true);
  };

  /** Enter adds the typed tender, or completes the sale when nothing is typed. */
  const submit = () => {
    if (entry.numeric > 0) {
      addTender(entry.numeric);
      return;
    }
    if (tendered >= total && total > 0) handleValidate();
    else toast("Enter an amount to tender");
  };

  if (showSuccess && lastPaidOrder) {
    return (
      <SuccessScreen
        order={lastPaidOrder}
        change={change}
        productList={productList}
        categoryList={categoryList}
        onContinue={() => {
          setShowSuccess(false);
          navigate({ to: "/till" });
        }}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <Button variant="ghost" className="h-11" asChild>
          <Link to="/till">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Link>
        </Button>
        <h1 className="text-lg font-semibold">Payment</h1>
        <span className="text-sm text-muted-foreground">{activeOrder?.number}</span>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 p-4 lg:flex-row">
        <section className="flex flex-1 flex-col gap-4">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <div className="text-center">
              <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Amount due
              </p>
              <p className="mt-1 text-5xl font-semibold tabular-nums">{formatRs(total)}</p>
            </div>

            <dl className="mt-5 space-y-2 border-t border-border pt-4 text-base">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Amount tendered</dt>
                <dd className="font-semibold tabular-nums">{formatRs(tendered)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Remaining</dt>
                <dd
                  className={cn(
                    "font-semibold tabular-nums",
                    remaining > 0 ? "text-destructive" : "text-success",
                  )}
                >
                  {formatRs(remaining)}
                </dd>
              </div>
            </dl>

            {change > 0 && (
              <div className="mt-4 rounded-xl border-2 border-success bg-success-soft p-4 text-center">
                <p className="text-sm font-semibold uppercase tracking-wide">Change due</p>
                <p className="mt-1 text-4xl font-bold tabular-nums text-success">
                  {formatRs(change)}
                </p>
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Payment method</p>
            <div className="grid grid-cols-3 gap-2">
              {methods.map((m) => (
                <PaymentMethodButton
                  key={m}
                  label={m}
                  onClick={() => setMethod(m)}
                  active={method === m}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">
              Payments {payments.length > 0 && `(${payments.length})`}
            </p>
            <div className="space-y-2">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-card p-3"
                >
                  <span className="font-medium">{p.method}</span>
                  <span className="flex items-center gap-3">
                    <span className="font-semibold tabular-nums">{formatRs(p.amount)}</span>
                    <button
                      type="button"
                      onClick={() => removePayment(p.id)}
                      aria-label={`Remove ${p.method} payment`}
                      className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </span>
                </div>
              ))}
              {payments.length === 0 && (
                <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                  No payments yet. Type an amount and add it as a tender. Split payments by adding
                  more than one.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3 lg:w-80">
          <div className="rounded-xl border-2 border-primary bg-card p-3 shadow-[0_0_0_4px_color-mix(in_oklab,var(--primary)_18%,transparent)]">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {method} tender
            </p>
            <p className="mt-1 truncate text-right text-3xl font-semibold tabular-nums">
              {entry.value === "" ? formatRs(0) : `Rs. ${entry.value}`}
            </p>
          </div>

          <Keypad onKey={entry.press} />

          <Button
            variant="secondary"
            className="h-12 text-base"
            disabled={entry.numeric <= 0}
            onClick={() => addTender(entry.numeric)}
          >
            <Plus className="mr-2 h-4 w-4" /> Add {method} tender
          </Button>

          <Button
            className="h-16 text-lg font-semibold"
            disabled={!covered}
            onClick={handleValidate}
          >
            <Check className="mr-2 h-5 w-5" /> Validate
          </Button>

          <Button variant="ghost" className="h-11" asChild>
            <Link to="/till">Back to till</Link>
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Type on the keyboard or the keypad. Enter adds the tender, or completes the sale when
            the order is covered. Escape clears.
          </p>
        </section>
      </main>

      <PrintModal open={printOpen} onOpenChange={setPrintOpen} order={lastPaidOrder} />
      <SendReceiptModal open={sendOpen} onOpenChange={setSendOpen} />
    </div>
  );
}

function PaymentMethodButton({
  label,
  onClick,
  active,
}: {
  label: string;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "min-h-16 rounded-xl border-2 px-3 text-sm font-semibold transition-transform duration-150 active:scale-[0.97]",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function SuccessScreen({
  order,
  change,
  productList,
  categoryList,
  onContinue,
}: {
  order: ReturnType<typeof usePos>["lastPaidOrder"];
  change: number;
  productList?: ReturnType<typeof usePos>["productList"];
  categoryList?: ReturnType<typeof usePos>["categoryList"];
  onContinue: () => void;
}) {
  const { currentUser } = useAuth();
  const [sendOpen, setSendOpen] = useState(false);
  const total = order?.payments && order.payments.length > 0
    ? order.payments.reduce((s, p) => s + p.amount, 0)
    : orderTotals(order ?? undefined).total;

  const handlePrint = () => {
    if (!order) return;
    printOrderReceipt(order, { change, cashier: currentUser?.name ?? "Cashier" });
    toast.success("Sending receipt to printer...");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6">
      <div className="mx-auto grid h-24 w-24 animate-pop-in place-items-center rounded-full bg-success text-success-foreground">
        <Check className="h-12 w-12" strokeWidth={3} />
      </div>
      <h1 className="text-2xl font-semibold">Payment successful</h1>
      <p className="text-3xl font-semibold tabular-nums">{formatRs(total)}</p>
      {change > 0 && (
        <div className="rounded-xl border-2 border-success bg-success-soft px-8 py-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide">Change due</p>
          <p className="mt-1 text-4xl font-bold tabular-nums text-success">{formatRs(change)}</p>
        </div>
      )}
      <div className="flex w-full max-w-md flex-col sm:flex-row gap-2">
        <Button variant="secondary" className="h-12 flex-1 gap-2 font-medium" onClick={handlePrint}>
          <Printer className="h-4 w-4" /> Print
        </Button>
        <Button variant="secondary" className="h-12 flex-1 gap-2 font-medium" onClick={() => setSendOpen(true)}>
          <Send className="h-4 w-4" /> Send Receipt
        </Button>
        <Button className="h-12 flex-1 font-semibold" onClick={onContinue}>
          Continue
        </Button>
      </div>

      <SendReceiptModal
        open={sendOpen}
        onOpenChange={setSendOpen}
      />
    </div>
  );
}
