// @ts-nocheck
import { useState } from "react";
import { Barcode, Image as ImageIcon, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { usePos } from "@/lib/pos-context";
import { useBackend } from "@/lib/backend-context";
import { formatRs, type CategoryId } from "@/lib/pos-data";
import { useScanMode, useScanTarget } from "@/lib/scan-mode-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function CashInOutModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { addCashMove } = usePos();
  const [type, setType] = useState<"in" | "out">("in");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cash In / Out</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border">
          {(["in", "out"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={cn(
                "min-h-12 bg-card font-medium capitalize transition-colors",
                type === t && "bg-primary text-primary-foreground",
              )}
            >
              Cash {t}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Rs.</span>
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="0.00"
            className="h-12 text-lg"
          />
        </div>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason..."
          className="min-h-24"
        />
        <div className="flex items-center gap-2">
          <Button
            className="h-11 px-6"
            disabled={!Number(amount)}
            onClick={() => {
              addCashMove({ type, amount: Number(amount), reason });
              setAmount("");
              setReason("");
              onOpenChange(false);
              toast.success(`Cash ${type} recorded`);
            }}
          >
            Confirm
          </Button>
          <Button variant="secondary" className="h-11 px-6" onClick={() => onOpenChange(false)}>
            Discard
          </Button>
          <button
            type="button"
            className="ml-auto text-sm font-medium text-primary underline-offset-4 hover:underline"
            onClick={() => toast("No cash movements yet in this session")}
          >
            Details
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const swatches = ["pink", "sand", "sage", "sky"] as const;

export function NewProductModal({
  open,
  onOpenChange,
  presetBarcode,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  presetBarcode?: string;
}) {
  const { addProductToCatalog, categoryList, addCategory } = usePos();
  const { openCamera } = useScanMode();
  const { addStockItem, storeSettings } = useBackend();
  const [name, setName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [minStock, setMinStock] = useState("5");
  const [barcode, setBarcode] = useState(presetBarcode ?? "");
  const [track, setTrack] = useState(true);
  const [price, setPrice] = useState("1.00");
  const [category, setCategory] = useState<CategoryId>("misc");
  const [tone, setTone] = useState<(typeof swatches)[number]>("pink");

  const incl = Number(price || 0);

  useScanTarget(
    "product-dialog",
    ({ code }) => {
      setBarcode(code);
      toast.success(`Barcode scanned: ${code}`);
      return "added";
    },
    open,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New Product</DialogTitle>
        </DialogHeader>
        <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
          <div className="space-y-4">
            <Field label="Product Name">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Cheese Burger"
                className="h-11"
              />
            </Field>
            <Field label="Barcode">
              <div className="flex items-center gap-2">
                <Input
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="e.g. 1234567890"
                  className="h-11"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-11 w-11 shrink-0"
                  onClick={() => openCamera("single")}
                  aria-label="Scan barcode with camera"
                >
                  <Barcode className="h-5 w-5" />
                </Button>
              </div>
            </Field>
            <Field label="Track Inventory">
              <div className="flex h-11 items-center">
                <Checkbox
                  checked={track}
                  onCheckedChange={(v) => setTrack(Boolean(v))}
                  className="h-6 w-6"
                />
              </div>
            </Field>
            <Field label="Sales Price">
              <Input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                inputMode="decimal"
                className="h-11"
              />
            </Field>
            <Field label="POS Category">
              <div className="flex flex-wrap items-center gap-2">
                {categoryList.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id)}
                    className={cn(
                      "min-h-11 rounded-full border border-border px-4 text-sm",
                      category === c.id && "border-primary bg-accent text-accent-foreground",
                    )}
                  >
                    {c.name}
                  </button>
                ))}
                <span className="flex items-center gap-1">
                  <Input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="New category"
                    className="h-11 w-36"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-11"
                    disabled={!newCategory.trim()}
                    onClick={() => {
                      const created = addCategory(newCategory);
                      setCategory(created.id);
                      setNewCategory("");
                      toast.success(`Category "${created.name}" added`);
                    }}
                  >
                    Add
                  </Button>
                </span>
              </div>
            </Field>
            <Field label="Min. Stock">
              <Input
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                inputMode="numeric"
                className="h-11"
              />
            </Field>
            <Field label="Color">
              <div className="flex h-11 items-center gap-3">
                {swatches.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setTone(s)}
                    className={cn(
                      `h-8 w-8 rounded-full border border-border bg-${s}`,
                      tone === s && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                    )}
                    aria-label={s}
                  />
                ))}
              </div>
            </Field>
          </div>
          <div className="grid h-32 w-32 place-items-center rounded-xl border border-dashed border-border bg-muted text-muted-foreground">
            <ImageIcon className="h-8 w-8" />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            className="h-11 px-6"
            disabled={!name.trim()}
            onClick={() => {
              const created = addProductToCatalog({
                name,
                price: Number(price || 0),
                category,
                barcode: barcode || "0000000",
                tone,
                icon: "Package",
              });
              addStockItem({
                productId: created.id,
                sku: `SKU-${created.id.slice(-4).toUpperCase()}`,
                onHand: 0,
                reserved: 0,
                reorderPoint: Number(minStock || 0),
                cost: Number(price || 0) * 0.6,
                supplierId: "",
                active: true,
                description: `${created.name} - stocked at ${storeSettings.name}.`,
                history: [0, 0, 0, 0, 0, 0],
              });
              setName("");
              onOpenChange(false);
              toast.success("Product created");
            }}
          >
            Save
          </Button>
          <Button variant="secondary" className="h-11 px-6" onClick={() => onOpenChange(false)}>
            Discard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] items-center gap-3">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
