import { useCallback, useEffect, useRef, useState } from "react";

/** Keys understood by every keypad and numeric field in the app. */
export type NumericKey = string;

/**
 * Applies a single keypad key to a numeric string. Shared by the on-screen
 * keypad and the physical keyboard so both behave identically.
 */
export function applyNumericKey(current: string, key: NumericKey, maxDecimals = 2): string {
  if (key === "backspace") return current.slice(0, -1);
  if (key === "clear") return "";
  if (key === ".") {
    if (maxDecimals === 0 || current.includes(".")) return current;
    return current === "" ? "0." : `${current}.`;
  }
  if (!/^[0-9]$/.test(key)) return current;
  const decimals = current.split(".")[1];
  if (decimals !== undefined && decimals.length >= maxDecimals) return current;
  if (current === "0") return key;
  return current + key;
}

type KeyboardOptions = {
  /** Only listen while the field is the active edit target. */
  enabled?: boolean;
  onKey: (key: NumericKey) => void;
  onEnter?: () => void;
  onEscape?: () => void;
};

/**
 * Lets a numeric field accept physical keyboard input at the same time as
 * on-screen clicks. Keystrokes aimed at a real text input are never captured.
 */
export function useNumericKeyboard({ enabled = true, onKey, onEnter, onEscape }: KeyboardOptions) {
  const handlers = useRef({ onKey, onEnter, onEscape });
  handlers.current = { onKey, onEnter, onEscape };

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      if (/^[0-9]$/.test(event.key) || event.key === ".") {
        event.preventDefault();
        handlers.current.onKey(event.key);
        return;
      }
      if (event.key === "Backspace") {
        event.preventDefault();
        handlers.current.onKey("backspace");
        return;
      }
      if (event.key === "Delete") {
        event.preventDefault();
        handlers.current.onKey("clear");
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        handlers.current.onEscape?.();
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        handlers.current.onEnter?.();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}

type EntryOptions = {
  enabled?: boolean;
  maxDecimals?: number;
  onEnter?: (value: string) => void;
  onEscape?: () => void;
};

/** Self-contained numeric entry: holds the value and wires up the keyboard. */
export function useNumericEntry({
  enabled = true,
  maxDecimals = 2,
  onEnter,
  onEscape,
}: EntryOptions = {}) {
  const [value, setValue] = useState("");
  const latest = useRef(value);
  latest.current = value;

  const press = useCallback(
    (key: NumericKey) => setValue((current) => applyNumericKey(current, key, maxDecimals)),
    [maxDecimals],
  );

  useNumericKeyboard({
    enabled,
    onKey: press,
    onEnter: () => onEnter?.(latest.current),
    onEscape: () => {
      setValue("");
      onEscape?.();
    },
  });

  return { value, setValue, press, numeric: Number(value) || 0 };
}
