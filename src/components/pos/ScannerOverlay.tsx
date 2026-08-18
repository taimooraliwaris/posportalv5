import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Check, Plus, ScanLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePos } from "@/lib/pos-context";
import { NewProductModal } from "./MenuModals";
import { toast } from "sonner";

/**
 * Live camera scanning through zxing. The library is loaded lazily so it never
 * enters the SSR bundle, and we fall back to a simulated scan when no camera
 * is available (or permission is denied).
 */
export function ScannerOverlay({ onClose }: { onClose: () => void }) {
  const { productList, addProduct, addByBarcode } = usePos();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const lastCode = useRef<{ code: string; at: number }>({ code: "", at: 0 });

  const [flash, setFlash] = useState(false);
  const [unknown, setUnknown] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [cameraState, setCameraState] = useState<"idle" | "starting" | "live" | "error">("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);

  const succeed = useCallback((name: string) => {
    setUnknown(null);
    setFlash(true);
    setTimeout(() => setFlash(false), 500);
    toast.success(`${name} added`);
  }, []);

  const handleCode = useCallback(
    (code: string) => {
      const now = Date.now();
      if (lastCode.current.code === code && now - lastCode.current.at < 1500) return;
      lastCode.current = { code, at: now };

      const product = addByBarcode(code);
      if (product) succeed(product.name);
      else setUnknown(code);
    },
    [addByBarcode, succeed],
  );

  const stopCamera = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setCameraState("idle");
  }, []);

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
      setUnknown(String(Math.floor(Math.random() * 9e9) + 1e9));
      return;
    }
    const product = productList[Math.floor(Math.random() * productList.length)]!;
    addProduct(product);
    succeed(product.name);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="flex items-center gap-2 font-semibold">
          <ScanLine className="h-5 w-5 text-primary" /> Scanner
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
          <Button
            variant="secondary"
            className="h-11"
            onClick={() => {
              stopCamera();
              onClose();
            }}
          >
            <X className="h-4 w-4" /> Stop
          </Button>
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto p-6">
        <div className="relative aspect-video w-full max-w-2xl overflow-hidden rounded-2xl bg-foreground/90">
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
        <p className="text-center text-sm text-muted-foreground">
          {cameraState === "live"
            ? "Point a barcode at the camera — it is added to the cart automatically."
            : cameraState === "starting"
              ? "Requesting camera access..."
              : (cameraError ?? "Camera is off.")}
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
