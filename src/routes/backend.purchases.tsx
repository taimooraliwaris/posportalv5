import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BackendLayout } from "@/components/backend/backend-layout";
import { ConfirmAction, DataCard, StatusPill } from "@/components/backend/backend-ui";
import { useBackend } from "@/lib/backend-context";
import { formatDate } from "@/lib/backend-data";
import { usePos } from "@/lib/pos-context";
import { formatRs } from "@/lib/pos-data";
import { toast } from "sonner";

export const Route = createFileRoute("/backend/purchases")({
  head: () => ({
    meta: [
      { title: "Purchases — Velora back office" },
      {
        name: "description",
        content: "Suppliers and purchase orders that feed stock back into inventory.",
      },
      { property: "og:title", content: "Purchases — Velora back office" },
      {
        property: "og:description",
        content: "Suppliers and purchase orders that feed stock back into inventory.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PurchasesPage,
});

function PurchasesPage() {
  const { suppliers, purchaseOrders, setPurchaseOrderStatus, addPurchaseOrder } = useBackend();
  const { productList } = usePos();
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");

  const totalFor = (lines: { qty: number; cost: number }[]) =>
    lines.reduce((sum, l) => sum + l.qty * l.cost, 0);

  return (
    <BackendLayout title="Purchases">
      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">Purchase orders</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              aria-label="Supplier for new purchase order"
              className="h-11 rounded-md border border-border bg-card px-3 text-sm"
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <Button
              className="h-11"
              onClick={() => {
                const product = productList[0]!;
                addPurchaseOrder({
                  supplierId,
                  date: new Date().toISOString().slice(0, 10),
                  status: "draft",
                  lines: [{ productId: product.id, qty: 10, cost: product.price * 0.6 }],
                });
                toast.success("Draft purchase order created");
              }}
            >
              New purchase order
            </Button>
          </div>

          <DataCard>
            <div className="hidden grid-cols-[1fr_1.5fr_1fr_1fr_1fr_auto] gap-3 border-b border-border px-4 py-2 text-sm font-medium text-muted-foreground md:grid">
              <span>PO</span>
              <span>Supplier</span>
              <span>Date</span>
              <span>Total</span>
              <span>Status</span>
              <span>Action</span>
            </div>
            {purchaseOrders.map((po) => (
              <div
                key={po.id}
                className="grid grid-cols-1 items-center gap-3 border-b border-border px-4 py-3 last:border-0 md:grid-cols-[1fr_1.5fr_1fr_1fr_1fr_auto]"
              >
                <span className="font-medium">{po.number}</span>
                <span>{suppliers.find((s) => s.id === po.supplierId)?.name}</span>
                <span className="text-sm text-muted-foreground">{formatDate(po.date)}</span>
                <span>{formatRs(totalFor(po.lines))}</span>
                <StatusPill status={po.status} />
                <span className="flex gap-2">
                  {po.status === "draft" && (
                    <Button
                      variant="secondary"
                      className="h-9"
                      onClick={() => setPurchaseOrderStatus(po.id, "ordered")}
                    >
                      Mark ordered
                    </Button>
                  )}
                  {po.status === "ordered" && (
                    <Button
                      className="h-9"
                      onClick={() => {
                        setPurchaseOrderStatus(po.id, "received");
                        toast.success("Stock received into inventory");
                      }}
                    >
                      Receive
                    </Button>
                  )}
                  {po.status !== "cancelled" && po.status !== "received" && (
                    <ConfirmAction
                      trigger={
                        <Button variant="ghost" className="h-9 text-destructive">
                          Cancel
                        </Button>
                      }
                      title="Cancel purchase order?"
                      body={`${po.number} will be marked cancelled.`}
                      confirmLabel="Cancel PO"
                      onConfirm={() => setPurchaseOrderStatus(po.id, "cancelled")}
                    />
                  )}
                </span>
              </div>
            ))}
          </DataCard>
        </TabsContent>

        <TabsContent value="suppliers">
          <DataCard>
            <div className="hidden grid-cols-[1.5fr_1fr_1fr_1fr_1fr] gap-3 border-b border-border px-4 py-2 text-sm font-medium text-muted-foreground md:grid">
              <span>Supplier</span>
              <span>Contact</span>
              <span>Phone</span>
              <span>Products</span>
              <span>Open balance</span>
            </div>
            {suppliers.map((s) => (
              <div
                key={s.id}
                className="grid grid-cols-1 items-center gap-3 border-b border-border px-4 py-3 last:border-0 md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]"
              >
                <span className="font-medium">{s.name}</span>
                <span className="text-sm">{s.contact}</span>
                <span className="text-sm text-muted-foreground">{s.phone}</span>
                <span>{s.productIds.length}</span>
                <span>{formatRs(s.openBalance)}</span>
              </div>
            ))}
          </DataCard>
        </TabsContent>
      </Tabs>
    </BackendLayout>
  );
}
