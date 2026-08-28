// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Barcode, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductIcon } from "@/components/pos/ProductTile";
import { usePos } from "@/lib/pos-context";
import { useScanTarget } from "@/lib/scan-mode-context";
import { toast } from "sonner";
import { formatRs, toneClass, type Product } from "@/lib/pos-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/price-check")({
  head: () => ({
    meta: [
      { title: "Price check — Velora POS" },
      {
        name: "description",
        content: "Scan or search any product to check its shelf price, tax and stock.",
      },
      { property: "og:title", content: "Price check — Velora POS" },
      {
        property: "og:description",
        content: "Scan or search any product to check its shelf price, tax and stock.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PriceCheck,
});

function PriceCheck() {
  const { productList, categoryList } = usePos();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return productList.slice(0, 12);
    return productList.filter((p) => p.name?.toLowerCase().includes(q) || p.barcode.includes(q));
  }, [productList, query]);

  // Focus-free: a scanner burst is picked up anywhere on this screen.
  useScanTarget("price-check", ({ code }) => {
    const match = productList.find((p) => p.barcode === code);
    if (match) {
      setSelected(match);
      setQuery(match.barcode);
      return "info";
    }
    setQuery(code);
    setSelected(null);
    toast.error(`No product matches barcode ${code}`);
    return "unknown";
  });

  const categoryName = selected
    ? (categoryList.find((c) => c.id === selected.category)?.name ?? "Uncategorised")
    : "";


  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border bg-card px-3 py-2">
        <Button variant="secondary" className="h-11 gap-2" asChild>
          <Link to="/till">
            <ArrowLeft className="h-4 w-4" /> Back to register
          </Link>
        </Button>
        <h1 className="text-base font-semibold">Price check</h1>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 p-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Scan barcode or search product name..."
              className="h-12 pl-9"
            />
          </div>
          <Button
            variant="secondary"
            size="icon"
            className="h-12 w-12"
            onClick={() => {
              const random = productList[Math.floor(Math.random() * productList.length)];
              if (random) {
                setSelected(random);
                setQuery(random.barcode);
              }
            }}
            aria-label="Scan barcode"
          >
            <Barcode className="h-5 w-5" />
          </Button>
        </div>

        <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-success" />
          Scanner ready — just scan, no need to click the search box.
        </p>

        {selected && (
          <section className="mt-4 overflow-hidden rounded-md border border-border bg-card">
            <div className={cn("flex items-center justify-center py-8", toneClass[selected.tone])}>
              <ProductIcon name={selected.icon} className="h-16 w-16 opacity-80" />
            </div>
            <div className="space-y-1 p-4">
              <p className="text-lg font-semibold">{selected.name}</p>
              <p className="text-sm text-muted-foreground">
                {categoryName} · {selected.barcode}
              </p>
              <div className="mt-3 space-y-1 rounded-md bg-muted p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shelf price</span>
                  <span className="font-medium">{formatRs(selected.price)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={cn("p-1.5 rounded-sm", toneClass[selected.tone || "sky"])}>
                    <ProductIcon name={selected.icon} className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium">{categoryName || "Uncategorised"}</span>
                </div>
                <div className="flex justify-between text-base font-semibold">
                  <span>Price</span>
                  <span>{formatRs(selected.price)}</span>
                </div>
              </div>
            </div>
          </section>
        )}

        <ul className="mt-4 divide-y divide-border overflow-hidden rounded-md border border-border bg-card">
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setSelected(p)}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted",
                  selected?.id === p.id && "bg-accent",
                )}
              >
                <span
                  className={cn(
                    "grid h-10 w-10 shrink-0 place-items-center rounded-md",
                    toneClass[p.tone],
                  )}
                >
                  <ProductIcon name={p.icon} className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{p.name}</span>
                  <span className="block text-xs text-muted-foreground">{p.barcode}</span>
                </span>
                <span className="text-sm font-semibold">{formatRs(p.price)}</span>
              </button>
            </li>
          ))}
          {results.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              No product matches that search.
            </li>
          )}
        </ul>
      </main>
    </div>
  );
}
