import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { usePos } from "@/lib/pos-context";
import { useBackend } from "@/lib/backend-context";
import { useScanTarget, useScanMode } from "@/lib/scan-mode-context";
import { cn } from "@/lib/utils";
import { ArrowLeft, Barcode, Circle, Droplet, Wrench } from "lucide-react";

export function ProductForm({ onSaved }: { onSaved?: () => void }) {
  const { addProductToCatalog, updateProductInCatalog, productList, categoryList } = usePos();
  const { suppliers, updateSupplier } = useBackend();
  const { openCamera } = useScanMode();

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");

  const [selectedCategorySlug, setSelectedCategorySlug] = useState<
    "spare_parts" | "tyres" | "tubes" | "misc"
  >("spare_parts");

  const [itemCode, setItemCode] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [nameUr, setNameUr] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [stockQty, setStockQty] = useState("");
  const [ctnQty, setCtnQty] = useState("");

  const [loadedProductId, setLoadedProductId] = useState<string | null>(null);

  // Auto-fill effect for pasted/typed itemCode
  useEffect(() => {
    if (step !== 2 || !itemCode) return;
    const trimmed = itemCode.trim();
    if (trimmed.length < 3) return; // avoid rapid fires on 1-2 chars

    const existing = productList.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === trimmed.toLowerCase()) ||
        (p.item_code && p.item_code.toLowerCase() === trimmed.toLowerCase()),
    );

    if (existing && existing.id !== loadedProductId) {
      const cat = categoryList.find(
        (c) => c.id === existing.category || c.slug === existing.category,
      );
      if (cat && cat.slug !== selectedCategorySlug) {
        toast.error(
          `Error: Code '${trimmed}' is already used in category '${cat.name}'. Cannot assign to ${selectedCategorySlug.replace("_", " ")}.`
        );
        setItemCode("");
      } else {
        setLoadedProductId(existing.id);
        setNameEn(existing.name || "");
        setNameUr(existing.name_ur || "");
        setCostPrice(existing.cost_price ? String(existing.cost_price) : "");
        setSalePrice(existing.price ? String(existing.price) : "");
        setStockQty(existing.stock_qty !== undefined ? String(existing.stock_qty) : "");
        setManualBrand(existing.brand || "");
        toast.success(`Loaded existing product: ${existing.name}`);
      }
    }
  }, [itemCode, step, productList, categoryList, selectedCategorySlug, loadedProductId]);

  // Barcode scan listener in ProductForm to autofill or load existing product
  useScanTarget("product-dialog", ({ code }) => {
    const trimmed = code.trim();
    if (!trimmed) return "unknown";

    const existing = productList.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === trimmed.toLowerCase()) ||
        (p.item_code && p.item_code.toLowerCase() === trimmed.toLowerCase()),
    );

    if (existing) {
      const cat = categoryList.find(
        (c) => c.id === existing.category || c.slug === existing.category,
      );
      if (step === 2 && cat && cat.slug !== selectedCategorySlug) {
        toast.error(
          `Error: Scanned code belongs to category '${cat.name}'. Cannot assign to ${selectedCategorySlug.replace("_", " ")}.`
        );
        return "ignored";
      }

      setLoadedProductId(existing.id);
      setItemCode(existing.item_code || existing.barcode || trimmed);
      setNameEn(existing.name || "");
      setNameUr(existing.name_ur || "");
      setCostPrice(existing.cost_price ? String(existing.cost_price) : "");
      setSalePrice(existing.price ? String(existing.price) : "");
      setStockQty(existing.stock_qty !== undefined ? String(existing.stock_qty) : "");
      
      if (cat?.slug) setSelectedCategorySlug(cat.slug as any);
      setManualBrand(existing.brand || "");
      setStep(2);
      toast.success(`Loaded existing product: ${existing.name}`);
      return "added";
    }

    setItemCode(trimmed);
    setLoadedProductId(null);
    return "added";
  });

  // Custom manual overrides for auto-parsing
  const [manualBrand, setManualBrand] = useState<string | undefined>(undefined);
  const [manualSize, setManualSize] = useState<string | undefined>(undefined);
  const [manualModel, setManualModel] = useState<string | undefined>(undefined);
  const [manualPly, setManualPly] = useState<string | undefined>(undefined);

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on step 2
  useEffect(() => {
    if (step === 2) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [step]);

  // Handle barcode Enter key prevention
  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form) {
        const index = Array.prototype.indexOf.call(form, e.currentTarget);
        (form.elements[index + 1] as HTMLElement)?.focus();
      }
    }
  };

  // Derive unique lists for datalists
  const allBrands = Array.from(
    new Set(productList.map((p) => p.brand).filter(Boolean)),
  ) as string[];
  const allSizes = Array.from(
    new Set(productList.map((p) => p.specs?.['size']).filter(Boolean)),
  ) as string[];
  const allModels = Array.from(
    new Set(productList.map((p) => p.primary_model_code).filter(Boolean)),
  ) as string[];

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
  const tubeBrandMatch = nameEn.match(/([A-Z][A-Z]+)$/);

  const isSparePart = selectedCategorySlug === "spare_parts";
  const isTyre = selectedCategorySlug === "tyres";
  const isTube = selectedCategorySlug === "tubes";

  // Resolved values (manual overrides auto-parsed)
  const resolvedBrand =
    manualBrand !== undefined ? manualBrand : (isTyre ? tyreBrandMatch?.[1] : isTube ? tubeBrandMatch?.[1] : undefined);
  const resolvedSize =
    manualSize !== undefined ? manualSize : (isTyre ? tyreSizeMatch?.[1] : isTube ? tubeSizeMatch?.[1] : undefined);
  const resolvedPly = manualPly !== undefined ? manualPly : (isTyre ? tyrePlyMatch?.[1] : undefined);
  const resolvedModel = manualModel !== undefined ? manualModel : modelMatch?.[1];

  const handleSave = () => {
    if (!nameEn) {
      toast.error("Name is required");
      return;
    }

    const cat = categoryList.find((c) => c.slug === selectedCategorySlug);
    if (!cat) {
      toast.error("Invalid category");
      return;
    }

    const payload = {
      item_code: itemCode || null,
      name: nameEn,
      name_ur: nameUr || null,
      brand: resolvedBrand || null,
      cost_price: Number(costPrice || 0),
      price: Number(salePrice || 0),
      stock_qty: Number(stockQty || 0),
      ctn_qty: Number(ctnQty || 0),
      foc_threshold: null,
      foc_qty: null,
      qrc_runs: 1,
      specs: {
        family: isSparePart ? familyMatch?.[1] : undefined,
        position: isSparePart ? positionMatch?.[1] : undefined,
        variant: isSparePart ? variantMatch?.[1] : undefined,
        size: resolvedSize,
        ply: resolvedPly,
        tread: isTyre ? tyreTreadMatch?.[1] : undefined,
        valve: isTube ? tubeValveMatch?.[1] : undefined,
      },
      category: cat.slug,
      category_id: cat.id,
      vehicle_model_id: null,
      is_active: true,
      barcode: itemCode || null,
    };

    let savedProductId = loadedProductId;

    if (loadedProductId) {
      updateProductInCatalog(loadedProductId, payload as any);
      toast.success("Product updated successfully");
    } else {
      const duplicate = productList.find(
        (p) =>
          itemCode && (
            (p.barcode && p.barcode.toLowerCase() === itemCode.toLowerCase()) ||
            (p.item_code && p.item_code.toLowerCase() === itemCode.toLowerCase())
          )
      );
      if (duplicate) {
        toast.error(`Code '${itemCode}' already exists as ${duplicate.name}`);
        return;
      }

      const created = addProductToCatalog(payload as any);
      savedProductId = created.id;
      toast.success("Product added successfully");
    }

    if (selectedSupplierId && savedProductId) {
      const supp = suppliers.find((s) => s.id === selectedSupplierId);
      if (supp && !supp.productIds.includes(savedProductId)) {
        updateSupplier(supp.id, { productIds: [...supp.productIds, savedProductId] });
      }
    }

    onClose();
    if (onSaved) onSaved();
  };

  if (step === 1) {
    return (
      <div className="space-y-4 p-6 md:p-8">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">Select product category</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div
            onClick={() => {
              setSelectedCategorySlug("spare_parts");
              setStep(2);
            }}
            className="flex flex-col items-center justify-center p-6 bg-card border-2 border-border rounded-xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
          >
            <Wrench className="w-8 h-8 text-primary mb-3" />
            <span className="font-semibold text-sm">Spare Parts</span>
          </div>
          <div
            onClick={() => {
              setSelectedCategorySlug("tyres");
              setStep(2);
            }}
            className="flex flex-col items-center justify-center p-6 bg-card border-2 border-border rounded-xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
          >
            <Circle className="w-8 h-8 text-primary mb-3" />
            <span className="font-semibold text-sm">Tyres</span>
          </div>
          <div
            onClick={() => {
              setSelectedCategorySlug("tubes");
              setStep(2);
            }}
            className="flex flex-col items-center justify-center p-6 bg-card border-2 border-border rounded-xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
          >
            <Droplet className="w-8 h-8 text-primary mb-3" />
            <span className="font-semibold text-sm">Tubes</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6 md:p-8">
      {/* Datalists for comboboxes */}
      <datalist id="brands-list">
        {allBrands.map((b) => (
          <option key={b} value={b} />
        ))}
      </datalist>
      <datalist id="sizes-list">
        {allSizes.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <datalist id="models-list">
        {allModels.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>

      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setStep(1)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <span className="font-medium text-sm capitalize">
          {selectedCategorySlug.replace("_", " ")} Details
        </span>
      </div>

      <form className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Core details column */}
        <div className="space-y-3">
            <label className="text-[11px] text-muted-foreground flex items-center justify-between mb-1">
              <span>Barcode / Item code <span className="text-destructive">*</span></span>
              <span className="text-[10px] text-success flex items-center gap-1 font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Scanner Ready
              </span>
            </label>
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={itemCode}
                onChange={(e) => setItemCode(e.target.value)}
                onKeyDown={handleBarcodeKeyDown}
                className={cn("font-mono h-9 flex-1", itemCode && "border-primary")}
                placeholder="Scan with reader or type SKU..."
              />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => openCamera("single")}
                title="Scan barcode with camera"
              >
                <Barcode className="h-4 w-4" />
              </Button>
            </div>

          <div>
            <label className="text-[11px] text-muted-foreground block mb-1">
              Name (English) <span className="text-destructive">*</span>
            </label>
            <Input
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              className={cn("h-9", nameEn && "border-primary")}
              placeholder="e.g. SERVIS 2.50-17 6PR ( CHEETA )"
            />
          </div>

          <div>
            <label className="text-[11px] text-muted-foreground block mb-1">
              Name (Urdu) <span className="text-xs text-muted-foreground/50">(Optional)</span>
            </label>
            <Input
              value={nameUr}
              onChange={(e) => setNameUr(e.target.value)}
              className="font-urdu text-right h-9"
              dir="rtl"
              placeholder="اردو نام..."
            />
          </div>

          <div>
            <label className="text-[11px] text-muted-foreground block mb-1">
              Supplier <span className="text-xs text-muted-foreground/50">(Optional)</span>
            </label>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">No supplier selected</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dynamic Fields & Pricing column */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">Brand</label>
              <Input
                list="brands-list"
                value={resolvedBrand || ""}
                onChange={(e) => setManualBrand(e.target.value)}
                className="h-9"
                placeholder="Auto-detected or type..."
              />
            </div>
            {isTyre || isTube ? (
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Size</label>
                <Input
                  list="sizes-list"
                  value={resolvedSize || ""}
                  onChange={(e) => setManualSize(e.target.value)}
                  className="h-9 font-mono"
                  placeholder="e.g. 2.50-17"
                />
              </div>
            ) : (
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">
                  Vehicle Model
                </label>
                <Input
                  list="models-list"
                  value={resolvedModel || ""}
                  onChange={(e) => setManualModel(e.target.value)}
                  className="h-9 font-mono"
                  placeholder="e.g. CD70-CDI"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">
                Cost Price (Rs)
              </label>
              <Input
                type="number"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="h-9"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">
                Sale Price (Rs) <span className="text-destructive">*</span>
              </label>
              <Input
                type="number"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                className="h-9 bg-primary/5"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">Stock Qty</label>
              <Input
                type="number"
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
                className="h-9"
              />
            </div>
            {isTyre ? (
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Ply Rating</label>
                <Input
                  value={resolvedPly || ""}
                  onChange={(e) => setManualPly(e.target.value)}
                  className="h-9"
                  placeholder="e.g. 6PR"
                />
              </div>
            ) : (
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">
                  Ctn Qty (Optional)
                </label>
                <Input
                  type="number"
                  value={ctnQty}
                  onChange={(e) => setCtnQty(e.target.value)}
                  className="h-9"
                />
              </div>
            )}
          </div>
        </div>
      </form>

      <div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
        <Button variant="outline" onClick={() => setStep(1)}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!nameEn}>
          Save Product
        </Button>
      </div>
    </div>
  );
}
