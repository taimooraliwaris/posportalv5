import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";

export type KeypadMode = { label: string; value: string; active?: boolean };

type KeypadProps = {
  onKey: (key: string) => void;
  /**
   * Optional edit-target selectors (Qty / Price / %). These choose what is
   * being edited rather than modifying the number, so they stay on the pad.
   */
  modes?: KeypadMode[];
  className?: string;
};

const digitRows = [
  ["7", "8", "9"],
  ["4", "5", "6"],
  ["1", "2", "3"],
];

const clearRowSpan: Record<number, string> = {
  0: "row-span-4",
  1: "row-span-3",
  2: "row-span-2",
  3: "row-span-1",
};

export function Keypad({ onKey, modes = [], className }: KeypadProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-4 gap-px overflow-hidden rounded-xl border border-border bg-border",
        className,
      )}
    >
      <div className="col-span-3 grid grid-cols-3 gap-px">
        {digitRows.flat().map((key) => (
          <KeypadButton key={key} label={key} onClick={() => onKey(key)}>
            {key}
          </KeypadButton>
        ))}
        <KeypadButton label="Decimal point" onClick={() => onKey(".")}>
          .
        </KeypadButton>
        <KeypadButton label="0" onClick={() => onKey("0")}>
          0
        </KeypadButton>
        <KeypadButton label="Backspace" onClick={() => onKey("backspace")}>
          <Delete className="h-5 w-5" />
        </KeypadButton>
      </div>

      <div className="grid grid-rows-4 gap-px">
        {modes.map((mode) => (
          <KeypadButton
            key={mode.value}
            label={mode.label}
            onClick={() => onKey(mode.value)}
            className={cn(
              mode.active && "bg-primary font-semibold text-primary-foreground hover:bg-primary",
            )}
          >
            {mode.label}
          </KeypadButton>
        ))}
        <KeypadButton
          label="Clear"
          onClick={() => onKey("clear")}
          className={cn("font-semibold", clearRowSpan[modes.length] ?? "row-span-1")}
        >
          C
        </KeypadButton>
      </div>
    </div>
  );
}

function KeypadButton({
  children,
  onClick,
  className,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "grid h-12 place-items-center bg-card text-base font-medium transition-colors duration-150 hover:bg-muted active:bg-accent",
        className,
      )}
    >
      {children}
    </button>
  );
}
