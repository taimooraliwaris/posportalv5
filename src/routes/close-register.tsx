import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { usePos } from "@/lib/pos-context";
import { formatRs } from "@/lib/pos-data";
import { toast } from "sonner";

export const Route = createFileRoute("/close-register")({
  head: () => ({
    meta: [
      { title: "Close Register — Velora POS" },
      { name: "description", content: "Close the register and review the daily summary." },
      { property: "og:title", content: "Close Register — Velora POS" },
      { property: "og:description", content: "Close the register and review the daily summary." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CloseRegister,
});

function CloseRegister() {
  const { openingCash, cashMoves, closeRegister } = usePos();
  const [counted, setCounted] = useState("");
  const [note, setNote] = useState("");
  const navigate = useNavigate();

  const cashPayments = 1500; // simulated cash taken during session
  const cashIn = cashMoves.filter((m) => m.type === "in").reduce((s, m) => s + m.amount, 0);
  const cashOut = cashMoves.filter((m) => m.type === "out").reduce((s, m) => s + m.amount, 0);
  const expected = openingCash + cashPayments + cashIn - cashOut;
  const countedNum = Number(counted) || 0;
  const difference = countedNum - expected;

  const handleClose = () => {
    closeRegister(countedNum, note);
    toast.success("Register closed");
    navigate({ to: "/z-report" });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Button variant="ghost" className="h-11" asChild>
          <Link to="/till">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Link>
        </Button>
        <h1 className="text-lg font-semibold">Close Register</h1>
      </header>

      <main className="mx-auto w-full max-w-3xl p-4">
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
          <Row label="Opening" value={openingCash} />
          <Row label="Payments" value={cashPayments} />
          <details className="group">
            <summary className="flex cursor-pointer items-center justify-between text-sm font-medium text-muted-foreground">
              Cash In / Out
              <span className="group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="mt-2 space-y-1 pl-4 text-sm">
              <div className="flex justify-between">
                <span className="text-success">Cash In</span>
                <span>{formatRs(cashIn)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-destructive">Cash Out</span>
                <span>{formatRs(cashOut)}</span>
              </div>
            </div>
          </details>
          <div className="border-t border-border pt-3">
            <div className="flex justify-between font-medium">
              <span>Expected</span>
              <span>{formatRs(expected)}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-soft">
          <label className="text-sm font-medium">Cash Count</label>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Rs.</span>
            <Input
              value={counted}
              onChange={(e) => setCounted(e.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              className="h-12 text-lg"
            />
          </div>
          <div className="mt-3 flex justify-between">
            <span className="text-sm text-muted-foreground">Difference</span>
            <span className={difference >= 0 ? "text-success" : "text-destructive"}>
              {difference > 0 ? "+" : ""}
              {formatRs(difference)}
            </span>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-soft">
          <label className="text-sm font-medium">Closing Note</label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note about the closing..."
            className="mt-2 min-h-24"
          />
        </div>

        <div className="mt-6 flex gap-3">
          <Button variant="secondary" className="h-12 flex-1" asChild>
            <Link to="/till">Cancel</Link>
          </Button>
          <Button
            className="h-12 flex-1 text-base"
            disabled={countedNum <= 0}
            onClick={handleClose}
          >
            <Check className="mr-2 h-4 w-4" /> Close Register
          </Button>
        </div>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{formatRs(value)}</span>
    </div>
  );
}
