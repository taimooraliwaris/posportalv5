import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePos } from "@/lib/pos-context";
import { formatRs } from "@/lib/pos-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/z-report")({
  head: () => ({
    meta: [
      { title: "Z Report — Velora POS" },
      { name: "description", content: "Daily Z report and sales summary." },
      { property: "og:title", content: "Z Report — Velora POS" },
      { property: "og:description", content: "Daily Z report and sales summary." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ZReport,
});

function ZReport() {
  const { closedSummary, orders } = usePos();
  const [daily, setDaily] = useState(false);

  const paidOrders = orders.filter((o) => o.status === "paid");
  const totalSales = paidOrders.reduce((s, o) => s + o.lines.reduce((l, li) => l + li.qty * li.unitPrice, 0), 0);
  const totalTax = paidOrders.reduce((s, o) => s + o.lines.reduce((l, li) => l + li.qty * li.unitPrice * 0.18, 0), 0);
  const totalPayments = paidOrders.reduce((s, o) => s + o.payments.reduce((p, py) => p + py.amount, 0), 0);
  const cashPayments = paidOrders
    .flatMap((o) => o.payments)
    .filter((p) => p.method === "Cash")
    .reduce((s, p) => s + p.amount, 0);
  const cardPayments = paidOrders
    .flatMap((o) => o.payments)
    .filter((p) => p.method === "Card")
    .reduce((s, p) => s + p.amount, 0);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <Button variant="ghost" className="h-11" asChild>
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" /> Home
          </Link>
        </Button>
        <h1 className="text-lg font-semibold">Z Report</h1>
        <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => setDaily((d) => !d)}>
          <FileText className="h-5 w-5" />
        </Button>
      </header>

      <main className="mx-auto w-full max-w-3xl p-4">
        {!daily ? (
          <div className="space-y-4">
            <div className="text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                V
              </div>
              <h2 className="mt-3 text-xl font-semibold">Velora Mart</h2>
              <p className="text-sm text-muted-foreground">{new Date().toLocaleString()}</p>
            </div>

            <SummaryCard title="SOLD" rows={[["Sales", totalSales]]} total={totalSales} />
            <SummaryCard
              title="PAYMENTS"
              rows={[
                ["Cash", cashPayments],
                ["Card", cardPayments],
              ]}
              total={totalPayments}
            />
            <SummaryCard title="TAXES" rows={[["GST 18%", totalTax]]} total={totalTax} />
            <SummaryCard
              title="TOTAL"
              rows={[
                ["Counted", closedSummary?.counted ?? 0],
                ["Difference", (closedSummary?.counted ?? 0) - totalPayments],
              ]}
              total={totalPayments}
              highlight
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <h2 className="mb-3 text-lg font-semibold">Daily Sales Report</h2>
            <div className="hidden grid-cols-4 gap-3 border-b border-border pb-2 text-sm font-medium text-muted-foreground sm:grid">
              <span>Order</span>
              <span>Time</span>
              <span>Items</span>
              <span>Total</span>
            </div>
            {paidOrders.map((o) => (
              <div
                key={o.id}
                className="grid grid-cols-1 gap-3 border-b border-border py-3 last:border-0 sm:grid-cols-4"
              >
                <span className="font-medium">{o.number}</span>
                <span className="text-sm text-muted-foreground">{o.time}</span>
                <span className="text-sm text-muted-foreground">{o.lines.reduce((s, l) => s + l.qty, 0)}</span>
                <span className="font-medium">
                  {formatRs(o.lines.reduce((s, l) => s + l.qty * l.unitPrice * 1.18, 0))}
                </span>
              </div>
            ))}
            {paidOrders.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">No paid orders today.</p>
            )}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <Button variant="secondary" className="h-12 flex-1" asChild>
            <Link to="/">Done</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}

function SummaryCard({
  title,
  rows,
  total,
  highlight,
}: {
  title: string;
  rows: [string, number][];
  total: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border p-4 shadow-soft",
        highlight ? "bg-primary text-primary-foreground" : "bg-card",
      )}
    >
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider opacity-80">{title}</div>
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between py-1">
          <span className={highlight ? "opacity-90" : "text-muted-foreground"}>{label}</span>
          <span className="font-medium">{formatRs(value)}</span>
        </div>
      ))}
      <div className="mt-2 border-t border-current border-opacity-20 pt-2">
        <div className="flex justify-between text-lg font-semibold">
          <span>Total</span>
          <span>{formatRs(total)}</span>
        </div>
      </div>
    </div>
  );
}
