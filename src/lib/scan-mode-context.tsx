import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { audioService } from "./audio-service";
import { useBarcodeScanner } from "./use-barcode-scanner";
import {
  scannerRouter,
  type ScanHandler,
  type ScanMode,
  type ScanOutcome,
} from "./scanner-router";

type CameraMode = "batch" | "single";

type ScanModeState = {
  mode: ScanMode;
  setMode: (mode: ScanMode) => void;
  /** Suspend global scanning (while editing a price, for example). */
  paused: boolean;
  setPaused: (paused: boolean) => void;
  scan: (code: string) => Promise<ScanOutcome>;
  /** Exactly one camera overlay lives in the app — this is its state. */
  cameraOpen: boolean;
  cameraMode: CameraMode;
  openCamera: (mode?: CameraMode) => void;
  closeCamera: () => void;
};

const ScanModeContext = createContext<ScanModeState | null>(null);

export function ScanModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ScanMode>(scannerRouter.getMode());
  const [paused, setPaused] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState<CameraMode>("batch");

  useEffect(() => scannerRouter.subscribe(setModeState), []);

  // Unlock the audio context on the first interaction so the first beep is instant.
  useEffect(() => {
    const prime = () => audioService.prime();
    window.addEventListener("pointerdown", prime, { once: true });
    window.addEventListener("keydown", prime, { once: true });
    return () => {
      window.removeEventListener("pointerdown", prime);
      window.removeEventListener("keydown", prime);
    };
  }, []);

  useBarcodeScanner((code) => void scannerRouter.dispatch(code, "wedge"), { enabled: !paused });

  const value = useMemo<ScanModeState>(
    () => ({
      mode,
      setMode: (next) => scannerRouter.setMode(next),
      paused,
      setPaused,
      scan: (code) => scannerRouter.dispatch(code, "manual"),
      cameraOpen,
      cameraMode,
      openCamera: (next = "batch") => {
        setCameraMode(next);
        setCameraOpen(true);
      },
      closeCamera: () => setCameraOpen(false),
    }),
    [mode, paused, cameraOpen, cameraMode],
  );

  return <ScanModeContext.Provider value={value}>{children}</ScanModeContext.Provider>;
}


export function useScanMode() {
  const ctx = useContext(ScanModeContext);
  if (!ctx) throw new Error("useScanMode must be used inside ScanModeProvider");
  return ctx;
}

/**
 * Claim a scan mode for as long as the screen is mounted and handle its scans.
 * The handler always sees the latest closure, so screens can read fresh state.
 */
export function useScanTarget(mode: ScanMode, handler: ScanHandler, active = true) {
  const { setMode, setPaused } = useScanMode();
  const ref = useRef(handler);
  ref.current = handler;

  useEffect(() => {
    if (!active) return;
    const prevMode = scannerRouter.getMode();
    setMode(mode);
    const unregister = scannerRouter.register(mode, (event) => ref.current(event));
    return () => {
      unregister();
      if (prevMode && prevMode !== mode) {
        setMode(prevMode);
      }
    };
  }, [mode, active, setMode]);

  return { setPaused };
}
