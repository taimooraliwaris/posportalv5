import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BackendLayout } from "@/components/backend/backend-layout";
import { DataCard, MoneyKeypadField, StatCard, StatusPill } from "@/components/backend/backend-ui";
import { DataTable, type Column } from "@/components/backend/data-table";
import { useBackend } from "@/lib/backend-context";
import { stockAdjustReasons, stockStatus, type StockItem } from "@/lib/backend-data";
import { usePos } from "@/lib/pos-context";
import { formatRs } from "@/lib/pos-data";
import { useHardwareScanner } from "@/lib/use-hardware-scanner";
import { toast } from "sonner";

export const Route = createFileRoute("/backend/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory — Velora back office" },
      {
        name: "description",
        content: "Track stock levels, adjustments, transfers and inventory valuation.",
      },
      { property: "og:title", content: "Inventory — Velora back office" },
      {
        property: "og:description",
        content: "Track stock levels, adjustments, transfers and inventory valuation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InventoryPage,
});

function InventoryPage() {
  const { stock, adjustStock } = useBackend();
  const { productList } = usePos();
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [reason, setReason] = useState(stockAdjustReasons[0]);

  const nameFor = (id: string) => productList.find((p) => p.id === id)?.name ?? id;
  const priceFor = (id: string) => productList.find((p) => p.id === id)?.price ?? 0;
  const openAdjust = (productId: string) => {
    setAdjusting(productId);
    setValue(String(stock.find((s) => s.productId === productId)?.onHand ?? 0));
  };

  const saveAdjustment = () => {
    if (!adjusting) return;
    adjustStock(adjusting, Number(value) || 0, reason);
    setAdjusting(null);
    toast.success("Stock adjusted");
  };

  // Focus-free restocking: scan a product anywhere on the page to count it in.
  useHardwareScanner((code) => {
    const product = productList.find((p) => p.barcode === code);
    if (!product) return toast.error(`No product matches barcode ${code}`);
    openAdjust(product.id);
  }, !adjusting);

  const atCost = stock.reduce((sum, s) => sum + s.onHand * s.cost, 0);
  const atRetail = stock.reduce((sum, s) => sum + s.onHand * priceFor(s.productId), 0);

  return (
    <BackendLayout title="Inventory">
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard label="Stock value at cost" value={formatRs(atCost)} />
        <StatCard label="Stock value at retail" value={formatRs(atRetail)} />
        <StatCard label="Potential margin" value={formatRs(atRetail - atCost)} />
      </div>

      <p className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-success" />
        Scanner ready — scan any product barcode to open its stock count.
      </p>

      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock">Stock on hand</TabsTrigger>
          <TabsTrigger value="transfer">Stock transfer</TabsTrigger>
        </TabsList>
        <TabsContent value="stock">
          <DataTable
            columns={stockColumns(nameFor, (item) => openAdjust(item.productId))}
            rows={stock}
            getKey={(s) => s.productId}
          />
        </TabsContent>
        <TabsContent value="transfer">
          <DataCard className="space-y-3 p-4 text-sm">
            <p className="font-medium">Stock transfer</p>
            <p className="text-muted-foreground">
              Move stock between locations. Velora Mart currently trades from a single shop floor,
              so transfers are recorded for future multi-store use.
            </p>
            <div className="grid gap-2 sm:grid-cols-4">
              <div className="rounded-md border border-border p-3">From: Shop floor</div>
              <div className="rounded-md border border-border p-3">To: Back store</div>
              <div className="rounded-md border border-border p-3">Product: Pedal Bin</div>
              <div className="rounded-md border border-border p-3">Quantity: 4</div>
            </div>
            <Button className="h-11" onClick={() => toast.success("Transfer drafted")}>
              Draft transfer
            </Button>
          </DataCard>
        </TabsContent>
      </Tabs>

      <Dialog open={!!adjusting} onOpenChange={() => setAdjusting(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adjust stock</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Current quantity: {stock.find((s) => s.productId === adjusting)?.onHand ?? 0}
          </p>
          <MoneyKeypadField
            label="New counted quantity"
            value={value}
            onChange={setValue}
            maxDecimals={0}
            onEnter={saveAdjustment}
          />
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as typeof reason)}
            aria-label="Adjustment reason"
            className="h-11 rounded-md border border-border bg-card px-3 text-sm"
          >
            {stockAdjustReasons.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <Button className="h-11" onClick={saveAdjustment}>
            Save adjustment
          </Button>
        </DialogContent>
      </Dialog>
    </BackendLayout>
  );
}

function stockColumns(
  nameFor: (id: string) => string,
  onAdjust: (item: StockItem) => void,
): Column<StockItem>[] {
  return [
    {
      header: "Product",
      width: "2fr",
      cell: (s) => <span className="font-medium">{nameFor(s.productId)}</span>,
    },
    { header: "On hand", align: "right", cell: (s) => s.onHand },
    { header: "Reserved", align: "right", cell: (s) => s.reserved },
    { header: "Available", align: "right", cell: (s) => s.onHand - s.reserved },
    { header: "Reorder point", align: "right", cell: (s) => s.reorderPoint },
    {
      header: "Status",
      width: "1.4fr",
      cell: (s) => (
        <span className="flex items-center justify-end gap-2">
          <StatusPill status={stockStatus(s)} />
          <Button variant="secondary" className="h-9" onClick={() => onAdjust(s)}>
            Adjust
          </Button>
        </span>
      ),
    },
  ];
}
