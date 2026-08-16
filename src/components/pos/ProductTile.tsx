import * as Icons from "lucide-react";
import { formatRs, toneClass, type Product } from "@/lib/pos-data";
import { cn } from "@/lib/utils";

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
  return (
    <button
      type="button"
      onClick={onAdd}
      className="group relative flex min-h-[9.5rem] flex-col overflow-hidden rounded-xl border border-border bg-card text-left shadow-soft transition-transform duration-150 active:scale-[0.97]"
    >
      <div className={cn("flex flex-1 items-center justify-center", toneClass[product.tone])}>
        <ProductIcon name={product.icon} className="h-12 w-12 opacity-80" />
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <span className="truncate text-sm font-medium">{product.name}</span>
        <span className="shrink-0 text-xs text-muted-foreground">{formatRs(product.price)}</span>
      </div>
      {qty > 0 && (
        <span className="absolute right-2 top-2 grid h-7 min-w-7 animate-pop-in place-items-center rounded-full bg-primary px-2 text-xs font-semibold text-primary-foreground">
          {qty}
        </span>
      )}
    </button>
  );
}
