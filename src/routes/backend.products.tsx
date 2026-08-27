import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BackendLayout } from "@/components/backend/backend-layout";
import { usePos } from "@/lib/pos-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProductForm } from "@/components/backend/ProductForm";
import { formatRs, type Product } from "@/lib/pos-data";
import { cn } from "@/lib/utils";
import { Search, Tool, Circle, Droplet } from "lucide-react";

export const Route = createFileRoute("/backend/products")({
  component: ProductsPage,
});

function ProductsPage() {
  const { productList, categoryList, updateProductInCatalog } = usePos();
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("spare_parts");
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);
  
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Filter products based on selected category / subcategory
  const visibleProducts = productList.filter((p) => {
    if (query) {
      return (
        p.name.toLowerCase().includes(query.toLowerCase()) || 
        p.barcode?.toLowerCase().includes(query.toLowerCase()) ||
        p.name_ur?.includes(query)
      );
    }
    
    if (p.category_id !== selectedCategory && p.category !== selectedCategory) return false;
    
    if (selectedFamily) {
      if (selectedCategory === "spare_parts") return p.specs?.family === selectedFamily;
      if (selectedCategory === "tyres" || selectedCategory === "tubes") {
        return p.specs?.size === selectedFamily || p.specs?.position === selectedFamily || p.primary_model_code === selectedFamily;
      }
    }
    
    return true;
  });

  // Grouping logic for the visible products
  const groupedProducts = visibleProducts.reduce((acc, p) => {
    const groupKey = p.specs?.family || p.primary_model_code || p.brand || "Uncategorized";
    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(p);
    return acc;
  }, {} as Record<string, Product[]>);

  // Deriving navigation sidebar groups
  const sparePartsCount = productList.filter(p => p.category === "spare_parts").length;
  const tyresCount = productList.filter(p => p.category === "tyres").length;
  const tubesCount = productList.filter(p => p.category === "tubes").length;

  const spareFamilies = Array.from(new Set(productList.filter(p => p.category === "spare_parts" && p.specs?.family).map(p => p.specs.family)));
  const tyreVehicles = Array.from(new Set(productList.filter(p => p.category === "tyres" && p.primary_model_code).map(p => p.primary_model_code)));

  return (
    <BackendLayout title="Products">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-[15px] font-medium text-foreground">Products</h2>
          <p className="text-[11px] text-muted-foreground">Auto Zone inventory</p>
        </div>
        <div className="flex gap-2 items-center">
          <Button onClick={() => setIsAddOpen(true)} className="h-8 px-4 text-xs">+ Add product</Button>
        </div>
      </div>

      <div className="flex gap-0 border border-border rounded-xl overflow-hidden bg-card min-h-[600px]">
        {/* Sidebar */}
        <div className="w-[180px] shrink-0 border-r border-border py-3 bg-muted/30">
          <div className="text-[10px] text-muted-foreground px-3 mb-2 font-medium tracking-wider">CATEGORIES</div>
          
          <div 
            className={cn("flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground cursor-pointer select-none", selectedCategory === "spare_parts" && "bg-accent text-accent-foreground")}
            onClick={() => { setSelectedCategory("spare_parts"); setSelectedFamily(null); }}
          >
            <Tool className="w-3.5 h-3.5" />
            <span>Spare parts</span>
            <span className={cn("ml-auto text-[10px] px-1.5 rounded-full bg-background", selectedCategory === "spare_parts" && "bg-border text-accent-foreground")}>{sparePartsCount}</span>
          </div>
          {selectedCategory === "spare_parts" && spareFamilies.map(f => (
            <div 
              key={f as string} 
              className={cn("pl-7 pr-3 py-1 text-[11px] text-muted-foreground flex justify-between cursor-pointer", selectedFamily === f && "text-accent-foreground font-medium")}
              onClick={() => setSelectedFamily(f as string)}
            >
              {f as string}
            </div>
          ))}

          <div 
            className={cn("flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground cursor-pointer select-none mt-2", selectedCategory === "tyres" && "bg-accent text-accent-foreground")}
            onClick={() => { setSelectedCategory("tyres"); setSelectedFamily(null); }}
          >
            <Circle className="w-3.5 h-3.5" />
            <span>Tyres</span>
            <span className={cn("ml-auto text-[10px] px-1.5 rounded-full bg-background", selectedCategory === "tyres" && "bg-border text-accent-foreground")}>{tyresCount}</span>
          </div>
          {selectedCategory === "tyres" && tyreVehicles.map(v => (
            <div 
              key={v as string} 
              className={cn("pl-7 pr-3 py-1 text-[11px] text-muted-foreground flex justify-between cursor-pointer", selectedFamily === v && "text-accent-foreground font-medium")}
              onClick={() => setSelectedFamily(v as string)}
            >
              {v as string}
            </div>
          ))}

          <div 
            className={cn("flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground cursor-pointer select-none mt-2", selectedCategory === "tubes" && "bg-accent text-accent-foreground")}
            onClick={() => { setSelectedCategory("tubes"); setSelectedFamily(null); }}
          >
            <Droplet className="w-3.5 h-3.5" />
            <span>Tubes</span>
            <span className={cn("ml-auto text-[10px] px-1.5 rounded-full bg-background", selectedCategory === "tubes" && "bg-border text-accent-foreground")}>{tubesCount}</span>
          </div>
        </div>

        {/* Main Area */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <div className="flex-1 bg-muted/50 border border-border rounded-md px-2 py-1.5 text-[11px] text-muted-foreground flex items-center gap-2">
              <Search className="w-3.5 h-3.5" />
              <input 
                type="text" 
                className="bg-transparent border-none outline-none flex-1 text-foreground placeholder:text-muted-foreground"
                placeholder="Search by name, code, or اردو..."
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {Object.entries(groupedProducts).map(([group, items]) => (
              <div key={group}>
                <div className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium text-muted-foreground border-b border-border bg-muted/30">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                  {group} <span className="text-[10px] bg-background px-1.5 rounded-full ml-1">{items.length} items</span>
                </div>
                
                {selectedCategory === "spare_parts" ? (
                  <div className="grid grid-cols-[90px_1fr_70px_50px_60px_40px_30px] items-center px-3 py-1.5 border-b border-border bg-muted/30 text-[10px] text-muted-foreground font-medium tracking-wider">
                    <span>Item code</span>
                    <span>Name</span>
                    <span>Model</span>
                    <span>Position</span>
                    <span>Sale Price</span>
                    <span>Stock</span>
                    <span>QRC</span>
                  </div>
                ) : null}

                {items.map(p => (
                  selectedCategory === "spare_parts" ? (
                    <div key={p.id} className="grid grid-cols-[90px_1fr_70px_50px_60px_40px_30px] items-center px-3 py-1.5 border-b border-border text-[11px] gap-1.5 hover:bg-muted/10 transition-colors">
                      <span className="font-mono text-[10px] text-muted-foreground">{p.barcode}</span>
                      <div>
                        <div className="font-medium text-foreground">{p.name}</div>
                        {p.name_ur && <div className="text-[10px] text-muted-foreground text-right dir-rtl font-urdu">{p.name_ur}</div>}
                      </div>
                      <span className="text-[10px] text-muted-foreground">{p.primary_model_code || "—"}</span>
                      {p.specs?.position ? <span className="bg-accent/20 text-accent text-[10px] px-1.5 rounded-sm w-fit">{p.specs.position}</span> : <span>—</span>}
                      <span className="font-mono">{formatRs(p.price)}</span>
                      <input 
                        className={cn("bg-accent/10 border-none outline-none font-mono font-medium rounded-sm w-8 px-1", p.stock_qty <= 0 ? "text-destructive" : "text-success")}
                        value={p.stock_qty}
                        onChange={e => updateProductInCatalog(p.id, { stock_qty: Number(e.target.value) || 0 })}
                      />
                      <span className="text-[10px] text-muted-foreground">{p.qrc_runs || 0}×</span>
                    </div>
                  ) : (
                    <div key={p.id} className="inline-block w-1/3 p-1.5 align-top">
                      <div className="border border-border rounded-md p-2">
                        <div className="font-mono font-medium text-xs text-foreground flex justify-between">
                          {p.specs?.size || p.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-[1px] uppercase">{p.brand}</div>
                        <div className="text-[10px] text-muted-foreground/70">{p.specs?.ply} · {p.specs?.tread}</div>
                        <div className="font-mono font-medium text-xs mt-1">{formatRs(p.price)}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">In stock: {p.stock_qty}</div>
                      </div>
                    </div>
                  )
                ))}
              </div>
            ))}
            
            {visibleProducts.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No products found in this category or search.
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background">
          <ProductForm onSaved={() => setIsAddOpen(false)} />
        </DialogContent>
      </Dialog>
    </BackendLayout>
  );
}
