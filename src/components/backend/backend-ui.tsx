import { useState, type ReactNode } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Keypad } from "@/components/pos/Keypad";
import { formatRs } from "@/lib/pos-data";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  trend,
  hint,
}: {
  label: string;
  value: string;
  trend?: number;
  hint?: string;
}) {
  const up = (trend ?? 0) >= 0;
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {trend !== undefined && (
        <p
          className={cn(
            "mt-1 flex items-center gap-1 text-xs font-medium",
            up ? "text-success" : "text-destructive",
          )}
        >
          {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          {up ? "+" : ""}
          {trend.toFixed(1)}% vs yesterday
        </p>
      )}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const pillStyles: Record<string, string> = {
  paid: "bg-success-soft text-success-foreground",
  received: "bg-success-soft text-success-foreground",
  healthy: "bg-success-soft text-success-foreground",
  active: "bg-success-soft text-success-foreground",
  ongoing: "bg-info/20 text-info-foreground",
  ordered: "bg-info/20 text-info-foreground",
  payment: "bg-warning/40 text-foreground",
  low: "bg-warning/40 text-foreground",
  draft: "bg-muted text-foreground",
  archived: "bg-muted text-foreground",
  cancelled: "bg-destructive/20 text-destructive-foreground",
  out: "bg-destructive/20 text-destructive-foreground",
  returned: "bg-sky text-cat-foreground",
  exchanged: "bg-sand text-cat-foreground",
};

export function StatusPill({ status, label }: { status: string; label?: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize",
        pillStyles[status.toLowerCase()] ?? "bg-muted text-foreground",
      )}
    >
      {label ?? status}
    </span>
  );
}

export function DetailDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div className="space-y-4 px-4 pb-8">{children}</div>
      </SheetContent>
    </Sheet>
  );
}

/** Money is always entered through the same on-screen keypad used at the till. */
export function MoneyKeypadField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const onKey = (key: string) => {
    if (key === "backspace") return onChange(value.slice(0, -1));
    if (key === "clear") return onChange("");
    if (key === "+/-") return onChange(value.startsWith("-") ? value.slice(1) : "-" + value);
    if (key === "+10") return onChange(String((Number(value) || 0) + 10));
    if (key === "+100") return onChange(String((Number(value) || 0) + 100));
    if (key === "." && value.includes(".")) return;
    onChange(value + key);
  };
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="rounded-md border border-border bg-muted px-3 py-2 text-right text-lg font-semibold">
        {formatRs(Number(value) || 0)}
      </div>
      <Keypad
        onKey={onKey}
        rightColumn={[
          { label: "+10", value: "+10" },
          { label: "+100", value: "+100" },
          { label: "Clear", value: "clear", tone: "green" },
        ]}
      />
    </div>
  );
}

/** Same one-tap confirmation pattern used for Cancel Order at the till. */
export function ConfirmAction({
  trigger,
  title,
  body,
  confirmLabel,
  onConfirm,
}: {
  trigger: ReactNode;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{body}</p>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              className="h-11"
              onClick={() => {
                onConfirm();
                setOpen(false);
              }}
            >
              {confirmLabel}
            </Button>
            <Button variant="secondary" className="h-11" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function DataCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card shadow-soft", className)}>
      {children}
    </div>
  );
}

export function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
