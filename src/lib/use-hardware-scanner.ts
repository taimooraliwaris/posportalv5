import { useEffect, useRef } from "react";

/**
 * Physical (USB/Bluetooth) barcode scanners type very fast and finish with Enter.
 * We buffer keystrokes and only treat a burst as a scan when it is fast enough,
 * so normal typing in inputs is never hijacked.
 */
export function useHardwareScanner(onScan: (code: string) => void, enabled = true) {
  const buffer = useRef("");
  const last = useRef(0);
  const handler = useRef(onScan);
  handler.current = onScan;

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      const now = Date.now();
      if (now - last.current > 80) buffer.current = "";
      last.current = now;

      if (e.key === "Enter") {
        const code = buffer.current;
        buffer.current = "";
        if (code.length >= 6) {
          if (typing) e.preventDefault();
          handler.current(code);
        }
        return;
      }
      if (e.key.length === 1) buffer.current += e.key;
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
