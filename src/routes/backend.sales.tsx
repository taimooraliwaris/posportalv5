import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BackendLayout } from "@/components/backend/backend-layout";
import { DataCard, DetailDrawer, Field, StatusPill } from "@/components/backend/backend-ui";
import { useBackend } from "@/lib/backend-context";
import { formatDate, type HistoricalSale } from "@/lib/backend-data";
import { usePos } from "@/lib/pos-context";
import { formatRs, STORE } from "@/lib/pos-data";
import { useHydrated } from "@/lib/use-hydrated";

export const Route = createFileRoute("/backend/sales")({
  head: () => ({
    meta: [
      { title: "Sales — Velora back office" },
      { name: "description", content: "Completed sales plus every return and exchange processed at the till." },
      { property: "og:title", content: "Sales — Velora back office" },
      { property: "og:description", content: "Completed sales plus every return and exchange processed at the till." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SalesPage,
});

function SalesPage() {
  const hydrated = useHydrated();
  const { sales } = useBackend();
  const { returns } = usePos();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<HistoricalSale | null>(null);

  if (!hydrated) return <BackendLayout title="Sales">{null}</BackendLayout>;

  const rows = sales
    .filter((s) => (!from || s.date >= from) && (!to || s.date <= to))
    .sort((a, b) => (a.date === b.date ? b.time.localeCompare(a.time) : b.date.localeCompare(a.date)))
    .slice(0, 120);

  return (
    <BackendLayout title="Sales">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          aria-label="From date"
          className="h-11 w-44"
        />
        <Input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          aria-label="To date"
          className="h-11 w-44"
        />
      </div>

      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="returns">Returns &amp; exchanges</TabsTrigger>
        </TabsList>
        <TabsContent value="orders">
          <DataCard>
            <div className="hidden grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] gap-3 border-b border-border px-4 py-2 text-sm font-medium text-muted-foreground md:grid">
              <span>Date</span>
              <span>Receipt</span>
              <span>Cashier</span>
              <span>Items</span>
              <span>Payment</span>
              <span>Total</span>
            </div>
            {rows.map((sale) => (
              <button
                key={sale.id}
                type="button"
                onClick={() => setSelected(sale)}
                className="grid w-full grid-cols-1 items-center gap-3 border-b border-border px-4 py-3 text-left last:border-0 hover:bg-muted md:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]"
              >
                <span>{formatDate(sale.date)}</span>
                <span className="text-sm text-muted-foreground">{sale.receipt}</span>
                <span className="text-sm">{sale.cashier}</span>
                <span>{sale.lines.reduce((s, l) => s + l.qty, 0)}</span>
                <span className="text-sm">{sale.method}</span>
                <span className="font-medium">{formatRs(sale.total)}</span>
              </button>
            ))}
          </DataCard>
        </TabsContent>
        <TabsContent value="returns">
          <DataCard>
            {returns.map((r) => (
              <div
                key={r.id}
                className="grid grid-cols-1 items-center gap-3 border-b border-border px-4 py-3 last:border-0 md:grid-cols-[1fr_1fr_1fr_1fr_auto]"
              >
                <span>{formatDate(r.date)}</span>
                <span className="text-sm text-muted-foreground">Order {r.originalNumber}</span>
                <span>{formatRs(Math.abs(r.difference))}</span>
                <span className="text-sm">{r.processedBy}</span>
                <StatusPill status={r.kind === "return" ? "returned" : "exchanged"} />
              </div>
            ))}
            {returns.length === 0 && (
              <p className="p-8 text-center text-sm text-muted-foreground">
                No returns or exchanges processed yet.
              </p>
            )}
          </DataCard>
        </TabsContent>
      </Tabs>

      <DetailDrawer
        open={!!selected}
        onOpenChange={() => setSelected(null)}
        title={selected ? `Receipt ${selected.receipt}` : ""}
        description="Read-only receipt view."
      >
        {selected && (
          <DataCard className="space-y-2 p-4 text-sm">
            <p className="text-center font-semibold">{STORE.name}</p>
            <Field label="Date" value={`${formatDate(selected.date)} ${selected.time}`} />
            <Field label="Cashier" value={selected.cashier} />
            <div className="border-t border-dashed border-border pt-2">
              {selected.lines.map((l, i) => (
                <Field key={i} label={`${l.qty} × ${l.name}`} value={formatRs(l.qty * l.unitPrice)} />
              ))}
            </div>
            <div className="border-t border-dashed border-border pt-2">
              <Field label="Paid by" value={selected.method} />
              <Field label="Total" value={formatRs(selected.total)} />
            </div>
          </DataCard>
        )}
      </DetailDrawer>
    </BackendLayout>
  );
}
