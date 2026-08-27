import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Store, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePos } from "@/lib/pos-context";
import { useStore } from "@/lib/backend-context";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Open Register — Velora POS" },
      { name: "description", content: "Open your register and start selling with Velora POS." },
      { property: "og:title", content: "Open Register — Velora POS" },
      {
        property: "og:description",
        content: "Open your register and start selling with Velora POS.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OpenRegister,
});

function OpenRegister() {
  const store = useStore();
  const { registerOpen, openingCash, openRegister } = usePos();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [amount, setAmount] = useState("500.00");
  const [time, setTime] = useState(() => formatTime());

  useEffect(() => {
    const t = setInterval(() => setTime(formatTime()), 1000);
    return () => clearInterval(t);
  }, []);

  const open = () => {
    const value = Number(amount) || 0;
    openRegister(value);
    toast.success("Register opened");
    setModalOpen(false);
    // Cashiers always want the till next — skip the interstitial screen.
    void navigate({ to: "/till" });
  };

  if (registerOpen) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-primary text-4xl font-bold text-primary-foreground">
          V
        </div>
        <h1 className="text-2xl font-semibold">Register is open</h1>
        <p className="text-muted-foreground">Opening cash: Rs. {openingCash.toFixed(2)}</p>
        <Button asChild className="h-12 px-8">
          <Link to="/till">
            Go to till <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-6">
      <div className="mx-auto grid h-24 w-24 place-items-center rounded-2xl bg-primary text-5xl font-bold text-primary-foreground shadow-elevated">
        V
      </div>
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">{store.name}</h1>
        <p className="mt-1 text-muted-foreground">{store.tagline}</p>
      </div>
      <div className="text-center">
        <p className="text-5xl font-light tabular-nums">{time}</p>
        <p className="mt-1 text-sm text-muted-foreground">{formatDate()}</p>
      </div>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="flex min-h-16 w-full max-w-xs items-center justify-center gap-3 rounded-2xl bg-primary px-8 text-lg font-medium text-primary-foreground shadow-soft transition-transform duration-150 active:scale-[0.97]"
      >
        <Store className="h-5 w-5" /> Open Register
      </button>
      <Link
        to="/backend"
        className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Backend
      </Link>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-elevated">
            <h2 className="text-xl font-semibold">Opening Cash</h2>
            <p className="text-sm text-muted-foreground">Enter the cash amount in the drawer.</p>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Rs.</span>
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                className="h-12 text-lg"
                autoFocus
              />
            </div>
            <div className="mt-6 flex gap-2">
              <Button className="h-11 flex-1" onClick={open}>
                Open
              </Button>
              <Button variant="secondary" className="h-11" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime() {
  return new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function formatDate() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}
