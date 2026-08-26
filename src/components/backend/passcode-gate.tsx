import { useCallback, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Delete, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useNumericKeyboard } from "@/lib/use-numeric-entry";
import { cn } from "@/lib/utils";

const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

export function PasscodeGate({ children }: { children: ReactNode }) {
  const { backendUnlocked, unlockBackend, currentUser, lockedUntil } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const locked = Boolean(lockedUntil && Date.now() < lockedUntil);

  const submit = useCallback(
    (value: string) => {
      const result = unlockBackend(value);
      if (!result.ok) {
        setError(result.error ?? "Incorrect passcode");
        setCode("");
      }
    },
    [unlockBackend],
  );

  const press = useCallback(
    (key: string) => {
      if (locked) return;
      setError(null);
      if (key === "del" || key === "backspace") {
        setCode((c) => c.slice(0, -1));
        return;
      }
      if (key === "clear") {
        setCode("");
        return;
      }
      if (!/^[0-9]$/.test(key)) return;
      setCode((current) => {
        const next = (current + key).slice(0, 6);
        if (next.length === 6) submit(next);
        return next;
      });
    },
    [locked, submit],
  );

  // Physical keyboards work exactly like the on-screen pad.
  useNumericKeyboard({
    enabled: !backendUnlocked,
    onKey: press,
    onEnter: () => {
      if (code.length === 6) submit(code);
    },
    onEscape: () => {
      setError(null);
      setCode("");
    },
  });

  if (backendUnlocked) return <>{children}</>;



  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground">
        <ShieldCheck className="h-7 w-7" />
      </div>
      <div className="text-center">
        <h1 className="text-xl font-semibold">Back office locked</h1>
        <p className="text-sm text-muted-foreground">
          {currentUser ? `${currentUser.name}, enter` : "Enter"} the 6-digit backend passcode
        </p>
      </div>

      <div className="flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-3.5 w-3.5 rounded-full border border-border",
              i < code.length && "bg-foreground",
            )}
          />
        ))}
      </div>

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      <div className="grid w-full max-w-xs grid-cols-3 gap-2">
        {keys.map((key, i) =>
          key === "" ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              disabled={locked}
              onClick={() => press(key)}
              className="min-h-14 rounded-xl border border-border bg-card text-lg font-medium transition-transform active:scale-[0.97] disabled:opacity-40"
            >
              {key === "del" ? <Delete className="mx-auto h-5 w-5" /> : key}
            </button>
          ),
        )}
      </div>

      <Button variant="ghost" className="h-11" asChild>
        <Link to="/">Back to register</Link>
      </Button>
    </div>
  );
}
