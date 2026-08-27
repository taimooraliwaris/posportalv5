// @ts-nocheck
import * as Icons from "lucide-react";
import { AlertTriangle } from "lucide-react";
import { useBackend } from "@/lib/backend-context";
import { stockStatus } from "@/lib/backend-data";
import { formatRs, toneClass, type Product } from "@/lib/pos-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function ProductIcon({ name, className }: { name: string; className?: string }) {
  const Cmp = (Icons as unknown as Record<string, Icons.LucideIcon>)[name] ?? Icons.Package;
  return <Cmp className={className} strokeWidth={1.4} />;
}

export function ProductTile({
  product,
  qty,
  onAdd,
}: {
  product: Product;
  qty: number;
  onAdd: () => void;
}) {
  const { stockFor } = useBackend();
  const stock = stockFor(product.id);
  const available = stock ? stock.onHand - stock.reserved : null;
  const status = stock ? stockStatus(stock) : "healthy";

  return (
    <button
      type="button"
      onClick={() => {
        if (status === "out") {
          toast.error(`${product.name} is out of stock`);
          return;
        }
        onAdd();
      }}
      className={cn(
        "group relative flex min-h-[9.5rem] flex-col overflow-hidden rounded-xl border bg-card text-left shadow-soft transition-transform duration-150 active:scale-[0.97]",
        status === "out"
          ? "border-destructive opacity-70"
          : status === "low"
            ? "border-warning"
            : "border-border",
      )}
    >
      <div className={cn("flex flex-1 items-center justify-center", toneClass[product.tone])}>
        <ProductIcon name={product.icon} className="h-12 w-12 opacity-80" />
      </div>

      <div className="flex items-center justify-between gap-2 px-3 pt-2">
        <span className="truncate text-sm font-medium">{product.name}</span>
        <span className="shrink-0 text-xs text-muted-foreground">{formatRs(product.price)}</span>
      </div>

      {available !== null && (
        <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-1">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
              status === "out"
                ? "bg-destructive/15 text-destructive"
                : status === "low"
                  ? "bg-warning/40 text-foreground"
                  : "bg-muted text-muted-foreground",
            )}
          >
            {status !== "healthy" && <AlertTriangle className="h-3 w-3" />}
            QTY {Math.max(0, available)}
          </span>
          {status !== "healthy" && (
            <span
              className={cn(
                "truncate text-xs font-medium",
                status === "out" ? "text-destructive" : "text-foreground",
              )}
            >
              {status === "out" ? "Out of stock" : "Low stock"}
            </span>
          )}
        </div>
      )}

      {qty > 0 && (
        <span className="absolute left-2 top-2 grid h-7 min-w-7 animate-pop-in place-items-center rounded-full bg-primary px-2 text-xs font-semibold text-primary-foreground">
          {qty}
        </span>
      )}
    </button>
  );
}
