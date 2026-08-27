import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { usePos } from "@/lib/pos-context";
import { cn } from "@/lib/utils";
import { Check, MapPin, Tag } from "lucide-react";

export function ProductForm({ onSaved }: { onSaved?: () => void }) {
  const { addProductToCatalog } = usePos();
  
  const [itemCode, setItemCode] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [nameUr, setNameUr] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [stockQty, setStockQty] = useState("");
  const [ctnQty, setCtnQty] = useState("");
  
  // Spare parts rules
  const modelMatch = itemCode.match(/^(\d{2})-/);
  const familyMatch = nameEn.match(/^([A-Z]+)\b/);
  const positionMatch = nameEn.match(/\b(FRONT|REAR|CENTER|LEFT|RIGHT)\b/);
  const variantMatch = itemCode.match(/-([\w\d]+)$/);
  
  // Tyre rules
  const tyreBrandMatch = nameEn.match(/^([A-Z][A-Z .]+?)\s+\d/);
  const tyreSizeMatch = nameEn.match(/(\d+\.\d+[-/]\d+)/);
  const tyrePlyMatch = nameEn.match(/(\d+PR)/);
  const tyreTreadMatch = nameEn.match(/\(\s*([^)]+)\s*\)/);
  
  // Tube rules
  const tubeValveMatch = nameEn.match(/(TR-\d+)/);

  const isSparePart = itemCode.length > 0;
  const isTyre = nameEn.includes("PR") || nameEn.includes("-17") || nameEn.includes("-18");
  const isTube = nameEn.includes("TR-");

  const modelCode = modelMatch ? (modelMatch[1] === "18" ? "CD70-CDI" : modelMatch[1] === "07" ? "CG125" : "Unknown") : null;
  const family = familyMatch ? familyMatch[1] : null;
  const position = positionMatch ? positionMatch[1].toLowerCase() : null;
  const variant = variantMatch ? `Variant ${variantMatch[1]}` : null;

  const brand = isTyre ? tyreBrandMatch?.[1] : isTube ? nameEn.split(" ").pop() : null;
  const size = tyreSizeMatch?.[1];
  const ply = tyrePlyMatch?.[1];
  const tread = tyreTreadMatch?.[1];
  const valve = tubeValveMatch?.[1];

  const handleSave = () => {
    if (!nameEn) {
      toast.error("Name is required");
      return;
    }
    
    // Save product
    addProductToCatalog({
      item_code: itemCode,
      name: nameEn,
      name_ur: nameUr,
      brand: brand || null,
      cost_price: Number(costPrice || 0),
      price: Number(salePrice || 0),
      stock_qty: Number(stockQty || 0),
      ctn_qty: Number(ctnQty || 0),
      foc_threshold: null,
      foc_qty: null,
      qrc_runs: 1,
      specs: {
        family,
        position,
        variant,
        size,
        ply,
        tread,
        valve
      },
      category: isSparePart ? "spare_parts" : isTyre ? "tyres" : isTube ? "tubes" : "misc",
      category_id: isSparePart ? "spare_parts" : isTyre ? "tyres" : isTube ? "tubes" : "misc",
      vehicle_model_id: null,
      is_active: true,
      barcode: itemCode,
    } as any);

    toast.success("Product saved successfully");
    if (onSaved) onSaved();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Spare Part Panel */}
      <div className="p-4 bg-secondary/20 border border-border rounded-xl">
        <h3 className="text-[11px] font-medium text-muted-foreground tracking-wider uppercase mb-4">Spare part — item code path</h3>
        
        <label className="text-[11px] text-muted-foreground block mb-1">Item code <span className="text-destructive">*</span></label>
        <Input value={itemCode} onChange={e => setItemCode(e.target.value)} className={cn("mb-2 font-mono h-9", itemCode && "border-primary")} />
        
        {modelCode && (
          <div className="flex items-center gap-2 p-1.5 px-2.5 rounded bg-success/20 border border-success/30 mt-1">
            <Check className="w-3.5 h-3.5 text-success" />
            <span className="text-[11px] text-success flex-1">Model detected</span>
            <span className="text-xs font-mono text-success font-medium">{modelCode}</span>
          </div>
        )}
        {variant && (
          <div className="flex items-center gap-2 p-1.5 px-2.5 rounded bg-success/20 border border-success/30 mt-1">
            <Check className="w-3.5 h-3.5 text-success" />
            <span className="text-[11px] text-success flex-1">Variant</span>
            <span className="text-xs font-mono text-success font-medium">{variant}</span>
          </div>
        )}

        <div className="h-px bg-border my-4" />

        <label className="text-[11px] text-muted-foreground block mb-1">Name (English) <span className="text-destructive">*</span></label>
        <Input value={nameEn} onChange={e => setNameEn(e.target.value)} className="mb-2 h-9 uppercase" />
        
        {position && (
          <div className="flex items-center gap-2 p-1.5 px-2.5 rounded bg-primary/20 border border-primary/30 mt-1">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] text-primary flex-1">Position detected</span>
            <span className="text-xs font-mono text-primary font-medium">{position}</span>
          </div>
        )}
        {family && (
          <div className="flex items-center gap-2 p-1.5 px-2.5 rounded bg-primary/20 border border-primary/30 mt-1">
            <Tag className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] text-primary flex-1">Family</span>
            <span className="text-xs font-mono text-primary font-medium">{family}</span>
          </div>
        )}

        {nameEn && (
          <>
            <div className="h-px bg-border my-4" />
            <div className="text-[10px] text-muted-foreground font-medium tracking-wider mb-2">APPEARS AFTER NAME FILLS</div>
            <label className="text-[11px] text-muted-foreground block mb-1">Name (Urdu)</label>
            <Input value={nameUr} onChange={e => setNameUr(e.target.value)} dir="rtl" className="mb-2 h-9 text-right font-urdu text-sm" />

            <div className="grid grid-cols-2 gap-2 mt-3">
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Cost (PKR) *</label>
                <Input value={costPrice} onChange={e => setCostPrice(e.target.value)} className="h-9" />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Sale (PKR)</label>
                <Input value={salePrice} onChange={e => setSalePrice(e.target.value)} className="h-9" />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Stock qty</label>
                <Input value={stockQty} onChange={e => setStockQty(e.target.value)} className="h-9" />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">CTN qty</label>
                <Input value={ctnQty} onChange={e => setCtnQty(e.target.value)} className="h-9 text-muted-foreground" />
              </div>
            </div>

            <Button onClick={handleSave} className="w-full mt-4 h-10">Save product</Button>
          </>
        )}
      </div>

      {/* Tyre Panel */}
      <div className="p-4 bg-secondary/20 border border-border rounded-xl">
        <h3 className="text-[11px] font-medium text-muted-foreground tracking-wider uppercase mb-4">Tyre / Tube parsing</h3>
        
        <label className="text-[11px] text-muted-foreground block mb-1">Product name <span className="text-destructive">*</span></label>
        <Input value={nameEn} onChange={e => setNameEn(e.target.value)} className="mb-2 h-9 uppercase" />

        {brand && (
          <div className="flex items-center gap-2 p-1.5 px-2.5 rounded bg-success/20 border border-success/30 mt-1">
            <Check className="w-3.5 h-3.5 text-success" />
            <span className="text-[11px] text-success flex-1">Brand</span>
            <span className="text-xs font-mono text-success font-medium">{brand}</span>
          </div>
        )}
        {size && (
          <div className="flex items-center gap-2 p-1.5 px-2.5 rounded bg-success/20 border border-success/30 mt-1">
            <Check className="w-3.5 h-3.5 text-success" />
            <span className="text-[11px] text-success flex-1">Size</span>
            <span className="text-xs font-mono text-success font-medium">{size}</span>
          </div>
        )}
        {ply && (
          <div className="flex items-center gap-2 p-1.5 px-2.5 rounded bg-success/20 border border-success/30 mt-1">
            <Check className="w-3.5 h-3.5 text-success" />
            <span className="text-[11px] text-success flex-1">Ply rating</span>
            <span className="text-xs font-mono text-success font-medium">{ply}</span>
          </div>
        )}
        {tread && (
          <div className="flex items-center gap-2 p-1.5 px-2.5 rounded bg-success/20 border border-success/30 mt-1">
            <Check className="w-3.5 h-3.5 text-success" />
            <span className="text-[11px] text-success flex-1">Tread pattern</span>
            <span className="text-xs font-mono text-success font-medium">{tread}</span>
          </div>
        )}
        {valve && (
          <div className="flex items-center gap-2 p-1.5 px-2.5 rounded bg-primary/20 border border-primary/30 mt-1">
            <Check className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] text-primary flex-1">Valve type</span>
            <span className="text-xs font-mono text-primary font-medium">{valve}</span>
          </div>
        )}
        
        {(brand || size) && (
          <>
            <div className="h-px bg-border my-4" />
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Cost (PKR) *</label>
                <Input value={costPrice} onChange={e => setCostPrice(e.target.value)} className="h-9" />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Sale (PKR)</label>
                <Input value={salePrice} onChange={e => setSalePrice(e.target.value)} className="h-9" />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Stock qty</label>
                <Input value={stockQty} onChange={e => setStockQty(e.target.value)} className="h-9" />
              </div>
            </div>
            <Button onClick={handleSave} className="w-full mt-4 h-10">Save product</Button>
          </>
        )}
      </div>
    </div>
  );
}
