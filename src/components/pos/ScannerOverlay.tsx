import { useState } from "react";
import { Check, Plus, ScanLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePos } from "@/lib/pos-context";
import { NewProductModal } from "./MenuModals";
import { toast } from "sonner";

export function ScannerOverlay({ onClose }: { onClose: () => void }) {
  const { productList, addProduct } = usePos();
  const [flash, setFlash] = useState(false);
  const [unknown, setUnknown] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const simulate = () => {
    if (Math.random() < 0.22) {
      setUnknown(String(Math.floor(Math.random() * 9e9) + 1e9));
      return;
    }
    const product = productList[Math.floor(Math.random() * productList.length)]!;
    addProduct(product);
    setUnknown(null);
    setFlash(true);
    setTimeout(() => setFlash(false), 500);
    toast.success(`${product.name} added`);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="flex items-center gap-2 font-semibold">
          <ScanLine className="h-5 w-5 text-primary" /> Scanner
        </span>
        <Button variant="secondary" className="h-11" onClick={onClose}>
          <X className="h-4 w-4" /> Stop
        </Button>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
        <div className="relative aspect-video w-full max-w-2xl overflow-hidden rounded-2xl bg-foreground/90">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,rgba(0,0,0,0.55))]" />
          <div className="absolute inset-x-[12%] inset-y-[18%] rounded-xl">
            <Corner className="left-0 top-0 border-l-4 border-t-4" />
            <Corner className="right-0 top-0 border-r-4 border-t-4" />
            <Corner className="bottom-0 left-0 border-b-4 border-l-4" />
            <Corner className="bottom-0 right-0 border-b-4 border-r-4" />
            <div className="absolute inset-x-2 h-0.5 animate-scanline bg-success shadow-[0_0_12px_var(--success)]" />
          </div>
          {flash && (
            <div className="absolute inset-0 grid animate-pop-in place-items-center bg-success/70">
              <Check className="h-20 w-20 text-success-foreground" strokeWidth={3} />
            </div>
          )}
        </div>

        {unknown && (
          <div className="w-full max-w-2xl rounded-xl border border-warning bg-warning/20 p-4">
            <p className="font-medium">Unrecognized barcode: {unknown}</p>
            <p className="text-sm text-muted-foreground">
              This code isn&apos;t in the catalog yet.
            </p>
            <Button className="mt-3 h-11" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Create Product from this code
            </Button>
          </div>
        )}

        <Button className="h-14 px-8 text-base" onClick={simulate}>
          <ScanLine className="h-5 w-5" /> Simulate Scan
        </Button>
        <p className="text-sm text-muted-foreground">
          Prototype only — the viewfinder is a visual simulation.
        </p>
      </div>

      <NewProductModal
        open={createOpen}
        onOpenChange={(o) => {
          setCreateOpen(o);
          if (!o) setUnknown(null);
        }}
        presetBarcode={unknown ?? ""}
      />
    </div>
  );
}

function Corner({ className }: { className: string }) {
  return <div className={`absolute h-8 w-8 rounded-sm border-success ${className}`} />;
}
