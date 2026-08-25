import { useState } from "react";
import { LogIn, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { useBackend } from "@/lib/backend-context";
import { toast } from "sonner";

type Mode = "signin" | "forgot";

export function AuthScreen() {
  const { signIn, signInWithGoogle, sendPasswordReset } = useAuth();
  const { storeSettings } = useBackend();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "signin") {
        const result = await signIn(email, password);
        if (!result.ok) return setError(result.error ?? "Sign in failed");
        toast.success("Signed in");
      } else {
        const result = await sendPasswordReset(email);
        if (!result.ok) return setError(result.error ?? "Could not send reset email");
        toast.success("Password reset link sent — check your email");
        setMode("signin");
      }
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    const result = await signInWithGoogle();
    setBusy(false);
    if (!result.ok) setError(result.error ?? "Google sign-in failed");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-card p-6 shadow-elevated"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground">
            {storeSettings.brand?.charAt(0) ?? "V"}
          </span>
          <div>
            <h1 className="text-xl font-semibold">{storeSettings.name}</h1>
            <p className="text-sm text-muted-foreground">
              {mode === "signin" ? "Sign in to your register" : "Reset your password"}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@veloramart.com"
            className="h-11"
          />
        </div>

        {mode === "signin" && (
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11"
            />
          </div>
        )}

        {error && <p className="text-sm font-medium text-destructive">{error}</p>}

        <Button type="submit" className="h-11 w-full gap-2" disabled={busy}>
          {mode === "signin" ? (
            <>
              <LogIn className="h-4 w-4" /> Sign in
            </>
          ) : (
            <>
              <Mail className="h-4 w-4" /> Send reset link
            </>
          )}
        </Button>

        {mode === "signin" && (
          <Button
            type="button"
            variant="secondary"
            className="h-11 w-full"
            onClick={() => void google()}
            disabled={busy}
          >
            Continue with Google
          </Button>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          {/* Staff accounts are created by a Manager from Back Office → Settings → Users. */}
          <p className="text-xs text-muted-foreground">
            Don&apos;t have an account?{" "}
            <span className="font-medium text-foreground">Ask your manager.</span>
          </p>
          <button
            type="button"
            className="text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => {
              setError(null);
              setMode(mode === "forgot" ? "signin" : "forgot");
            }}
          >
            {mode === "forgot" ? "Back to sign in" : "Forgot password?"}
          </button>
        </div>
      </form>
    </div>
  );
}
