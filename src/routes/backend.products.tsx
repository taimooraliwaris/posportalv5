import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BackendLayout } from "@/components/backend/backend-layout";
import { DataCard, DetailDrawer, Field, StatusPill } from "@/components/backend/backend-ui";
import { useBackend } from "@/lib/backend-context";
import { stockStatus } from "@/lib/backend-data";
import { usePos } from "@/lib/pos-context";
import { categories, formatRs, type Product } from "@/lib/pos-data";
import { NewProductModal } from "@/components/pos/MenuModals";
import { toast } from "sonner";

export const Route = createFileRoute("/backend/products")({
  head: () => ({
    meta: [
      { title: "Products — Velora back office" },
      {
        name: "description",
        content: "Manage the catalogue, pricing, stock and printable product labels.",
      },
      { property: "og:title", content: "Products — Velora back office" },
      {
        property: "og:description",
        content: "Manage the catalogue, pricing, stock and printable product labels.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const { productList } = usePos();
  const { stockFor, setProductMeta } = useBackend();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState<Product | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const rows = productList.filter((p) => {
    const matchesQuery =
      !query.trim() ||
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.barcode.includes(query);
    const matchesCategory = category === "all" || p.category === category;
    return matchesQuery && matchesCategory;
  });

  const selectedStock = selected ? stockFor(selected.id) : undefined;
  const sku = selected ? `VLR-${selected.id.toUpperCase()}` : "";

  return (
    <BackendLayout
      title="Products"
      actions={
        <Button className="h-11" onClick={() => setCreateOpen(true)}>
          New product
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products or barcodes"
          className="h-11 max-w-sm"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filter by category"
          className="h-11 rounded-md border border-border bg-card px-3 text-sm"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <DataCard>
        <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-3 border-b border-border px-4 py-2 text-sm font-medium text-muted-foreground md:grid">
          <span>Product</span>
          <span>Barcode</span>
          <span>Category</span>
          <span>Price</span>
          <span>On hand</span>
          <span>Status</span>
        </div>
        {rows.map((p) => {
          const stock = stockFor(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(p)}
              className="grid w-full grid-cols-1 items-center gap-3 border-b border-border px-4 py-3 text-left last:border-0 hover:bg-muted md:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]"
            >
              <span className="font-medium">{p.name}</span>
              <span className="text-sm text-muted-foreground">{p.barcode || "—"}</span>
              <span className="text-sm capitalize text-muted-foreground">{p.category}</span>
              <span>{formatRs(p.price)}</span>
              <span>{stock?.onHand ?? 0}</span>
              <StatusPill status={stock ? stockStatus(stock) : "out"} />
            </button>
          );
        })}
        {rows.length === 0 && (
          <p className="p-8 text-center text-sm text-muted-foreground">No products found.</p>
        )}
      </DataCard>

      <DetailDrawer
        open={!!selected}
        onOpenChange={() => setSelected(null)}
        title={selected?.name ?? ""}
        description="Product details, label printing and stock history."
      >
        {selected && (
          <>
            <DataCard className="space-y-2 p-4">
              <Field label="Barcode" value={selected.barcode || "Not assigned"} />
              <Field label="Sales price" value={formatRs(selected.price)} />
              <Field label="Cost price" value={formatRs(selectedStock?.cost ?? 0)} />
              <Field label="Reorder point" value={selectedStock?.reorderPoint ?? 0} />
              <Field label="Description" value={selectedStock?.description ?? "—"} />
            </DataCard>

            <DataCard className="space-y-3 p-4 text-center">
              <p className="text-sm font-medium">Store label</p>
              <div className="mx-auto w-fit rounded-md border border-border bg-card p-3">
                <QRCodeCanvas value={selected.barcode || sku} size={112} includeMargin />
                <p className="mt-2 text-sm font-medium">{selected.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatRs(selected.price)} · {selected.barcode || sku}
                </p>
              </div>
              {!selected.barcode && (
                <Button
                  variant="secondary"
                  className="h-11"
                  onClick={() => {
                    setProductMeta(selected.id, { sku });
                    toast.success(`Code ${sku} generated`);
                  }}
                >
                  Generate code
                </Button>
              )}
              <Button className="h-11" onClick={() => toast.success("Label sent to printer")}>
                <Printer className="h-4 w-4" /> Print label
              </Button>
            </DataCard>

            <DataCard className="p-4">
              <p className="mb-2 text-sm font-medium">Stock history</p>
              <div className="flex h-16 items-end gap-1">
                {(selectedStock?.history ?? []).map((h, i) => (
                  <span
                    key={i}
                    className="flex-1 rounded-sm bg-primary"
                    style={{ height: `${Math.max(6, h * 2)}px` }}
                  />
                ))}
              </div>
            </DataCard>
          </>
        )}
      </DetailDrawer>

      <NewProductModal open={createOpen} onOpenChange={setCreateOpen} />
    </BackendLayout>
  );
}
