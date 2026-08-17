import { useState } from "react";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { useBackend } from "@/lib/backend-context";
import { toast } from "sonner";

export function LoginScreen() {
  const { signIn } = useAuth();
  const { storeSettings } = useBackend();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = signIn(email, password);
    if (!result.ok) {
      setError(result.error ?? "Sign in failed");
      return;
    }
    setError(null);
    toast.success("Signed in");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-card p-6 shadow-elevated"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground">
            V
          </span>
          <div>
            <h1 className="text-xl font-semibold">{storeSettings.name}</h1>
            <p className="text-sm text-muted-foreground">Sign in to your register</p>
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
            placeholder="rida@veloramart.com"
            className="h-11"
          />
        </div>
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

        {error && <p className="text-sm font-medium text-destructive">{error}</p>}

        <Button type="submit" className="h-11 w-full gap-2">
          <LogIn className="h-4 w-4" /> Sign in
        </Button>

        <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Demo accounts</p>
          <p>rida@veloramart.com / cashier123</p>
          <p>hamza@veloramart.com / manager123</p>
          <p>nadia@veloramart.com / admin123</p>
        </div>
      </form>
    </div>
  );
}
