import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";

type KeypadProps = {
  onKey: (key: string) => void;
  rightColumn: { label: string; value: string; active?: boolean; tone?: "green" | "default" }[];
};

export function Keypad({ onKey, rightColumn }: KeypadProps) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
  return (
    <div className="grid grid-cols-4 gap-px overflow-hidden rounded-xl border border-border bg-border">
      <div className="col-span-3 grid grid-cols-3 gap-px">
        {keys.map((k) => (
          <KeypadButton key={k} onClick={() => onKey(k)}>
            {k}
          </KeypadButton>
        ))}
        <KeypadButton onClick={() => onKey("+/-")} className="bg-sand">
          +/-
        </KeypadButton>
        <KeypadButton onClick={() => onKey("0")}>0</KeypadButton>
        <KeypadButton onClick={() => onKey(".")} className="bg-pink">
          .
        </KeypadButton>
      </div>
      <div className="grid grid-rows-4 gap-px">
        {rightColumn.map((r) => (
          <KeypadButton
            key={r.label}
            onClick={() => onKey(r.value)}
            className={cn(
              r.tone === "green" && "bg-success-soft",
              r.active && "bg-accent font-semibold text-accent-foreground",
            )}
          >
            {r.label}
          </KeypadButton>
        ))}
        <KeypadButton onClick={() => onKey("backspace")} className="bg-destructive/25">
          <Delete className="h-5 w-5" />
        </KeypadButton>
      </div>
    </div>
  );
}

function KeypadButton({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "grid h-12 place-items-center bg-card text-base font-medium transition-colors duration-150 hover:bg-muted active:bg-accent",
        className,
      )}
    >
      {children}
    </button>
  );
}
