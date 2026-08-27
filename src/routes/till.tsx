// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MoreVertical, Plus, StickyNote, Trash2, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PosHeader } from "@/components/pos/PosHeader";
import { ProductTile } from "@/components/pos/ProductTile";
import { Keypad } from "@/components/pos/Keypad";
import { ChooseCustomerModal } from "@/components/pos/CustomerModals";
import { CustomerNoteModal, OrderActionsModal } from "@/components/pos/OrderActionModals";
import { usePos, orderTotals, type CartLine } from "@/lib/pos-context";
import { useScanMode, useScanTarget } from "@/lib/scan-mode-context";
import { applyNumericKey, useNumericKeyboard } from "@/lib/use-numeric-entry";
import {
  formatRs,
  pricelists,
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

type EditMode = "qty" | "price" | "percent";

const editLabels: Record<EditMode, string> = {
  qty: "Quantity",
  price: "Price",
  percent: "Discount %",
};

function Till() {
  const {
    activeOrder,
    selectedLineId,
    setSelectedLineId,
    addProduct,
    updateLine,
    removeLine,
    updateOrder,
    customers,
    addByBarcode,
    productList,
    categoryList,
    taxes: taxRates,
    loading,
  } = usePos();
  const { cameraOpen, openCamera } = useScanMode();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [editMode, setEditMode] = useState<EditMode | null>(null);
  const [editValue, setEditValue] = useState("");
  const [pendingSelectProductId, setPendingSelectProductId] = useState<string | null>(null);

  const editing = editMode !== null && selectedLineId !== null;

  // Leaving a line behind cancels the active edit so nothing is applied blindly.
  useEffect(() => {
    setEditMode(null);
    setEditValue("");
  }, [selectedLineId]);

  useEffect(() => {
  if (!pendingSelectProductId || !activeOrder) return;
  const line = activeOrder.lines.find((l) => l.productId === pendingSelectProductId);
  if (line) {
    setSelectedLineId(line.id);
    setPendingSelectProductId(null);
  }
}, [pendingSelectProductId, activeOrder, setSelectedLineId]);

  // USB/Bluetooth scanners work anywhere on the register screen, but stand down
  // while a value is being edited so scanned digits never land in a price.
  useScanTarget(
    "till",
    ({ code }) => {
      const product = addByBarcode(code);
      if (product) {
        toast.success(`${product.name} added`);
        return "added";
      }
      toast.error(`No product matches barcode ${code}`);
      return "unknown";
    },
    !cameraOpen && !editing,
  );

  const applyValue = (raw: string) => {
    if (!selectedLineId || !editMode) return;
    const num = Number(raw);
    if (raw === "" || Number.isNaN(num)) return;
    if (editMode === "qty") updateLine(selectedLineId, { qty: Math.max(1, Math.round(num)) });
    if (editMode === "price") updateLine(selectedLineId, { unitPrice: Math.max(0, num) });
    if (editMode === "percent")
      updateLine(selectedLineId, { discount: Math.max(0, Math.min(100, num)) });
  };

  const onKey = (key: string) => {
    if (key === "qty" || key === "price" || key === "percent") {
      if (!selectedLineId) {
        toast("Select a line first to edit it");
        return;
      }
      setEditMode(key);
      setEditValue("");
      return;
    }
    if (!selectedLineId) {
      toast("Select a line first to use the keypad");
      return;
    }
    if (!editMode) {
      toast("Choose Qty, Price or % to start editing");
      return;
    }
    const next = applyNumericKey(editValue, key, editMode === "qty" ? 0 : 2);
    setEditValue(next);
    applyValue(next);
  };

  useNumericKeyboard({
    enabled: editing,
    onKey,
    onEnter: () => {
      setEditMode(null);
      setEditValue("");
    },
    onEscape: () => {
      setEditMode(null);
      setEditValue("");
    },
  });

  const pricelist = pricelists.find((p) => p.id === activeOrder?.pricelistId) ?? pricelists[0]!;
  const { subtotal, taxes, total } = orderTotals(activeOrder, pricelist.discount, {
    taxes: taxRates,
    products: productList,
    categories: categoryList,
  });

  const filteredProducts = useMemo(() => {
    let list = productList;
    if (category) list = list.filter((p) => p.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name?.toLowerCase().includes(q) || p.barcode.includes(q));
    }
    return list;
  }, [productList, category, search]);


  const handleAddProduct = (product: Product) => {
    addProduct(product);
    setPendingSelectProductId(product.id);
    toast.success(`${product.name} added`);
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
        onScan={() => openCamera("batch")}
      />
      <main className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden lg:flex-row">
        <section className="flex min-h-0 flex-col border-r border-border bg-card lg:w-[26rem] lg:shrink-0 xl:w-[30rem]">
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {activeOrder && activeOrder.lines.length > 0 ? (
              activeOrder.lines.map((line) => (
                <CartLineItem
                  key={line.id}
                  line={line}
                  selected={line.id === selectedLineId}
                  editingLabel={
                    line.id === selectedLineId && editMode ? editLabels[editMode] : null
                  }
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
              <div className="flex min-h-11 items-stretch overflow-hidden rounded-md border border-border">
                <button
                  type="button"
                  onClick={() => setCustomerOpen(true)}
                  className={cn(
                    "flex min-h-11 flex-1 items-center gap-2 px-4 text-sm font-medium transition-colors",
                    customer ? "bg-accent text-accent-foreground" : "bg-card",
                  )}
                >
                  <User className="h-4 w-4" /> {customer ? customer.name : "Customer"}
                </button>
                {customer && (
                  <button
                    type="button"
                    aria-label="Clear customer"
                    onClick={() => {
                      if (activeOrder) updateOrder(activeOrder.id, { customerId: "" });
                      toast.success("Customer cleared");
                    }}
                    className="grid w-11 place-items-center border-l border-border bg-card text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>

                )}
              </div>
              <button
                type="button"
                onClick={() => setNoteOpen(true)}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-md border border-border px-4 text-sm font-medium transition-colors",
                  activeOrder?.note || (activeOrder?.noteTags.length ?? 0) > 0
                    ? "bg-accent text-accent-foreground"
                    : "bg-card",
                )}
              >
                <StickyNote className="h-4 w-4" /> Note
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

           <div
              className={cn(
                "mb-3 space-y-1 rounded-xl bg-muted text-sm",
                editing ? "p-2" : "p-3",
              )}
            >
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
              className={cn("mb-3 w-full text-base", editing ? "h-12" : "h-14")}
              disabled={!activeOrder?.lines.length}
              asChild
            >
              <Link to="/payment">Payment</Link>
            </Button>

            {editing && editMode && (
              <div
                role="status"
                aria-live="polite"
                className="mb-2 flex h-11 items-center justify-between gap-3 rounded-lg border border-primary bg-accent px-3"
              >
                <span className="truncate text-sm font-medium text-accent-foreground">
                  {editLabels[editMode]}
                </span>
                <span className="text-base font-bold tabular-nums text-accent-foreground">
                  {editValue === "" ? "—" : editValue}
                </span>
              </div>
            )}

            <Keypad
              onKey={onKey}
              modes={[
                { label: "Qty", value: "qty", active: editMode === "qty" },
                { label: "Price", value: "price", active: editMode === "price" },
                { label: "%", value: "percent", active: editMode === "percent" },
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
            {categoryList.map((c) => (
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
            {loading
              ? Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-24 animate-pulse rounded-xl border border-border bg-muted"
                  />
                ))
              : filteredProducts.map((p) => {
                  const qty = activeOrder?.lines.find((l) => l.productId === p.id)?.qty ?? 0;
                  return (
                    <ProductTile
                      key={p.id}
                      product={p}
                      qty={qty}
                      onAdd={() => handleAddProduct(p)}
                    />
                  );
                })}
          </div>
        </section>
      </main>

      <ChooseCustomerModal
        open={customerOpen}
        onOpenChange={setCustomerOpen}
        onSelect={(c) => {
          if (activeOrder) updateOrder(activeOrder.id, { customerId: c.id });
          toast.success(`${c.name} assigned`);
        }}
        onClear={() => {
          if (activeOrder) updateOrder(activeOrder.id, { customerId: "" });
          toast.success("Customer cleared");
        }}
      />
      <CustomerNoteModal open={noteOpen} onOpenChange={setNoteOpen} />
      <OrderActionsModal open={actionsOpen} onOpenChange={setActionsOpen} />
    </div>
  );
}

function CartLineItem({
  line,
  selected,
  editingLabel,
  onClick,
  onRemove,
}: {
  line: CartLine;
  selected: boolean;
  editingLabel: string | null;
  onClick: () => void;
  onRemove: () => void;
}) {
  return (
  <div
    role="button"
    tabIndex={0}
    onClick={onClick}
    onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick();
      }
    }}
    className={cn(
      "flex cursor-pointer items-center justify-between gap-3 rounded-xl border-2 p-3 transition-all",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      editingLabel
        ? "border-primary bg-accent shadow-[0_0_0_4px_color-mix(in_oklab,var(--primary)_22%,transparent)]"
        : selected
          ? "border-primary bg-accent"
          : "border-border bg-card",
    )}
  >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="grid h-7 min-w-7 place-items-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
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
