import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MoreVertical, Plus, StickyNote, Trash2, Upload, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PosHeader } from "@/components/pos/PosHeader";
import { ProductTile } from "@/components/pos/ProductTile";
import { Keypad } from "@/components/pos/Keypad";
import { ScannerOverlay } from "@/components/pos/ScannerOverlay";
import { ChooseCustomerModal } from "@/components/pos/CustomerModals";
import { OrderActionsModal } from "@/components/pos/OrderActionModals";
import { usePos, orderTotals, type CartLine } from "@/lib/pos-context";
import {
  categories,
  formatRs,
  pricelists,
  products,
  toneClass,
  type Product,
} from "@/lib/pos-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/till")({
  head: () => ({
    meta: [
      { title: "Till — Velora POS" },
      { name: "description", content: "Ring up sales and manage orders at the till." },
      { property: "og:title", content: "Till — Velora POS" },
      { property: "og:description", content: "Ring up sales and manage orders at the till." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Till,
});

type KeypadMode = "qty" | "price" | "percent";

function Till() {
  const {
    activeOrder,
    activeOrderId,
    selectedLineId,
    setSelectedLineId,
    addProduct,
    updateLine,
    removeLine,
    updateOrder,
    customers,
  } = usePos();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [keypadMode, setKeypadMode] = useState<KeypadMode>("qty");
  const [keypadValue, setKeypadValue] = useState("");

  const pricelist = pricelists.find((p) => p.id === activeOrder?.pricelistId) ?? pricelists[0]!;
  const { subtotal, taxes, total } = orderTotals(activeOrder, pricelist.discount);

  const filteredProducts = useMemo(() => {
    let list = products;
    if (category) list = list.filter((p) => p.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.barcode.includes(q));
    }
    return list;
  }, [category, search]);

  const onKey = (key: string) => {
    if (key === "qty" || key === "price" || key === "percent") {
      setKeypadMode(key);
      setKeypadValue("");
      return;
    }
    if (!selectedLineId) {
      toast("Select a line first to use the keypad");
      return;
    }
    if (key === "backspace") {
      setKeypadValue("");
      return;
    }
    if (key === "+/-") {
      setKeypadValue((v) => (v.startsWith("-") ? v.slice(1) : v ? "-" + v : ""));
      return;
    }
    const next = keypadValue + key;
    setKeypadValue(next);
    const num = Number(next);
    if (Number.isNaN(num)) return;
    if (keypadMode === "qty") updateLine(selectedLineId, { qty: Math.max(1, num) });
    if (keypadMode === "price") updateLine(selectedLineId, { unitPrice: Math.max(0, num) });
    if (keypadMode === "percent")
      updateLine(selectedLineId, { discount: Math.max(0, Math.min(100, num)) });
  };
  const handleAddProduct = (product: Product) => {
    addProduct(product);
    const line = activeOrder?.lines.find((l) => l.productId === product.id);
    if (line) setSelectedLineId(line.id);
  };

  const customer = activeOrder?.customerId
    ? customers.find((c) => c.id === activeOrder.customerId)
    : null;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <PosHeader
        tab="register"
        search={search}
        onSearch={setSearch}
        onScan={() => setScanning(true)}
      />
      <main className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden lg:flex-row">
        <section className="flex min-h-0 flex-col border-r border-border bg-card lg:w-[26rem] lg:shrink-0 xl:w-[30rem]">
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {activeOrder && activeOrder.lines.length > 0 ? (
              activeOrder.lines.map((line) => (
                <CartLineItem
                  key={line.id}
                  line={line}
                  selected={line.id === selectedLineId}
                  onClick={() => setSelectedLineId(line.id)}
                  onRemove={() => removeLine(line.id)}
                />
              ))
            ) : (
              <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
                <Plus className="h-8 w-8" />
                <p className="text-sm">Tap a product to add it to the cart</p>
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-border p-3">
            <div className="mb-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCustomerOpen(true)}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-md border border-border px-4 text-sm font-medium transition-colors",
                  customer ? "bg-accent text-accent-foreground" : "bg-card",
                )}
              >
                <User className="h-4 w-4" /> {customer ? customer.name : "Customer"}
              </button>
              <button
                type="button"
                onClick={() => setActionsOpen(true)}
                className="flex min-h-11 items-center gap-2 rounded-md border border-border px-4 text-sm font-medium transition-colors"
              >
                <StickyNote className="h-4 w-4" /> Note
              </button>
              <button
                type="button"
                onClick={() => toast("Upload not implemented in prototype")}
                className="flex min-h-11 items-center gap-2 rounded-md border border-border px-4 text-sm font-medium transition-colors"
              >
                <Upload className="h-4 w-4" /> Upload
              </button>
              <button
                type="button"
                onClick={() => setActionsOpen(true)}
                className="grid h-11 w-11 place-items-center rounded-md border border-border"
                aria-label="Order actions"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-3 space-y-1 rounded-xl bg-muted p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatRs(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Taxes</span>
                <span className="font-medium">{formatRs(taxes)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span>{formatRs(total)}</span>
              </div>
            </div>

            <Button
              className="mb-3 h-14 w-full text-base"
              disabled={activeOrder?.lines.length === 0}
              asChild
            >
              <Link to="/payment">Payment</Link>
            </Button>

            <Keypad
              onKey={onKey}
              rightColumn={[
                { label: "Qty", value: "qty", active: keypadMode === "qty" },
                { label: "Price", value: "price", active: keypadMode === "price" },
                { label: "%", value: "percent", active: keypadMode === "percent" },
              ]}
            />
          </div>
        </section>

        <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
          <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-border p-3">
            <button
              type="button"
              onClick={() => setCategory(null)}
              className={cn(
                "min-h-11 shrink-0 rounded-md border border-border px-4 text-sm font-medium",
                category === null && "bg-primary text-primary-foreground",
              )}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={cn(
                  "min-h-11 shrink-0 rounded-md border border-border px-4 text-sm font-medium",
                  category === c.id && toneClass[c.tone],
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
          <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-3 overflow-y-auto p-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((p) => {
              const qty = activeOrder?.lines.find((l) => l.productId === p.id)?.qty ?? 0;
              return (
                <ProductTile key={p.id} product={p} qty={qty} onAdd={() => handleAddProduct(p)} />
              );
            })}
          </div>
        </section>
      </main>

      {scanning && <ScannerOverlay onClose={() => setScanning(false)} />}
      <ChooseCustomerModal
        open={customerOpen}
        onOpenChange={setCustomerOpen}
        onSelect={(c) => {
          if (activeOrder) updateOrder(activeOrder.id, { customerId: c.id });
          toast.success(`${c.name} assigned`);
        }}
      />
      <OrderActionsModal open={actionsOpen} onOpenChange={setActionsOpen} />
    </div>
  );
}

function CartLineItem({
  line,
  selected,
  onClick,
  onRemove,
}: {
  line: CartLine;
  selected: boolean;
  onClick: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 transition-colors",
        selected ? "border-primary bg-accent" : "border-border bg-card",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="grid h-7 min-w-7 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {line.qty}
          </span>
          <span className="truncate font-medium">{line.name}</span>
        </div>
        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <span>{formatRs(line.unitPrice)}</span>
          {line.discount > 0 && <span className="text-success">-{line.discount}%</span>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-semibold">
          {formatRs(line.qty * line.unitPrice * (1 - line.discount / 100))}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label="Remove line"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
