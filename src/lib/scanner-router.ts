import { beep } from "./audio-service";

/**
 * Context-aware scan routing.
 *
 * A single global listener feeds every scan into this router, which forwards it
 * to whichever screen owns the current scan mode. Screens register a handler
 * and the router takes care of sound feedback for the common outcomes.
 */

export type ScanMode =
  /** Mode A — ring the item up on the active order. */
  | "till"
  /** Mode B — look the item up without touching the cart. */
  | "price-check"
  /** Mode C — refund/replace, including receipt barcodes. */
  | "return"
  /** Mode D — fill the barcode/SKU field of the item being edited. */
  | "inventory";

export type ScanOutcome = "added" | "info" | "unknown" | "rejected" | "ignored";

export type ScanSource = "wedge" | "camera" | "manual";

export type ScanEvent = { code: string; source: ScanSource };

export type ScanHandler = (event: ScanEvent) => ScanOutcome | void | Promise<ScanOutcome | void>;

const outcomeTone: Record<ScanOutcome, (() => void) | null> = {
  added: beep.success,
  info: beep.alert,
  unknown: beep.error,
  rejected: beep.error,
  ignored: null,
};

class ScannerRouter {
  /** Stack per mode: the last registered handler (e.g. an open dialog) wins,
   * and removing it restores the screen underneath. */
  private handlers = new Map<ScanMode, ScanHandler[]>();
  private mode: ScanMode = "till";
  private listeners = new Set<(mode: ScanMode) => void>();

  getMode(): ScanMode {
    return this.mode;
  }

  setMode(mode: ScanMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    beep.action();
    this.listeners.forEach((listener) => listener(mode));
  }

  subscribe(listener: (mode: ScanMode) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  register(mode: ScanMode, handler: ScanHandler): () => void {
    const stack = this.handlers.get(mode) ?? [];
    stack.push(handler);
    this.handlers.set(mode, stack);
    return () => {
      const current = this.handlers.get(mode);
      if (!current) return;
      const next = current.filter((h) => h !== handler);
      if (next.length) this.handlers.set(mode, next);
      else this.handlers.delete(mode);
    };
  }

  /** Route one scan to the handler owning the current mode. */
  async dispatch(code: string, source: ScanSource = "wedge"): Promise<ScanOutcome> {
    const trimmed = code.trim();
    if (!trimmed) return "ignored";

    const stack = this.handlers.get(this.mode);
    const handler = stack?.[stack.length - 1];
    if (!handler) {
      beep.error();
      return "rejected";
    }


    const outcome = (await handler({ code: trimmed, source })) ?? "ignored";
    outcomeTone[outcome]?.();
    return outcome;
  }
}

export const scannerRouter = new ScannerRouter();

/** Feed a code in from the camera overlay or a manual entry field. */
export function emitScan(code: string, source: ScanSource = "camera") {
  return scannerRouter.dispatch(code, source);
}
