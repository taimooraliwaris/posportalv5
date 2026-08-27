import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { BackendLayout } from "@/components/backend/backend-layout";
import { StatCard } from "@/components/backend/backend-ui";
import { usePos } from "@/lib/pos-context";
import { formatRs } from "@/lib/pos-data";
import { toast } from "sonner";
import { Search, Plus, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/backend/inventory")({
  component: InventoryPage,
});

function InventoryPage() {
  const { productList, updateProductInCatalog } = usePos();
  const [query, setQuery] = useState("");
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [adjustValue, setAdjustValue] = useState("");
  const [adjustReason, setAdjustReason] = useState("count");

  const visibleProducts = useMemo(() => {
    return productList
      .filter((p) => {
        if (!query) return true;
        return (
          p.name?.toLowerCase().includes(query.toLowerCase()) ||
          p.item_code?.toLowerCase().includes(query.toLowerCase()) ||
          p.name_ur?.includes(query)
        );
      })
      .sort((a, b) => a.stock_qty - b.stock_qty); // Show lowest stock first
  }, [productList, query]);

  // KPIs
  const totalItems = productList.length;
  const outOfStock = productList.filter((p) => p.stock_qty <= 0).length;
  const lowStock = productList.filter((p) => p.stock_qty > 0 && p.stock_qty <= 5).length; // assuming <= 5 is low stock threshold for now

  const openAdjust = (productId: string) => {
    setAdjustingId(productId);
    setAdjustValue(String(productList.find((p) => p.id === productId)?.stock_qty ?? 0));
    setAdjustReason("count");
  };

  const saveAdjustment = () => {
    if (!adjustingId) return;
    const qty = Number(adjustValue);
    if (isNaN(qty) || qty < 0) {
      toast.error("Invalid stock quantity");
      return;
    }

    updateProductInCatalog(adjustingId, { stock_qty: qty });
    toast.success("Stock adjusted successfully");
    setAdjustingId(null);
  };

  return (
    <BackendLayout title="Inventory">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-[15px] font-medium text-foreground">Inventory Levels</h2>
          <p className="text-[11px] text-muted-foreground">Monitor and adjust stock quantities</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="default" className="h-9 px-4 text-xs gap-2">
            <Plus className="w-3.5 h-3.5" />
            Bulk Adjustment
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Total Catalog Items"
          value={String(totalItems)}
          hint="+12 this month"
        />
        <div className="rounded-xl border border-warning/50 bg-warning/5 [&>div]:border-none [&>div]:bg-transparent">
          <StatCard
            label="Low Stock Warnings"
            value={String(lowStock)}
            hint="Needs reorder"
          />
        </div>
        <div className="rounded-xl border border-destructive/50 bg-destructive/5 [&>div]:border-none [&>div]:bg-transparent">
          <StatCard
            label="Out of Stock"
            value={String(outOfStock)}
            hint="Critical"
          />
        </div>
      </div>

      <div className="flex flex-col border border-border rounded-xl overflow-hidden bg-card">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <div className="flex-1 bg-muted/50 border border-border rounded-md px-2 py-1.5 text-[11px] text-muted-foreground flex items-center gap-2">
            <Search className="w-3.5 h-3.5" />
            <input
              type="text"
              className="bg-transparent border-none outline-none flex-1 text-foreground placeholder:text-muted-foreground"
              placeholder="Search by name, SKU, or اردو..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30">
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Product
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  SKU / Code
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">
                  Unit Price
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
                  Status
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">
                  In Stock
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibleProducts.map((p) => {
                const isOutOfStock = p.stock_qty <= 0;
                const isLowStock = p.stock_qty > 0 && p.stock_qty <= 5;

                return (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm text-foreground">{p.name}</div>
                      {p.name_ur && (
                        <div className="text-[11px] text-muted-foreground font-urdu" dir="rtl">
                          {p.name_ur}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-[11px] text-muted-foreground bg-secondary/50 px-2 py-1 rounded inline-block">
                        {p.item_code || "N/A"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-sm font-medium">{formatRs(p.price)}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium tracking-wide",
                          isOutOfStock
                            ? "bg-destructive/10 text-destructive border border-destructive/20"
                            : isLowStock
                              ? "bg-warning/10 text-warning-foreground border border-warning/20"
                              : "bg-success/10 text-success border border-success/20",
                        )}
                      >
                        {isOutOfStock ? (
                          <XCircle className="w-3 h-3" />
                        ) : isLowStock ? (
                          <AlertCircle className="w-3 h-3" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                        {isOutOfStock ? "Out of Stock" : isLowStock ? "Low Stock" : "In Stock"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-sm">{p.stock_qty}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => openAdjust(p.id)}
                      >
                        Adjust
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {visibleProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    No products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!adjustingId} onOpenChange={(open) => !open && setAdjustingId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <p className="text-sm font-medium mb-1">
                {productList.find((p) => p.id === adjustingId)?.name}
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                {productList.find((p) => p.id === adjustingId)?.item_code}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] text-muted-foreground">New Quantity</label>
              <Input
                type="number"
                value={adjustValue}
                onChange={(e) => setAdjustValue(e.target.value)}
                className="font-mono text-lg"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] text-muted-foreground">Reason</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
              >
                <option value="count">Inventory Count</option>
                <option value="damage">Damage / Loss</option>
                <option value="received">Stock Received</option>
                <option value="return">Customer Return</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAdjustingId(null)}>
              Cancel
            </Button>
            <Button onClick={saveAdjustment}>Save Adjustment</Button>
          </div>
        </DialogContent>
      </Dialog>
    </BackendLayout>
  );
}
