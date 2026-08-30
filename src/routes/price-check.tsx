// @ts-nocheck
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Barcode, Search, PlusCircle, CheckCircle2, ShoppingBag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePos } from "@/lib/pos-context";
import { useScanTarget } from "@/lib/scan-mode-context";
import { toast } from "sonner";
import { formatRs, type Product } from "@/lib/pos-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/price-check")({
  head: () => ({
    meta: [
      { title: "Price Check — Velora POS" },
      {
        name: "description",
        content: "Scan or search any product to check its exact price instantly.",
      },
      { property: "og:title", content: "Price Check — Velora POS" },
      {
        property: "og:description",
        content: "Scan or search any product to check its exact price instantly.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PriceCheckPage,
});

function PriceCheckPage() {
  const { productList, addProduct } = usePos();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);

  // Focus-free scanner listener: instantly pops up the price modal on scan
  useScanTarget("price-check", ({ code }) => {
    const trimmed = String(code || "").trim().toLowerCase();
    const match = productList.find(
      (p) =>
        (p.barcode && String(p.barcode).toLowerCase() === trimmed) ||
        (p.item_code && String(p.item_code).toLowerCase() === trimmed) ||
        p.id === code,
    );

    if (match) {
      setSelected(match);
      setQuery("");
      toast.success(`Price: ${formatRs(match.price)} — ${match.name}`);
      return "info";
    }

    setQuery(code);
    setSelected(null);
    toast.error(`No product matches barcode: ${code}`);
    return "unknown";
  });

  // Handle typing search with instant exact-match auto-popup
  const handleQueryChange = (val: string) => {
    setQuery(val);
    const trimmed = val.trim().toLowerCase();
    if (!trimmed) return;

    // If exact barcode or item code is typed/scanned into input, open modal immediately
    const exact = productList.find(
      (p) =>
        (p.barcode && String(p.barcode).toLowerCase() === trimmed) ||
        (p.item_code && String(p.item_code).toLowerCase() === trimmed),
    );
    if (exact) {
      setSelected(exact);
      setQuery("");
    }
  };

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return productList.slice(0, 15);
    return productList.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const code = (p.item_code || "").toLowerCase();
      const bar = (p.barcode || "").toLowerCase();
      return name.includes(q) || code.includes(q) || bar.includes(q);
    });
  }, [productList, query]);

  const handleAddToCart = (product: Product) => {
    addProduct(product);
    toast.success(`${product.name} added to register cart`);
    setSelected(null);
    navigate({ to: "/till" });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" className="h-9 gap-2 font-medium" asChild>
            <Link to="/till">
              <ArrowLeft className="h-4 w-4" /> Back to Register
            </Link>
          </Button>
          <div className="h-4 w-px bg-border" />
          <h1 className="text-sm font-semibold sm:text-base">Price Verification</h1>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-success" />
          <span className="hidden sm:inline">Scanner Ready: Point barcode to check price</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 p-4 sm:p-6">
        {/* Search / Scan Input */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Scan barcode or type product name/code..."
              className="h-12 pl-10 text-base shadow-sm"
            />
          </div>
          <Button
            variant="secondary"
            className="h-12 w-12 shrink-0 p-0 shadow-sm"
            onClick={() => {
              const random = productList[Math.floor(Math.random() * productList.length)];
              if (random) {
                setSelected(random);
              }
            }}
            title="Scan sample product"
            aria-label="Scan barcode sample"
          >
            <Barcode className="h-5 w-5 text-primary" />
          </Button>
        </div>

        {/* Ready to Scan Banner */}
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Barcode className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-foreground">Instant Price Scanner Active</h2>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            Scan any product barcode with your scanner. The price modal will automatically pop up with the exact amount to collect.
          </p>
        </div>

        {/* Catalog Search Results */}
        {results.length > 0 && (
          <div className="mt-6">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {query ? `Matching Products (${results.length})` : "Quick Catalog Lookup"}
            </div>
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              {results.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelected(p)}
                  className="flex w-full items-center justify-between gap-3 p-3.5 text-left transition-colors hover:bg-muted"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm text-foreground truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {p.item_code || p.barcode || "N/A"}
                    </div>
                  </div>
                  <div className="font-mono text-base font-bold text-foreground">
                    {formatRs(p.price)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* AUTOMATIC POPUP MODAL ON EXACT BARCODE SCAN / SELECTION */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md p-5 sm:p-6 text-center border-2 border-primary/30 shadow-2xl rounded-2xl overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Price Verification</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
              Amount to Collect
            </div>

            {/* Massive Bold Price */}
            <div className="py-2 text-4xl font-black tracking-tight text-primary sm:text-5xl md:text-6xl break-words">
              {selected ? formatRs(selected.price) : "Rs. 0.00"}
            </div>

            {/* Product Details */}
            {selected && (
              <div className="space-y-1.5 rounded-xl border border-border bg-muted/40 p-3.5 sm:p-4 text-left sm:text-center">
                <h3 className="text-sm sm:text-base font-bold text-foreground leading-snug break-words">
                  {selected.name}
                </h3>
                {selected.name_ur && (
                  <p className="text-xs font-urdu text-muted-foreground" dir="rtl">
                    {selected.name_ur}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-xs font-mono text-muted-foreground">
                  <span className="rounded bg-background px-2 py-0.5 font-semibold border border-border">
                    {selected.item_code || selected.barcode || "No Barcode"}
                  </span>
                  {selected.brand && <span>· Brand: {selected.brand}</span>}
                  <span>· Stock: {selected.stock_qty ?? 0}</span>
                </div>
              </div>
            )}

            {/* Responsive Actions: Full-width stacked buttons prevent horizontal blowout */}
            <div className="flex flex-col gap-2.5 pt-2 w-full">
              <Button
                className="w-full h-11 text-sm font-bold gap-2 shadow-md whitespace-normal py-2 leading-tight"
                onClick={() => selected && handleAddToCart(selected)}
              >
                <PlusCircle className="h-4 w-4 shrink-0" /> Add to Sale &amp; Return to Register
              </Button>
              <Button
                variant="outline"
                className="w-full h-10 text-sm font-medium"
                onClick={() => setSelected(null)}
              >
                Done / Next Scan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
