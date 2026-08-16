import { useState } from "react";
import { FileText, MessageCircle, Printer, QrCode, Mail, Smartphone } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatRs, STORE, TAX_RATE } from "@/lib/pos-data";
import type { Order } from "@/lib/pos-context";
import { orderTotals } from "@/lib/pos-context";
import { toast } from "sonner";

export function PrintModal({
  open,
  onOpenChange,
  order,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  order: Order | null;
}) {
  const [mode, setMode] = useState<"full" | "simple" | null>(null);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setMode(null);
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Print</DialogTitle>
        </DialogHeader>
        {!mode ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMode("full")}
              className="flex min-h-32 flex-col items-center justify-center gap-3 rounded-xl bg-primary p-4 font-medium text-primary-foreground transition-transform duration-150 active:scale-[0.97]"
            >
              <Printer className="h-8 w-8" />
              Full Receipt
            </button>
            <button
              type="button"
              onClick={() => setMode("simple")}
              className="flex min-h-32 flex-col items-center justify-center gap-3 rounded-xl bg-secondary p-4 font-medium text-secondary-foreground transition-transform duration-150 active:scale-[0.97]"
            >
              <FileText className="h-8 w-8" />
              Simplified Receipt
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <Receipt order={order} simple={mode === "simple"} />
            <div className="flex gap-2">
              <Button
                className="h-11 flex-1"
                onClick={() => {
                  toast.success("Receipt sent to printer");
                  onOpenChange(false);
                  setMode(null);
                }}
              >
                <Printer className="h-4 w-4" /> Print
              </Button>
              <Button variant="secondary" className="h-11" onClick={() => setMode(null)}>
                Back
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function Receipt({ order, simple }: { order: Order | null; simple?: boolean }) {
  const { subtotal, taxes, total } = orderTotals(order ?? undefined);
  return (
    <div className="max-h-[55vh] overflow-y-auto rounded-xl border border-border bg-card p-5 font-mono text-xs leading-relaxed">
      <div className="text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground">
          V
        </div>
        <p className="mt-2 font-sans text-base font-semibold">{STORE.name}</p>
        <p className="text-muted-foreground">{STORE.email}</p>
      </div>
      <div className="my-3 border-t border-dashed border-border pt-3">
        <Row label="Ticket" value={order?.receipt ?? "RCP/0000"} />
        <Row label="Date" value={new Date().toLocaleString()} />
        <Row label="Served by" value={STORE.cashier} />
      </div>
      {!simple && (
        <div className="border-t border-dashed border-border pt-3">
          {(order?.lines ?? []).map((l) => (
            <Row key={l.id} label={`${l.qty} x ${l.name}`} value={formatRs(l.qty * l.unitPrice)} />
          ))}
        </div>
      )}
      <div className="mt-3 border-t border-dashed border-border pt-3">
        <Row label="Subtotal" value={formatRs(subtotal)} />
        <Row label={`Tax (${Math.round(TAX_RATE * 100)}%)`} value={formatRs(taxes)} />
        <Row label="TOTAL" value={formatRs(total)} bold />
        {(order?.payments ?? []).map((p) => (
          <Row key={p.id} label={p.method} value={formatRs(p.amount)} />
        ))}
      </div>
      <div className="mt-4 flex flex-col items-center gap-1 border-t border-dashed border-border pt-4">
        <QrCode className="h-16 w-16" strokeWidth={1} />
        <p className="font-sans text-sm">Need an invoice?</p>
        <p className="tracking-widest">{order?.number ?? "1001"}-VLR-24</p>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${bold ? "font-bold" : ""}`}>
      <span className="min-w-0 truncate">{label}</span>
      <span className="shrink-0">{value}</span>
    </div>
  );
}

export function SendReceiptModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const options = [
    { label: "Email", icon: Mail },
    { label: "SMS", icon: Smartphone },
    { label: "WhatsApp", icon: MessageCircle },
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Send Receipt</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {options.map((o) => (
            <button
              key={o.label}
              type="button"
              onClick={() => {
                toast.success(`Receipt sent via ${o.label}`);
                onOpenChange(false);
              }}
              className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-border px-4 font-medium transition-colors hover:bg-muted"
            >
              <o.icon className="h-5 w-5 text-primary" />
              {o.label}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
