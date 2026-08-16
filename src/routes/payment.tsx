import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Check, Mail, Receipt, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Keypad } from "@/components/pos/Keypad";
import { PrintModal, SendReceiptModal } from "@/components/pos/ReceiptModals";
import { usePos, orderTotals } from "@/lib/pos-context";
import { formatRs } from "@/lib/pos-data";
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

function Payment() {
  const { activeOrder, addPayment, removePayment, validateOrder, lastPaidOrder } = usePos();
  const navigate = useNavigate();
  const [printOpen, setPrintOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const { total } = orderTotals(activeOrder);
  const paid = activeOrder?.payments.reduce((s, p) => s + p.amount, 0) ?? 0;
  const remaining = Math.max(0, total - paid);
  const covered = paid >= total;

  const onKey = (key: string) => {
    if (key === "backspace") return;
    const num = Number(key);
    if (!Number.isNaN(num) && activeOrder) {
      addPayment("Cash", num);
    } else if (key === "+10" || key === "+20" || key === "+50") {
      const add = Number(key.slice(1));
      addPayment("Cash", Math.min(remaining, add));
    }
  };

  const quickAdd = (method: "Cash" | "Card" | "Customer Account") => {
    addPayment(method, remaining);
  };

  const handleValidate = () => {
    validateOrder();
    setShowSuccess(true);
  };

  if (showSuccess && lastPaidOrder) {
    return (
      <SuccessScreen
        order={lastPaidOrder}
        onPrint={() => setPrintOpen(true)}
        onSend={() => setSendOpen(true)}
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
          <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-soft">
            <p className="text-sm text-muted-foreground">Amount due</p>
            <p className="mt-1 text-5xl font-semibold">{formatRs(total)}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Paid {formatRs(paid)} · Remaining {formatRs(remaining)}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <PaymentMethodButton
              label="Cash"
              onClick={() => quickAdd("Cash")}
              active={activeOrder?.payments.some((p) => p.method === "Cash")}
            />
            <PaymentMethodButton
              label="Card"
              onClick={() => quickAdd("Card")}
              active={activeOrder?.payments.some((p) => p.method === "Card")}
            />
            <PaymentMethodButton
              label="Customer Account"
              onClick={() => quickAdd("Customer Account")}
              active={activeOrder?.payments.some((p) => p.method === "Customer Account")}
            />
          </div>

          <div className="space-y-2">
            {(activeOrder?.payments ?? []).map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{p.method}</span>
                  <span className="text-sm text-muted-foreground">{formatRs(p.amount)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removePayment(p.id)}
                  className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium"
            >
              <User className="h-4 w-4" /> Customer
            </button>
            <button
              type="button"
              className="flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium"
            >
              <Receipt className="h-4 w-4" /> Invoice
            </button>
            <button
              type="button"
              className="flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium"
            >
              <Mail className="h-4 w-4" /> Email
            </button>
          </div>
        </section>

        <section className="flex flex-col gap-3 lg:w-80">
          <Keypad
            onKey={onKey}
            rightColumn={[
              { label: "+10", value: "+10", tone: "green" },
              { label: "+20", value: "+20", tone: "green" },
              { label: "+50", value: "+50", tone: "green" },
            ]}
          />
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" className="h-14" asChild>
              <Link to="/till">Back</Link>
            </Button>
            <Button
              className="h-14 text-base"
              disabled={!covered}
              onClick={handleValidate}
            >
              Validate
            </Button>
          </div>
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
  active = false,
}: {
  label: string;
  onClick: () => void;
  active: boolean | undefined;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-16 rounded-xl border border-border px-4 text-sm font-medium transition-transform duration-150 active:scale-[0.97]",
        active ? "bg-primary text-primary-foreground" : "bg-card",
      )}
    >
      {label}
    </button>
  );
}

function SuccessScreen({
  order,
  onPrint,
  onSend,
  onContinue,
}: {
  order: ReturnType<typeof usePos>["lastPaidOrder"];
  onPrint: () => void;
  onSend: () => void;
  onContinue: () => void;
}) {
  const { total } = orderTotals(order ?? undefined);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6">
      <div className="mx-auto grid h-24 w-24 animate-pop-in place-items-center rounded-full bg-success text-success-foreground">
        <Check className="h-12 w-12" strokeWidth={3} />
      </div>
      <h1 className="text-2xl font-semibold">Payment successful</h1>
      <p className="text-3xl font-semibold">{formatRs(total)}</p>
      <div className="flex w-full max-w-md gap-2">
        <Button variant="secondary" className="h-12 flex-1" onClick={onPrint}>
          Print
        </Button>
        <Button variant="secondary" className="h-12 flex-1" onClick={onSend}>
          Send Receipt
        </Button>
        <Button className="h-12 flex-1" onClick={onContinue}>
          Continue
        </Button>
      </div>
    </div>
  );
}
