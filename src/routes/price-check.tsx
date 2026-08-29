// @ts-nocheck
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Barcode, Search, PlusCircle, CheckCircle2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  // Focus-free scanner listener: instantly selects product and displays price
  useScanTarget("price-check", ({ code }) => {
    const trimmed = code.trim().toLowerCase();
    const match = productList.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === trimmed) ||
        (p.item_code && p.item_code.toLowerCase() === trimmed) ||
        p.id === code,
    );

    if (match) {
      setSelected(match);
      setQuery(match.barcode || match.item_code || match.name);
      toast.success(`Price checked: ${match.name}`);
      return "info";
    }

    setQuery(code);
    setSelected(null);
    toast.error(`No product matches barcode: ${code}`);
    return "unknown";
  });

  const handleAddToCart = (product: Product) => {
    addProduct(product);
    toast.success(`${product.name} added to register cart`);
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
          <span className="hidden sm:inline">Scanner Active</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 p-4 sm:p-6">
        {/* Search Bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
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
                setQuery(random.barcode || random.item_code || random.name);
              }
            }}
            title="Scan sample product"
            aria-label="Scan barcode sample"
          >
            <Barcode className="h-5 w-5 text-primary" />
          </Button>
        </div>

        {/* SELECTED PRODUCT: DEDICATED PRICE DISPLAY ONLY */}
        {selected ? (
          <div className="mt-6 rounded-2xl border-2 border-primary/40 bg-card p-6 text-center shadow-lg animate-in fade-in zoom-in-95 duration-150">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Amount to Collect
            </span>

            {/* Huge Price Presentation */}
            <div className="my-3 text-5xl font-black tracking-tight text-primary sm:text-6xl">
              {formatRs(selected.price)}
            </div>

            {/* Clean Product Details */}
            <div className="mt-2 space-y-1">
              <h2 className="text-lg font-bold text-foreground sm:text-xl">{selected.name}</h2>
              {selected.name_ur && (
                <p className="text-sm font-urdu text-muted-foreground" dir="rtl">
                  {selected.name_ur}
                </p>
              )}
              <div className="mt-2 flex items-center justify-center gap-2 text-xs font-mono text-muted-foreground">
                <span className="rounded bg-muted px-2 py-0.5 font-semibold">
                  {selected.item_code || selected.barcode || "No Barcode"}
                </span>
                {selected.brand && <span>· {selected.brand}</span>}
              </div>
            </div>

            {/* Quick Action Button */}
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button
                className="h-11 gap-2 px-6 font-bold shadow-md"
                onClick={() => handleAddToCart(selected)}
              >
                <PlusCircle className="h-4 w-4" /> Add to Current Sale
              </Button>
              <Button
                variant="outline"
                className="h-11 px-4 text-xs"
                onClick={() => {
                  setSelected(null);
                  setQuery("");
                }}
              >
                Clear &amp; Scan Next
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Barcode className="h-7 w-7" />
            </div>
            <h3 className="mt-3 text-base font-semibold text-foreground">Ready to Scan</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Scan any item with your barcode reader to instantly show its payable price.
            </p>
          </div>
        )}

        {/* Quick Product List */}
        {!selected && results.length > 0 && (
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
    </div>
  );
}
