import { useState } from "react";
import { FileText, MessageCircle, Printer, QrCode, Mail, Smartphone, Settings2, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatRs } from "@/lib/pos-data";
import { useStore } from "@/lib/backend-context";
import { usePos, orderTotals, type Order } from "@/lib/pos-context";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { printOrderReceipt, getPrinterSettings, savePrinterSettings, type PrinterProfile } from "@/lib/print-service";
import { cn } from "@/lib/utils";

export function PrintModal({
  open,
  onOpenChange,
  order,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  order: Order | null;
}) {
  const { currentUser } = useAuth();
  const store = useStore();
  const [mode, setMode] = useState<"full" | "simple" | null>(null);
  const [profile, setProfile] = useState<PrinterProfile>(() => getPrinterSettings().defaultProfile);
  const [showSettings, setShowSettings] = useState(false);

  const handlePrint = (simplified = false) => {
    if (!order) {
      toast.error("No active order to print");
      return;
    }

    printOrderReceipt(order, {
      store,
      simplified,
      cashier: currentUser?.name ?? store.cashier,
      profile,
    });

    toast.success(`Receipt sent to ${profile === "thermal-80" ? "80mm POS Printer" : profile === "thermal-58" ? "58mm Mini Printer" : "A4 Standard Printer"}`);
    onOpenChange(false);
    setMode(null);
  };

  const handleSetDefaultProfile = (newProfile: PrinterProfile) => {
    setProfile(newProfile);
    savePrinterSettings({ defaultProfile: newProfile });
    toast.success(`Default printer layout set to ${newProfile === "thermal-80" ? "Thermal 80mm POS" : newProfile === "thermal-58" ? "Thermal 58mm Mini" : "Standard A4"}`);
  };
  
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setMode(null);
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md p-5 rounded-2xl">
        <DialogHeader className="border-b border-border pb-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Printer className="h-4 w-4 text-primary" /> Print Sales Receipt
            </DialogTitle>
            <button
              type="button"
              onClick={() => setShowSettings((v) => !v)}
              className="text-xs flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground"
            >
              <Settings2 className="h-3.5 w-3.5" /> Printer Layout
            </button>
          </div>
        </DialogHeader>

        {/* Printer Profile Selector */}
        {showSettings && (
          <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-2 text-xs animate-in fade-in duration-150">
            <div className="font-semibold text-foreground">Select / Set Default Printer Format:</div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: "thermal-80", label: "80mm POS (Default)" },
                { id: "thermal-58", label: "58mm Mini" },
                { id: "standard-a4", label: "A4 Invoice" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSetDefaultProfile(p.id as PrinterProfile)}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all",
                    profile === p.id
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                      : "border-border bg-card text-muted-foreground hover:bg-muted",
                  )}
                >
                  <span>{p.label}</span>
                  {profile === p.id && <Check className="h-3 w-3 mt-1" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {!mode ? (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => handlePrint(false)}
              className="flex min-h-32 flex-col items-center justify-center gap-2.5 rounded-xl bg-primary p-4 font-semibold text-sm text-primary-foreground shadow-md transition-transform duration-150 active:scale-[0.97]"
            >
              <Printer className="h-7 w-7" />
              <span>Full POS Receipt</span>
              <span className="text-[10px] font-normal opacity-80">All items &amp; totals</span>
            </button>
            <button
              type="button"
              onClick={() => handlePrint(true)}
              className="flex min-h-32 flex-col items-center justify-center gap-2.5 rounded-xl border border-border bg-secondary p-4 font-semibold text-sm text-secondary-foreground shadow-sm transition-transform duration-150 active:scale-[0.97]"
            >
              <FileText className="h-7 w-7 text-primary" />
              <span>Simplified Receipt</span>
              <span className="text-[10px] font-normal opacity-80">Quick total slip</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            <Receipt order={order} simple={mode === "simple"} />
            <div className="flex gap-2">
              <Button
                className="h-11 flex-1 font-bold gap-2"
                onClick={() => handlePrint(mode === "simple")}
              >
                <Printer className="h-4 w-4" /> Print Now
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
  const { currentUser } = useAuth();
  const store = useStore();
  const { productList, categoryList } = usePos();
  const { subtotal, total } = orderTotals(order ?? undefined, 0);

  return (
    <div className="max-h-[55vh] overflow-y-auto rounded-xl border border-border bg-card p-5 font-mono text-xs leading-relaxed">
      <div className="text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground">
          V
        </div>
        <p className="mt-2 font-sans text-base font-semibold">{store.name}</p>
        <p className="text-muted-foreground">{store.email}</p>
      </div>
      <div className="my-3 border-t border-dashed border-border pt-3">
        <Row label="Ticket" value={order?.receipt ?? "RCP/0000"} />
        <Row label="Date" value={new Date().toLocaleString()} />
        <Row label="Served by" value={currentUser?.name ?? store.cashier} />
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
        <Row label="Total" value={formatRs(total)} bold />
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
