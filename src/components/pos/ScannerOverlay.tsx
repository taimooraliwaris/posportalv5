import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Check, Minus, Plus, ScanLine, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePos } from "@/lib/pos-context";
import { emitScan } from "@/lib/scanner-router";
import { beep } from "@/lib/audio-service";
import { formatRs, type Product } from "@/lib/pos-data";
import { ProductForm } from "@/components/backend/ProductForm";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";

type BatchLine = { product: Product; qty: number };

/**
 * Live camera scanning through zxing. The library is loaded lazily so it never
 * enters the SSR bundle, and we fall back to a simulated scan when no camera
 * is available (or permission is denied).
 *
 * Two behaviours:
 *  - `mode="single"` closes as soon as one code decodes and routes it through
 *    the scan router (so whichever screen owns the mode handles it).
 *  - `mode="batch"` (till default) collects every decoded product into a
 *    review list and adds them to the cart in one confirm.
 */
export function ScannerOverlay({
  onClose,
  mode = "batch",
}: {
  onClose: () => void;
  mode?: "batch" | "single";
}) {
  const { productList, findByBarcode, addProducts } = usePos();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const lastCode = useRef<{ code: string; at: number }>({ code: "", at: 0 });

  const [flash, setFlash] = useState(false);
  const [unknown, setUnknown] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [batch, setBatch] = useState<BatchLine[]>([]);
  const [cameraState, setCameraState] = useState<"idle" | "starting" | "live" | "error">("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setCameraState("idle");
  }, []);

  const close = useCallback(() => {
    stopCamera();
    onClose();
  }, [onClose, stopCamera]);

  const succeed = useCallback((name: string) => {
    setUnknown(null);
    setFlash(true);
    setTimeout(() => setFlash(false), 400);
    toast.success(`${name} scanned`);
  }, []);

  const handleCode = useCallback(
    (code: string) => {
      const now = Date.now();
      if (lastCode.current.code === code && now - lastCode.current.at < 1200) return;
      lastCode.current = { code, at: now };

      if (mode === "single") {
        void emitScan(code, "camera");
        close();
        return;
      }

      const product = findByBarcode(code);
      if (!product) {
        beep.error();
        setUnknown(code);
        return;
      }
      beep.success();
      setBatch((prev) => {
        const existing = prev.find((l) => l.product.id === product.id);
        return existing
          ? prev.map((l) => (l.product.id === product.id ? { ...l, qty: l.qty + 1 } : l))
          : [...prev, { product, qty: 1 }];
      });
      succeed(product.name);
    },
    [close, findByBarcode, mode, succeed],
  );

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setCameraState("starting");
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current ?? undefined,
        (result) => {
          if (result) handleCode(result.getText());
        },
      );
      controlsRef.current = controls;
      setCameraState("live");
    } catch (error) {
      setCameraState("error");
      setCameraError(
        error instanceof Error && error.name === "NotAllowedError"
          ? "Camera permission was denied. Allow access or use Simulate Scan."
          : "No camera available on this device — use Simulate Scan instead.",
      );
    }
  }, [handleCode]);

  useEffect(() => {
    void startCamera();
    return () => {
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const simulate = () => {
    if (Math.random() < 0.22) {
      handleCode(String(Math.floor(Math.random() * 9e9) + 1e9));
      return;
    }
    const product = productList[Math.floor(Math.random() * productList.length)]!;
    handleCode(product.barcode);
  };

  const batchQty = batch.reduce((sum, l) => sum + l.qty, 0);
  const batchTotal = batch.reduce((sum, l) => sum + l.qty * l.product.price, 0);

  const confirmBatch = () => {
    if (!batch.length) return;
    addProducts(batch);
    toast.success(`${batchQty} item${batchQty === 1 ? "" : "s"} added to the cart`);
    setBatch([]);
    close();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <span className="flex items-center gap-2 font-semibold">
          <ScanLine className="h-5 w-5 text-primary" /> Scanner
          {mode === "batch" && (
            <span className="text-xs font-normal text-muted-foreground">batch mode</span>
          )}
        </span>
        <div className="flex items-center gap-2">
          {cameraState === "live" ? (
            <Button variant="ghost" className="h-11" onClick={stopCamera}>
              <CameraOff className="h-4 w-4" /> Camera off
            </Button>
          ) : (
            <Button variant="ghost" className="h-11" onClick={() => void startCamera()}>
              <Camera className="h-4 w-4" /> Camera on
            </Button>
          )}
          <Button variant="secondary" className="h-11" onClick={close}>
            <X className="h-4 w-4" /> Stop
          </Button>
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center gap-6 overflow-y-auto p-4 sm:p-6">
        <div className="relative aspect-video w-full max-w-2xl overflow-hidden rounded-xl bg-foreground/90">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            muted
            playsInline
            aria-label="Barcode camera preview"
          />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,rgba(0,0,0,0.55))]" />
          <div className="pointer-events-none absolute inset-x-[12%] inset-y-[18%] rounded-xl">
            <Corner className="left-0 top-0 border-l-4 border-t-4" />
            <Corner className="right-0 top-0 border-r-4 border-t-4" />
            <Corner className="bottom-0 left-0 border-b-4 border-l-4" />
            <Corner className="bottom-0 right-0 border-b-4 border-r-4" />
            {cameraState === "live" && (
              <div className="absolute inset-x-2 h-0.5 animate-scanline bg-success shadow-[0_0_12px_var(--success)]" />
            )}
          </div>
          {flash && (
            <div className="absolute inset-0 grid animate-pop-in place-items-center bg-success/70">
              <Check className="h-20 w-20 text-success-foreground" strokeWidth={3} />
            </div>
          )}
        </div>

        {unknown && (
          <div className="w-full max-w-2xl rounded-md border border-warning bg-warning/20 p-4">
            <p className="font-medium">Unrecognized barcode: {unknown}</p>
            <p className="text-sm text-muted-foreground">This code isn&apos;t in the catalog yet.</p>
            <Button className="mt-3 h-11" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Create Product from this code
            </Button>
          </div>
        )}

        {mode === "batch" && batch.length > 0 && (
          <div className="w-full max-w-2xl space-y-2 rounded-md border border-border bg-card p-3">
            <p className="text-sm font-medium">Scanned items ({batchQty})</p>
            <ul className="max-h-56 space-y-1.5 overflow-y-auto">
              {batch.map((line) => (
                <li
                  key={line.product.id}
                  className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {line.product.name}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {formatRs(line.product.price * line.qty)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    aria-label={`Decrease ${line.product.name}`}
                    onClick={() =>
                      setBatch((prev) =>
                        prev
                          .map((l) =>
                            l.product.id === line.product.id ? { ...l, qty: l.qty - 1 } : l,
                          )
                          .filter((l) => l.qty > 0),
                      )
                    }
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-6 text-center text-sm font-semibold">{line.qty}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    aria-label={`Increase ${line.product.name}`}
                    onClick={() =>
                      setBatch((prev) =>
                        prev.map((l) =>
                          l.product.id === line.product.id ? { ...l, qty: l.qty + 1 } : l,
                        ),
                      )
                    }
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    aria-label={`Remove ${line.product.name}`}
                    onClick={() =>
                      setBatch((prev) => prev.filter((l) => l.product.id !== line.product.id))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <span className="text-sm font-semibold">Total {formatRs(batchTotal)}</span>
              <div className="flex gap-2">
                <Button variant="ghost" className="h-11" onClick={() => setBatch([])}>
                  Clear
                </Button>
                <Button className="h-11" onClick={confirmBatch}>
                  <Check className="h-4 w-4" /> Add {batchQty} to cart
                </Button>
              </div>
            </div>
          </div>
        )}

        <Button className="h-14 px-8 text-base" onClick={simulate}>
          <ScanLine className="h-5 w-5" /> Simulate Scan
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          {cameraState === "live"
            ? mode === "batch"
              ? "Keep scanning — review the list, then add everything at once."
              : "Point a barcode at the camera — it closes automatically on the first scan."
            : cameraState === "starting"
              ? "Requesting camera access..."
              : (cameraError ?? "Camera is off.")}
        </p>
      </div>

      <Dialog
        open={createOpen}
        onOpenChange={(o) => {
          setCreateOpen(o);
          if (!o) setUnknown(null);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 border border-border">
          <ProductForm
            onSaved={() => {
              setCreateOpen(false);
              setUnknown(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Corner({ className }: { className: string }) {
  return <div className={`absolute h-8 w-8 rounded-sm border-success ${className}`} />;
}
