import { useState } from "react";
import { BackendLayout } from "@/components/backend/backend-layout";
import { usePos } from "@/lib/pos-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProductForm } from "@/components/backend/ProductForm";
import { formatRs, type Product } from "@/lib/pos-data";
import { useScanTarget } from "@/lib/scan-mode-context";
import { cn } from "@/lib/utils";
import { Search, Plus, LayoutGrid, List, Barcode, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function ProductsPageShared({ categorySlug }: { categorySlug: string }) {
  const { productList, categoryList, updateProductInCatalog, deleteProductFromCatalog } = usePos();
  const [query, setQuery] = useState("");
  const selectedCategory = categorySlug;
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [initialScannedCode, setInitialScannedCode] = useState<string>("");

  // Barcode scanner support on Products Catalog
  useScanTarget(
    "products",
    ({ code }) => {
      if (isAddOpen) return "ignored";
      const trimmed = code.trim().toLowerCase();
      const match = productList.find(
        (p) =>
          (p.barcode && p.barcode.toLowerCase() === trimmed) ||
          (p.item_code && p.item_code.toLowerCase() === trimmed) ||
          p.id.toLowerCase() === trimmed ||
          p.name.toLowerCase().includes(trimmed),
      );
      if (match) {
        setQuery(match.item_code || match.barcode || match.name);
        toast.success(`Scanned: ${match.name} (Stock: ${match.stock_qty ?? 0})`);
        return "added";
      }
      toast.info(`New barcode scanned. Opening Add Product form.`);
      setInitialScannedCode(trimmed);
      setIsAddOpen(true);
      return "added";
    },
    !isAddOpen,
  );

  // Filter products based on selected category / subcategory
  const visibleProducts = productList.filter((p) => {
    if (query) {
      const lower = query.toLowerCase();
      if (
        !p.name?.toLowerCase().includes(lower) &&
        !p.item_code?.toLowerCase().includes(lower) &&
        !p.name_ur?.includes(query)
      ) {
        return false;
      }
    }

    const selectedCatObj = categoryList.find((c) => c.slug === selectedCategory);
    const resolvedCatId = selectedCatObj ? selectedCatObj.id : selectedCategory;

    // Fallback: category might be ID or Slug.
    if (p.category_id !== resolvedCatId && p.category !== resolvedCatId) return false;

    return true;
  });

  // Grouping logic for the visible products
  const groupedProducts = visibleProducts.reduce(
    (acc, p) => {
      const groupKey = p.specs?.["family"] || p.brand || p.specs?.["model"] || "Uncategorized";
      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(p);
      return acc;
    },
    {} as Record<string, Product[]>,
  );

  return (
    <BackendLayout title="Products">
      <div className="flex h-[calc(100vh-64px)] flex-col -m-4">
        <div className="flex-1 bg-card flex flex-col min-h-0">
          <div className="flex items-center gap-3 p-4 border-b border-border bg-card sticky top-0 z-10">
            <div className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground flex items-center gap-2 transition-colors focus-within:border-primary/50 focus-within:bg-background">
              <Search className="w-4 h-4" />
              <input
                type="text"
                className="bg-transparent border-none outline-none flex-1 text-foreground placeholder:text-muted-foreground"
                placeholder="Search by name, code, or اردو..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-muted rounded-lg p-1 border border-border">
                <button
                  className={cn("p-1.5 rounded-md transition-colors", viewMode === "table" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                  onClick={() => setViewMode("table")}
                  title="Table View"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  className={cn("p-1.5 rounded-md transition-colors", viewMode === "grid" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                  onClick={() => setViewMode("grid")}
                  title="Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
              <Button className="h-10 px-4 rounded-lg shadow-sm" onClick={() => setIsAddOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar">
            {Object.entries(groupedProducts).map(([group, items]) => (
              <div key={group} className="mb-4">
                <div className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-foreground border-y border-border bg-muted/40 shadow-sm sticky top-0 z-10">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  {group}
                  <span className="text-xs bg-muted border border-border text-muted-foreground px-2 py-0.5 rounded-full ml-2 font-medium">
                    {items.length} items
                  </span>
                </div>

                {viewMode === "table" ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-muted/10 text-xs text-muted-foreground uppercase tracking-wider border-b border-border">
                          <th className="px-4 py-3 font-semibold w-[120px]">Item Code</th>
                          <th className="px-4 py-3 font-semibold">Name</th>
                          <th className="px-4 py-3 font-semibold">Specs</th>
                          <th className="px-4 py-3 font-semibold text-right">Sale Price</th>
                          <th className="px-4 py-3 font-semibold text-right w-[100px]">Stock</th>
                          <th className="px-4 py-3 font-semibold text-right w-[100px]">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {items.map((p) => (
                          <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 align-top">
                              <span className="font-mono text-xs text-muted-foreground bg-secondary/40 px-2 py-1 rounded">
                                {p.item_code || "N/A"}
                              </span>
                            </td>
                            <td className="px-4 py-3 align-top">
                              <div className="font-medium text-sm text-foreground">{p.name}</div>
                              {p.name_ur && (
                                <div className="text-xs text-muted-foreground mt-0.5 font-urdu" dir="rtl">
                                  {p.name_ur}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 align-top text-xs text-muted-foreground">
                              {selectedCategory === "spare_parts" ? (
                                <div className="flex flex-wrap gap-1">
                                  {p.specs?.["model"] && <span className="bg-accent/10 border border-accent/20 text-accent px-1.5 py-0.5 rounded">{p.specs["model"]}</span>}
                                  {p.specs?.["position"] && <span className="bg-primary/10 border border-primary/20 text-primary px-1.5 py-0.5 rounded">{p.specs["position"]}</span>}
                                  {p.specs?.["variant"] && <span className="bg-muted border border-border text-foreground px-1.5 py-0.5 rounded">{p.specs["variant"]}</span>}
                                </div>
                              ) : (
                                <div className="flex flex-col gap-0.5">
                                  <div className="font-medium text-foreground">{p.specs?.["size"] || p.name}</div>
                                  <div>{p.brand} {p.specs?.["ply"] ? `• ${p.specs["ply"]}` : ''} {p.specs?.["tread"] ? `• ${p.specs["tread"]}` : ''}</div>
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 align-top text-right font-mono text-sm font-medium">
                              {formatRs(p.price)}
                            </td>
                            <td className="px-4 py-3 align-top text-right">
                              <input
                                className={cn(
                                  "bg-accent/10 border border-accent/20 outline-none font-mono font-medium rounded-md w-16 px-2 py-1 text-right text-sm focus:ring-2 focus:ring-primary/50 transition-all",
                                  p.stock_qty <= 0 ? "text-destructive border-destructive/30 bg-destructive/5" : "text-success border-success/30 bg-success/5"
                                )}
                                value={p.stock_qty}
                                onChange={(e) => updateProductInCatalog(p.id, { stock_qty: Number(e.target.value) || 0 })}
                              />
                            </td>
                            <td className="px-4 py-3 align-top text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => { setEditProductId(p.id); setIsAddOpen(true); }}>
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => { if(confirm("Are you sure you want to delete this product?")) deleteProductFromCatalog(p.id); }}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
                    {items.map((p) => (
                      <div key={p.id} className="flex flex-col bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex gap-2 items-center">
                            <span className="font-mono text-xs text-muted-foreground bg-secondary/40 px-2 py-1 rounded">
                              {p.item_code || "N/A"}
                            </span>
                            <div className="flex gap-1">
                              <button onClick={() => { setEditProductId(p.id); setIsAddOpen(true); }} className="text-muted-foreground hover:text-foreground">
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => { if(confirm("Are you sure you want to delete this product?")) deleteProductFromCatalog(p.id); }} className="text-destructive hover:text-destructive/80">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <span className={cn("text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full", p.stock_qty <= 0 ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success")}>
                            {p.stock_qty > 0 ? "In Stock" : "Out"}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-foreground mb-1 leading-snug">{p.name}</h4>
                          {p.name_ur && (
                            <p className="text-xs text-muted-foreground font-urdu dir-rtl mb-2">{p.name_ur}</p>
                          )}
                          <div className="text-xs text-muted-foreground mt-2 space-y-1">
                            {p.brand && <div>Brand: {p.brand}</div>}
                            {p.specs?.["model"] && <div>Model: {p.specs["model"]}</div>}
                            {p.specs?.["size"] && <div>Size: {p.specs["size"]}</div>}
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                          <span className="font-mono text-lg font-bold">{formatRs(p.price)}</span>
                          <input
                            className={cn(
                              "bg-accent/10 border border-accent/20 outline-none font-mono font-medium rounded-md w-14 px-1 py-1 text-center text-sm focus:ring-2 focus:ring-primary/50 transition-all",
                              p.stock_qty <= 0 ? "text-destructive border-destructive/30 bg-destructive/5" : "text-success border-success/30 bg-success/5"
                            )}
                            value={p.stock_qty}
                            onChange={(e) => updateProductInCatalog(p.id, { stock_qty: Number(e.target.value) || 0 })}
                            title="Stock Quantity"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {visibleProducts.length === 0 && (
              <div className="p-12 text-center flex flex-col items-center justify-center border-t border-border">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Search className="w-6 h-6 text-muted-foreground opacity-50" />
                </div>
                <h3 className="font-semibold text-lg mb-1">No products found</h3>
                <p className="text-muted-foreground text-sm">
                  We couldn't find any items matching your search or category filter.
                </p>
                <Button variant="outline" className="mt-6" onClick={() => setIsAddOpen(true)}>
                  Add a new product
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isAddOpen} onOpenChange={(open) => {
        setIsAddOpen(open);
        if (!open) { setInitialScannedCode(""); setEditProductId(null); }
      }}>
        <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-background border-border">
          <DialogHeader className="px-6 py-4 border-b border-border bg-card">
            <DialogTitle className="text-lg">Add New Product</DialogTitle>
          </DialogHeader>
          <div className="max-h-[80vh] overflow-y-auto custom-scrollbar">
            <ProductForm 
              onSaved={() => { setIsAddOpen(false); setEditProductId(null); }} 
              onClose={() => { setIsAddOpen(false); setEditProductId(null); }}
              initialBarcode={initialScannedCode} 
              editProductId={editProductId || undefined}
            />
          </div>
        </DialogContent>
      </Dialog>
    </BackendLayout>
  );
}
