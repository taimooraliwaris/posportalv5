import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BackendLayout } from "@/components/backend/backend-layout";
import { DataCard, DetailDrawer, Field, StatusPill } from "@/components/backend/backend-ui";
import { DataTable, type Column } from "@/components/backend/data-table";
import { useBackend } from "@/lib/backend-context";
import { stockStatus, type StockItem } from "@/lib/backend-data";
import { usePos, resolveProductTaxRate } from "@/lib/pos-context";
import { formatRs, type Product } from "@/lib/pos-data";
import { useScanTarget } from "@/lib/scan-mode-context";
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
  const { productList, categoryList, taxes } = usePos();
  const { stockFor, setProductMeta } = useBackend();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState<Product | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // Scan product barcode to filter/find or inspect
  useScanTarget(
    "inventory",
    ({ code }) => {
      const match = productList.find((p) => p.barcode === code || p.id === code);
      if (match) {
        setSelected(match);
        setQuery(match.barcode || match.name);
        toast.success(`Found ${match.name}`);
        return "info";
      }
      setQuery(code);
      toast.info(`Scanned ${code}`);
      return "info";
    },
    !createOpen,
  );

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
          {categoryList.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={productColumns(stockFor)}
        rows={rows}
        getKey={(p) => p.id}
        onRowClick={setSelected}
        empty="No products found."
      />

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
              <Field
                label="Applicable Tax"
                value={`${resolveProductTaxRate(selected, taxes, productList, categoryList).taxName} (${resolveProductTaxRate(selected, taxes, productList, categoryList).percentage}%)`}
              />
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

function productColumns(
  stockFor: (id: string) => StockItem | undefined,
): Column<Product>[] {
  return [
    { header: "Product", width: "2fr", cell: (p) => <span className="font-medium">{p.name}</span> },
    {
      header: "Barcode",
      cell: (p) => <span className="text-sm text-muted-foreground">{p.barcode || "—"}</span>,
    },
    {
      header: "Category",
      cell: (p) => <span className="text-sm capitalize text-muted-foreground">{p.category}</span>,
    },
    { header: "Price", align: "right", cell: (p) => formatRs(p.price) },
    { header: "On hand", align: "right", cell: (p) => stockFor(p.id)?.onHand ?? 0 },
    {
      header: "Status",
      cell: (p) => {
        const stock = stockFor(p.id);
        return <StatusPill status={stock ? stockStatus(stock) : "out"} />;
      },
    },
  ];
}
