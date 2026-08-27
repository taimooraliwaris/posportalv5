import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { ScanLine } from "lucide-react";
import { ScannerOverlay } from "./ScannerOverlay";
import { useScanMode } from "@/lib/scan-mode-context";
import { cn } from "@/lib/utils";

/** Routes where a scan button would be noise. */
const hiddenRoutes = ["/auth", "/reset-password", "/"];

/** True while a Radix dialog/sheet is open, so the FAB never floats over it. */
function useDialogOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const check = () =>
      setOpen(document.querySelector('[role="dialog"][data-state="open"]') !== null);
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true });
    return () => observer.disconnect();
  }, []);
  return open;
}

/**
 * The app's single camera scanner: one overlay instance plus a floating
 * quick-toggle button. Till collects a batch; every other screen scans once and
 * lets the screen that owns the scan mode handle the code.
 */
export function ScanLayer() {
  const { cameraOpen, cameraMode, openCamera, closeCamera } = useScanMode();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const dialogOpen = useDialogOpen();

  const hidden = hiddenRoutes.includes(pathname) || dialogOpen;

  return (
    <>
      {!cameraOpen && !hidden && (
        <button
          type="button"
          onClick={() => openCamera(pathname === "/till" ? "batch" : "single")}
          aria-label="Scan with camera"
          className={cn(
            "fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full",
            "bg-primary text-primary-foreground shadow-soft transition-transform",
            "hover:brightness-110 active:scale-95 md:h-12 md:w-12",
          )}
        >
          <ScanLine className="h-6 w-6" />
        </button>
      )}
      {cameraOpen && <ScannerOverlay mode={cameraMode} onClose={closeCamera} />}
    </>
  );
}
