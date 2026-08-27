import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BackendLayout } from "@/components/backend/backend-layout";
import { ConfirmAction, StatusPill } from "@/components/backend/backend-ui";
import { DataTable, type Column } from "@/components/backend/data-table";
import { AddSupplierModal } from "@/components/backend/SupplierModal";
import { useBackend } from "@/lib/backend-context";
import { formatDate, type PurchaseOrder, type Supplier } from "@/lib/backend-data";
import { usePos } from "@/lib/pos-context";
import { useScanTarget } from "@/lib/scan-mode-context";
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
  const [supplierOpen, setSupplierOpen] = useState(false);

  // Scan product barcode to quickly create draft purchase order
  useScanTarget("purchases", ({ code }) => {
    const product = productList.find((p) => p.barcode === code || p.id === code);
    if (product) {
      addPurchaseOrder({
        supplierId: supplierId || suppliers[0]?.id || "",
        date: new Date().toISOString().slice(0, 10),
        status: "draft",
        lines: [
          {
            productId: product.id,
            qty: 10,
            cost: Math.round(product.price * 0.6 * 100) / 100,
          },
        ],
      });
      toast.success(`Draft PO created for ${product.name} (scanned ${code})`);
      return "added";
    }
    toast.error(`No product found for barcode ${code}`);
    return "unknown";
  });

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

          <DataTable
            columns={orderColumns(suppliers, setPurchaseOrderStatus)}
            rows={purchaseOrders}
            getKey={(po) => po.id}
            empty="No purchase orders yet."
          />
        </TabsContent>

        <TabsContent value="suppliers">
          <div className="mb-3">
            <Button className="h-11" onClick={() => setSupplierOpen(true)}>
              Add supplier
            </Button>
          </div>
          <DataTable
            columns={supplierColumns}
            rows={suppliers}
            getKey={(s) => s.id}
            empty="No suppliers yet."
          />
        </TabsContent>
      </Tabs>

      <AddSupplierModal open={supplierOpen} onOpenChange={setSupplierOpen} />
    </BackendLayout>
  );
}

const supplierColumns: Column<Supplier>[] = [
  {
    header: "Supplier",
    width: "1.5fr",
    cell: (s) => <span className="font-medium">{s.name}</span>,
  },
  { header: "Contact", cell: (s) => <span className="text-sm">{s.contact}</span> },
  { header: "Phone", cell: (s) => <span className="text-sm text-muted-foreground">{s.phone}</span> },
  { header: "Products", align: "right", cell: (s) => s.productIds.length },
  { header: "Open balance", align: "right", cell: (s) => formatRs(s.openBalance) },
];

function orderColumns(
  suppliers: Supplier[],
  setStatus: (id: string, status: PurchaseOrder["status"]) => void,
): Column<PurchaseOrder>[] {
  const total = (lines: { qty: number; cost: number }[]) =>
    lines.reduce((sum, l) => sum + l.qty * l.cost, 0);
  return [
    { header: "PO", cell: (po) => <span className="font-medium">{po.number}</span> },
    {
      header: "Supplier",
      width: "1.5fr",
      cell: (po) => suppliers.find((s) => s.id === po.supplierId)?.name ?? "—",
    },
    {
      header: "Date",
      cell: (po) => <span className="text-sm text-muted-foreground">{formatDate(po.date)}</span>,
    },
    { header: "Total", align: "right", cell: (po) => formatRs(total(po.lines)) },
    { header: "Status", cell: (po) => <StatusPill status={po.status} /> },
    {
      header: "Action",
      width: "1.6fr",
      cell: (po) => (
        <span className="flex justify-end gap-2">
          {po.status === "draft" && (
            <Button
              variant="secondary"
              className="h-9"
              onClick={() => setStatus(po.id, "ordered")}
            >
              Mark ordered
            </Button>
          )}
          {po.status === "ordered" && (
            <Button
              className="h-9"
              onClick={() => {
                setStatus(po.id, "received");
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
              onConfirm={() => setStatus(po.id, "cancelled")}
            />
          )}
        </span>
      ),
    },
  ];
}
