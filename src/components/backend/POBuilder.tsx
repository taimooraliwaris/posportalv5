import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Barcode, Search, Plus, Trash2 } from "lucide-react";
import { useBackend } from "@/lib/backend-context";
import { usePos } from "@/lib/pos-context";
import { useScanTarget } from "@/lib/scan-mode-context";
import { formatRs } from "@/lib/pos-data";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function POBuilder({ onBack, editPo }: { onBack: () => void, editPo?: import("@/lib/backend-data").PurchaseOrder | null }) {
  const { suppliers, addPurchaseOrder, updatePurchaseOrder } = useBackend();
  const { productList } = usePos();
  
  const [supplierId, setSupplierId] = useState(editPo?.supplierId ?? (suppliers[0]?.id ?? ""));
  const [query, setQuery] = useState("");
  
  // Array of { product, qty, cost }
  const [lines, setLines] = useState<
    { productId: string; name: string; qty: number; cost: number; price: number }[]
  >(() =>
    (editPo?.lines ?? []).map((l) => {
      const p = productList.find((pr) => pr.id === l.productId);
      return { productId: l.productId, name: p?.name ?? "", qty: l.qty, cost: l.cost, price: p?.price ?? 0 };
    }),
  );

  const selectedSupplier = suppliers.find(s => s.id === supplierId);

  // Barcode scanner support in Purchase Order Builder
  useScanTarget("purchases", ({ code }) => {
    const trimmed = code.trim().toLowerCase();
    const product = productList.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === trimmed) ||
        (p.item_code && p.item_code.toLowerCase() === trimmed) ||
        p.id === code,
    );

    if (product) {
      addLine(product.id);
      toast.success(`Added ${product.name} to PO lines`);
      return "added";
    }

    toast.error(`No product matches barcode ${code}`);
    return "unknown";
  });

  // Strictly filter products to those supplied by the selected supplier
  const availableProducts = useMemo(() => {
    if (!selectedSupplier) return [];
    let list = productList.filter(p => selectedSupplier.productIds.includes(p.id));
    
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        p => p.name.toLowerCase().includes(q) || p.barcode?.includes(q) || p.item_code?.includes(q)
      );
    }
    return list;
  }, [productList, selectedSupplier, query]);

  const addLine = (productId: string) => {
    const p = productList.find(x => x.id === productId);
    if (!p) return;
    
    const existing = lines.find(l => l.productId === productId);
    if (existing) {
      setLines(lines.map(l => l.productId === productId ? { ...l, qty: l.qty + 1 } : l));
    } else {
      setLines([...lines, { productId, name: p.name, qty: 10, cost: p.cost_price || p.price * 0.6, price: p.price }]);
    }
  };

  const updateLine = (productId: string, field: "qty" | "cost", value: number) => {
    setLines(lines.map(l => l.productId === productId ? { ...l, [field]: value } : l));
  };

  const removeLine = (productId: string) => {
    setLines(lines.filter(l => l.productId !== productId));
  };

  const handleSave = (status: "draft" | "ordered") => {
    if (!supplierId) {
      toast.error("Please select a supplier");
      return;
    }
    if (lines.length === 0) {
      toast.error("Please add at least one product to the order");
      return;
    }

    if (editPo) {
      updatePurchaseOrder(editPo.id, {
        supplierId,
        status,
        lines: lines.map(l => ({ productId: l.productId, name: l.name, qty: l.qty, cost: l.cost, price: l.price }))
      });
      toast.success(`Purchase order updated`);
    } else {
      addPurchaseOrder({
        supplierId,
        date: new Date().toISOString().slice(0, 10),
        status,
        lines: lines.map(l => ({ productId: l.productId, name: l.name, qty: l.qty, cost: l.cost, price: l.price }))
      });
      toast.success(`Purchase order ${status === 'draft' ? 'saved as draft' : 'marked as ordered'}`);
    }
    onBack();
  };

  const totalCost = lines.reduce((sum, l) => sum + (l.qty * l.cost), 0);

  return (
    <div className="flex flex-col h-full bg-background -m-4">
      <header className="flex items-center justify-between p-4 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-sm font-semibold">New Purchase Order</h2>
            <p className="text-xs text-muted-foreground">Build an order for your supplier</p>
          </div>
        </div>
        <div className="flex gap-2">
          <select
            value={supplierId}
            onChange={(e) => {
              setSupplierId(e.target.value);
              setLines([]); // Clear lines when changing supplier
            }}
            className="h-9 rounded-md border border-border bg-muted px-3 text-sm font-medium"
          >
            <option value="" disabled>Select supplier...</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <Button variant="secondary" className="h-9" onClick={() => handleSave("draft")}>
            Save Draft
          </Button>
          <Button className="h-9" onClick={() => handleSave("ordered")}>
            Mark Ordered
          </Button>
        </div>
      </header>

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Left pane: Available Products */}
        <div className="w-full md:w-1/2 h-1/2 md:h-full flex flex-col border-b md:border-b-0 md:border-r border-border bg-card">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search supplier's catalog..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="pl-9 h-10 bg-muted/50"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3">
            {!selectedSupplier ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Select a supplier to see their products
              </div>
            ) : availableProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-sm text-muted-foreground">
                <p>No products found for this supplier.</p>
                <p className="mt-1 text-xs">Assign a supplier to products in the Product form.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableProducts.map(p => (
                  <button
                    key={p.id}
                    onClick={() => addLine(p.id)}
                    className="flex flex-col text-left p-3 rounded-lg border border-border bg-background hover:border-primary/50 transition-colors"
                  >
                    <span className="font-medium text-sm line-clamp-2">{p.name}</span>
                    <span className="text-xs text-muted-foreground mt-1 font-mono">{p.item_code || p.barcode}</span>
                    <div className="mt-2 flex justify-between items-center w-full">
                      <span className="text-xs font-medium text-foreground">{formatRs(p.cost_price || p.price * 0.6)}</span>
                      <Plus className="w-3.5 h-3.5 text-primary" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right pane: PO Lines */}
        <div className="w-full md:w-1/2 h-1/2 md:h-full flex flex-col bg-muted/20">
          <div className="p-3 border-b border-border flex justify-between items-center bg-card">
            <h3 className="font-semibold text-sm">Order Lines</h3>
            <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded-full">
              {lines.length} items
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {lines.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Add products from the left to build the order
              </div>
            ) : (
              lines.map(line => (
                <div key={line.productId} className="bg-card rounded-lg border border-border p-3 shadow-sm flex flex-col gap-3">
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-medium text-sm leading-tight">{line.name}</span>
                    <button onClick={() => removeLine(line.productId)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] uppercase text-muted-foreground font-semibold">Qty</label>
                      <Input
                        type="number"
                        value={line.qty || ""}
                        onChange={(e) => updateLine(line.productId, "qty", Number(e.target.value))}
                        className="h-8 text-sm font-mono"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] uppercase text-muted-foreground font-semibold">Unit Cost</label>
                      <Input
                        type="number"
                        value={line.cost || ""}
                        onChange={(e) => updateLine(line.productId, "cost", Number(e.target.value))}
                        className="h-8 text-sm font-mono"
                      />
                    </div>
                    <div className="flex-1 space-y-1 text-right">
                      <label className="text-[10px] uppercase text-muted-foreground font-semibold">Line Total</label>
                      <div className="h-8 flex items-center justify-end font-semibold text-sm">
                        {formatRs(line.qty * line.cost)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="p-4 border-t border-border bg-card">
            <div className="flex justify-between items-center mb-1 text-sm text-muted-foreground">
              <span>Total Items</span>
              <span className="font-mono">{lines.reduce((s, l) => s + l.qty, 0)}</span>
            </div>
            <div className="flex justify-between items-center font-semibold text-lg">
              <span>Order Total</span>
              <span>{formatRs(totalCost)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
