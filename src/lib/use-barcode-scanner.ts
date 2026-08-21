import { useEffect, useRef } from "react";

/**
 * Global "keyboard wedge" barcode listener.
 *
 * Physical scanners emit keystrokes far faster than a human can type and finish
 * with Enter. We buffer keydown events at the window level and only treat a
 * burst as a scan when the average gap between strokes is tight, so manual
 * typing in a search box is never hijacked and the cashier never has to focus
 * an input before scanning.
 */

export type BarcodeScannerOptions = {
  /** Maximum milliseconds between two keystrokes for them to count as one scan. */
  maxKeyInterval?: number;
  /** Shortest accepted barcode. */
  minLength?: number;
  /** Ignore a repeat of the same code inside this window (trigger held down). */
  dedupeWindow?: number;
  /** Turn the listener off (for example while a value is being edited). */
  enabled?: boolean;
};

const defaults = {
  maxKeyInterval: 30,
  minLength: 4,
  dedupeWindow: 700,
};

export function useBarcodeScanner(
  onScan: (code: string) => void,
  options: BarcodeScannerOptions = {},
) {
  const { maxKeyInterval, minLength, dedupeWindow } = { ...defaults, ...options };
  const enabled = options.enabled ?? true;

  const buffer = useRef("");
  const lastKeyAt = useRef(0);
  const lastScan = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const handler = useRef(onScan);
  handler.current = onScan;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const now = Date.now();
      const gap = now - lastKeyAt.current;
      lastKeyAt.current = now;

      if (event.key === "Enter") {
        const code = buffer.current.trim();
        buffer.current = "";
        // A human pressing Enter after typing produces a long gap; a scanner
        // sends its terminator in the same burst as the digits.
        if (code.length < minLength || gap > maxKeyInterval) return;

        if (lastScan.current.code === code && now - lastScan.current.at < dedupeWindow) return;
        lastScan.current = { code, at: now };

        const target = event.target as HTMLElement | null;
        const typing =
          !!target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable);
        if (typing) event.preventDefault();

        handler.current(code);
        return;
      }

      if (event.key.length !== 1) return;
      // Too slow to be a scanner: start a fresh buffer.
      if (gap > maxKeyInterval) buffer.current = "";
      buffer.current += event.key;
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [enabled, maxKeyInterval, minLength, dedupeWindow]);
}
