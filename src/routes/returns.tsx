import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  Minus,
  Plus,
  Printer,
  QrCode,
  RefreshCcw,
  Search,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductTile } from "@/components/pos/ProductTile";
import { usePos, orderTotals, type Order, type ReturnLine } from "@/lib/pos-context";
import { TAX_RATE, categories, formatRs, toneClass } from "@/lib/pos-data";
import { returnReasons } from "@/lib/backend-data";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/backend-context";
import { useScanTarget } from "@/lib/scan-mode-context";
import { toast } from "sonner";

export const Route = createFileRoute("/returns")({
  head: () => ({
    meta: [
      { title: "Return / Exchange — Velora POS" },
      {
        name: "description",
        content: "Look up a past receipt to refund or exchange items at the till.",
      },
      { property: "og:title", content: "Return / Exchange — Velora POS" },
      {
        property: "og:description",
        content: "Look up a past receipt to refund or exchange items at the till.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReturnExchange,
});

type Draft = { qty: number; reason: string };

type Stage = "search" | "lines" | "refund" | "exchange" | "done";

function ReturnExchange() {
  const store = useStore();
  const { orders, productList, processReturn } = usePos();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [stage, setStage] = useState<Stage>("search");
  const [method, setMethod] = useState<"Cash" | "Card" | "Customer Account">("Cash");
  const [replacements, setReplacements] = useState<Record<string, number>>({});
  const [category, setCategory] = useState<string | null>(null);
  const [result, setResult] = useState<{ kind: "return" | "exchange"; number: string } | null>(
    null,
  );

  const paidOrders = useMemo(() => orders.filter((o) => o.status === "paid"), [orders]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return paidOrders;
    return paidOrders.filter(
      (o) => o.number.toLowerCase().includes(q) || o.receipt.toLowerCase().includes(q),
    );
  }, [paidOrders, query]);

  const returnLines: ReturnLine[] = order
    ? order.lines
        .filter((l) => (drafts[l.id]?.qty ?? 0) > 0)
        .map((l) => ({
          productId: l.productId,
          name: l.name,
          qty: drafts[l.id]!.qty,
          unitPrice: l.unitPrice,
          reason: drafts[l.id]?.reason ?? "Other",
        }))
    : [];

  const refundNet = returnLines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);
  const refundTotal = refundNet * (1 + TAX_RATE);

  const replacementLines: ReturnLine[] = Object.entries(replacements)
    .filter(([, qty]) => qty > 0)
    .map(([productId, qty]) => {
      const product = productList.find((p) => p.id === productId)!;
      return { productId, name: product.name, qty, unitPrice: product.price, reason: "Exchange" };
    });
  const replacementTotal =
    replacementLines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0) * (1 + TAX_RATE);
  const difference = replacementTotal - refundTotal;

  const selectOrder = (o: Order) => {
    setOrder(o);
    setDrafts(Object.fromEntries(o.lines.map((l) => [l.id, { qty: 0, reason: returnReasons[0] }])));
    setStage("lines");
  };

  const scan = () => {
    const random = paidOrders[Math.floor(Math.random() * paidOrders.length)];
    if (!random) {
      toast("No paid receipts available to scan");
      return;
    }
    toast.success(`Receipt ${random.receipt} scanned`);
    selectOrder(random);
  };

  // Focus-free scanning: receipt barcodes during lookup, product barcodes while
  // picking exchange replacements.
  useScanTarget(
    "return",
    ({ code }) => {
      if (stage === "exchange") {
        const product = productList.find((p) => p.barcode === code);
        if (!product) {
          toast.error(`No product matches barcode ${code}`);
          return "unknown";
        }
        setReplacements((prev) => ({ ...prev, [product.id]: (prev[product.id] ?? 0) + 1 }));
        toast.success(`${product.name} added as replacement`);
        return "added";
      }
      const match = orders.find((o) => o.receipt === code || o.number === code || o.id === code);
      if (!match) {
        setQuery(code);
        toast.error(`No receipt matches ${code}`);
        return "unknown";
      }
      toast.success(`Receipt ${match.receipt} scanned`);
      selectOrder(match);
      return "info";
    },
    stage === "search" || stage === "exchange",
  );

  const confirm = (kind: "return" | "exchange") => {
    if (!order || returnLines.length === 0) return;
    const record = processReturn({
      kind,
      originalOrderId: order.id,
      originalNumber: order.number,
      lines: returnLines,
      replacements: kind === "exchange" ? replacementLines : [],
      refundAmount: refundTotal,
      difference: kind === "exchange" ? difference : -refundTotal,
      method,
      processedBy: store.cashier,
    });
    setResult({ kind, number: record.number });
    setStage("done");
  };

  const filteredProducts = category
    ? productList.filter((p) => p.category === category)
    : productList;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-3 py-2">
        <Button variant="secondary" className="h-11 gap-2" asChild>
          <Link to="/till">
            <ArrowLeft className="h-4 w-4" /> Back to register
          </Link>
        </Button>
        <h1 className="text-base font-semibold">Return / Exchange Order</h1>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        {stage === "search" && (
          <div className="mx-auto w-full max-w-3xl p-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by order number or receipt number"
                  className="h-12 pl-9"
                />
              </div>
              <Button
                variant="secondary"
                className="h-12 w-12 p-0"
                onClick={scan}
                aria-label="Scan receipt QR code"
              >
                <QrCode className="h-5 w-5" />
              </Button>
            </div>

            <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-success" />
              Scanner ready — scan the receipt barcode from anywhere on this screen.
            </p>

            <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card shadow-soft">
              {matches.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => selectOrder(o)}
                  className="flex w-full items-center justify-between gap-3 border-b border-border px-4 py-3 text-left last:border-0 hover:bg-muted"
                >
                  <span>
                    <span className="font-medium">Order {o.number}</span>
                    <span className="block text-sm text-muted-foreground">
                      {o.receipt} · {o.time} · {o.lines.reduce((s, l) => s + l.qty, 0)} items
                    </span>
                  </span>
                  <span className="font-semibold">{formatRs(orderTotals(o).total)}</span>
                </button>
              ))}
              {matches.length === 0 && (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  No paid orders match that search.
                </p>
              )}
            </div>
          </div>
        )}

        {order && (stage === "lines" || stage === "refund" || stage === "exchange") && (
          <div className="mx-auto grid w-full max-w-6xl gap-4 p-4 lg:grid-cols-[1fr_22rem]">
            <div className="space-y-3">
              <div className="rounded-xl border border-border bg-card p-3 shadow-soft">
                <p className="font-medium">
                  Order {order.number} · {order.receipt}
                </p>
                <p className="text-sm text-muted-foreground">
                  Paid at {order.time} · {formatRs(orderTotals(order).total)}
                </p>
              </div>

              {order.lines.map((line) => {
                const draft = drafts[line.id] ?? { qty: 0, reason: returnReasons[0] };
                return (
                  <div
                    key={line.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{line.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {line.qty} × {formatRs(line.unitPrice)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <StepButton
                        onClick={() =>
                          setDrafts((prev) => ({
                            ...prev,
                            [line.id]: { ...draft, qty: Math.max(0, draft.qty - 1) },
                          }))
                        }
                        aria-label={`Decrease return quantity for ${line.name}`}
                      >
                        <Minus className="h-4 w-4" />
                      </StepButton>
                      <span className="grid h-11 w-12 place-items-center rounded-md border border-border font-semibold">
                        {draft.qty}
                      </span>
                      <StepButton
                        onClick={() =>
                          setDrafts((prev) => ({
                            ...prev,
                            [line.id]: { ...draft, qty: Math.min(line.qty, draft.qty + 1) },
                          }))
                        }
                        aria-label={`Increase return quantity for ${line.name}`}
                      >
                        <Plus className="h-4 w-4" />
                      </StepButton>
                    </div>
                    <select
                      value={draft.reason}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [line.id]: { ...draft, reason: e.target.value },
                        }))
                      }
                      className="h-11 rounded-md border border-border bg-card px-3 text-sm"
                      aria-label={`Return reason for ${line.name}`}
                    >
                      {returnReasons.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}

              {stage === "exchange" && (
                <div className="rounded-xl border border-border bg-card p-3">
                  <div className="mb-3 flex items-center gap-2 overflow-x-auto">
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
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {filteredProducts.map((p) => (
                      <ProductTile
                        key={p.id}
                        product={p}
                        qty={replacements[p.id] ?? 0}
                        onAdd={() =>
                          setReplacements((prev) => ({ ...prev, [p.id]: (prev[p.id] ?? 0) + 1 }))
                        }
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <aside className="space-y-3">
              <div className="space-y-1 rounded-xl bg-muted p-3 text-sm">
                <Row
                  label="Items selected"
                  value={String(returnLines.reduce((s, l) => s + l.qty, 0))}
                />
                <Row label="Refund subtotal" value={formatRs(refundNet)} />
                <Row label="Taxes" value={formatRs(refundNet * TAX_RATE)} />
                <div className="flex justify-between text-base font-semibold">
                  <span>Refund total</span>
                  <span>{formatRs(refundTotal)}</span>
                </div>
              </div>

              {stage === "lines" && (
                <div className="grid gap-2">
                  <Button
                    className="h-14 text-base"
                    disabled={returnLines.length === 0}
                    onClick={() => setStage("refund")}
                  >
                    <Undo2 className="h-5 w-5" /> Refund
                  </Button>
                  <Button
                    variant="secondary"
                    className="h-14 text-base"
                    disabled={returnLines.length === 0}
                    onClick={() => setStage("exchange")}
                  >
                    <RefreshCcw className="h-5 w-5" /> Exchange
                  </Button>
                </div>
              )}

              {stage === "refund" && (
                <div className="space-y-2 rounded-xl border border-border bg-card p-3">
                  <p className="text-sm font-medium">Refund method</p>
                  {(["Cash", "Card", "Customer Account"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMethod(m)}
                      className={cn(
                        "flex min-h-11 w-full items-center justify-between rounded-md border border-border px-4 text-sm font-medium",
                        method === m ? "bg-accent text-accent-foreground" : "bg-card",
                      )}
                    >
                      {m} {method === m && <Check className="h-4 w-4" />}
                    </button>
                  ))}
                  <Button className="h-14 w-full text-base" onClick={() => confirm("return")}>
                    Confirm refund
                  </Button>
                  <Button variant="ghost" className="h-11 w-full" onClick={() => setStage("lines")}>
                    Back
                  </Button>
                </div>
              )}

              {stage === "exchange" && (
                <div className="space-y-2 rounded-xl border border-border bg-card p-3">
                  <Row label="Replacement total" value={formatRs(replacementTotal)} />
                  <div className="flex justify-between text-base font-semibold">
                    <span>{difference >= 0 ? "Customer owes" : "Refund due"}</span>
                    <span className={difference >= 0 ? "" : "text-success"}>
                      {formatRs(Math.abs(difference))}
                    </span>
                  </div>
                  <Button
                    className="h-14 w-full text-base"
                    disabled={replacementLines.length === 0}
                    onClick={() => confirm("exchange")}
                  >
                    Confirm exchange
                  </Button>
                  <Button variant="ghost" className="h-11 w-full" onClick={() => setStage("lines")}>
                    Back
                  </Button>
                </div>
              )}
            </aside>
          </div>
        )}

        {stage === "done" && result && order && (
          <div className="mx-auto w-full max-w-md p-4">
            <div className="rounded-xl border border-border bg-card p-6 text-center shadow-soft">
              <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-success-soft">
                <Check className="h-8 w-8 text-success" strokeWidth={3} />
              </span>
              <h2 className="text-lg font-semibold">
                {result.kind === "return" ? "Return processed" : "Exchange processed"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {result.number} · against order {order.number}
              </p>

              <div className="mt-4 space-y-1 border-t border-dashed border-border pt-4 text-left text-sm">
                {returnLines.map((l) => (
                  <div key={l.productId} className="flex justify-between">
                    <span className="text-muted-foreground">
                      {l.qty} × {l.name} ({l.reason})
                    </span>
                    <span>-{formatRs(l.qty * l.unitPrice)}</span>
                  </div>
                ))}
                {replacementLines.map((l) => (
                  <div key={`x-${l.productId}`} className="flex justify-between">
                    <span className="text-muted-foreground">
                      {l.qty} × {l.name}
                    </span>
                    <span>{formatRs(l.qty * l.unitPrice)}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-dashed border-border pt-2 text-base font-semibold">
                  <span>{result.kind === "return" ? "Refunded" : "Difference"}</span>
                  <span>
                    {formatRs(result.kind === "return" ? refundTotal : Math.abs(difference))}
                  </span>
                </div>
                <p className="pt-2 text-center text-xs text-muted-foreground">
                  {store.name} · processed by {store.cashier}
                </p>
              </div>

              <div className="mt-4 grid gap-2">
                <Button
                  variant="secondary"
                  className="h-12"
                  onClick={() => toast.success("Receipt sent to printer")}
                >
                  <Printer className="h-4 w-4" /> Print
                </Button>
                <Button className="h-12" onClick={() => navigate({ to: "/till" })}>
                  Back to till
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function StepButton({ children, onClick, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid h-11 w-11 place-items-center rounded-md border border-border bg-card hover:bg-muted"
      {...rest}
    >
      {children}
    </button>
  );
}
