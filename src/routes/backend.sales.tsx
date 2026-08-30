import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BackendLayout } from "@/components/backend/backend-layout";
import { DataCard, DetailDrawer, Field, StatusPill } from "@/components/backend/backend-ui";
import { DataTable, type Column } from "@/components/backend/data-table";
import { useBackend, useStore } from "@/lib/backend-context";
import { formatDate, type HistoricalSale } from "@/lib/backend-data";
import { usePos, type ReturnRecord } from "@/lib/pos-context";
import { formatRs } from "@/lib/pos-data";
import { useHydrated } from "@/lib/use-hydrated";
import { printOrderReceipt } from "@/lib/print-service";
import { Printer } from "lucide-react";
import { toast } from "sonner";

import { useScanTarget } from "@/lib/scan-mode-context";
import { Search } from "lucide-react";

export const Route = createFileRoute("/backend/sales")({
  head: () => ({
    meta: [
      { title: "Sales — Velora back office" },
      {
        name: "description",
        content: "Completed sales plus every return and exchange processed at the till.",
      },
      { property: "og:title", content: "Sales — Velora back office" },
      {
        property: "og:description",
        content: "Completed sales plus every return and exchange processed at the till.",
      },
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
  const store = useStore();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<HistoricalSale | null>(null);

  // Barcode / Invoice scan listener on Sales page
  useScanTarget("sales", ({ code }) => {
    const trimmed = code.trim().toLowerCase();
    const cleanNum = trimmed.replace(/^(rcp\/|ret-)/i, "");

    const match = sales.find((s) => {
      const rec = s.receipt?.toLowerCase() || "";
      const num = s.number?.toLowerCase() || "";
      const id = s.id?.toLowerCase() || "";
      return (
        rec === trimmed ||
        rec.includes(cleanNum) ||
        num === trimmed ||
        num.includes(cleanNum) ||
        id === trimmed
      );
    });

    if (match) {
      setSelected(match);
      setQuery(match.receipt || match.number);
      toast.success(`Invoice found: ${match.receipt || match.number}`);
      return "added";
    }

    toast.error(`No sales invoice found for ${code}`);
    return "unknown";
  });

  if (!hydrated) return <BackendLayout title="Sales">{null}</BackendLayout>;

  const rows = sales
    .filter((s) => {
      if (from && s.date < from) return false;
      if (to && s.date > to) return false;
      if (query) {
        const q = query.toLowerCase().trim();
        const cleanQ = q.replace(/^(rcp\/|ret-)/i, "");
        const rec = s.receipt?.toLowerCase() || "";
        const num = s.number?.toLowerCase() || "";
        const cashier = s.cashier?.toLowerCase() || "";
        return (
          rec.includes(q) ||
          rec.includes(cleanQ) ||
          num.includes(q) ||
          num.includes(cleanQ) ||
          cashier.includes(q)
        );
      }
      return true;
    })
    .sort((a, b) =>
      a.date === b.date ? String(b.time || "").localeCompare(String(a.time || "")) : String(b.date || "").localeCompare(String(a.date || "")),
    )
    .slice(0, 120);

  return (
    <BackendLayout title="Sales">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search / Scan Invoice (e.g. RCP/1016, 1016)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-11 pl-9 pr-3 text-xs"
          />
        </div>
        <Input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          aria-label="From date"
          className="h-11 w-40"
        />
        <Input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          aria-label="To date"
          className="h-11 w-40"
        />
      </div>

      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="returns">Returns &amp; exchanges</TabsTrigger>
        </TabsList>
        <TabsContent value="orders">
          <DataTable
            columns={saleColumns}
            rows={rows}
            getKey={(sale) => sale.id}
            onRowClick={setSelected}
            empty="No sales in this period."
          />
        </TabsContent>
        <TabsContent value="returns">
          <DataTable
            columns={returnColumns}
            rows={returns}
            getKey={(r) => r.id}
            empty="No returns or exchanges processed yet."
          />
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
            <p className="text-center font-semibold">{store.name}</p>
            <Field label="Date" value={`${formatDate(selected.date)} ${selected.time}`} />
            <Field label="Cashier" value={selected.cashier} />
            <div className="border-t border-dashed border-border pt-2">
              {selected.lines.map((l, i) => (
                <Field
                  key={i}
                  label={`${l.qty} × ${l.name}`}
                  value={formatRs(l.qty * l.unitPrice)}
                />
              ))}
            </div>
            <div className="border-t border-dashed border-border pt-2">
              <Field label="Paid by" value={selected.method} />
              <Field label="Total" value={formatRs(selected.total)} />
            </div>
            <div className="pt-2">
              <Button
                className="w-full h-11 font-semibold gap-2"
                onClick={() => {
                  printOrderReceipt({
                    id: selected.id,
                    number: selected.receipt.replace("RCP/", ""),
                    receipt: selected.receipt,
                    date: selected.date,
                    time: selected.time,
                    cashier: selected.cashier,
                    lines: selected.lines.map((l, idx) => ({
                      id: `sl-${idx}`,
                      productId: `p-${idx}`,
                      name: l.name,
                      qty: l.qty,
                      unitPrice: l.unitPrice,
                      discount: 0,
                    })),
                    payments: [{ id: "pm-1", method: selected.method as any, amount: selected.total }],
                    noteTags: [],
                    status: "paid",
                    pricelistId: "pl1",
                  });
                  toast.success(`Receipt ${selected.receipt} sent to printer`);
                }}
              >
                <Printer className="h-4 w-4" /> Print Duplicate Receipt
              </Button>
            </div>
          </DataCard>
        )}
      </DetailDrawer>
    </BackendLayout>
  );
}

const saleColumns: Column<HistoricalSale>[] = [
  { header: "Date", cell: (sale) => formatDate(sale.date) },
  {
    header: "Receipt",
    cell: (sale) => <span className="text-sm text-muted-foreground">{sale.receipt}</span>,
  },
  { header: "Cashier", cell: (sale) => <span className="text-sm">{sale.cashier}</span> },
  {
    header: "Items",
    align: "right",
    cell: (sale) => sale.lines.reduce((s, l) => s + l.qty, 0),
  },
  { header: "Payment", cell: (sale) => <span className="text-sm">{sale.method}</span> },
  {
    header: "Total",
    align: "right",
    cell: (sale) => <span className="font-medium">{formatRs(sale.total)}</span>,
  },
];

const returnColumns: Column<ReturnRecord>[] = [
  { header: "Date", cell: (r) => formatDate(r.date) },
  {
    header: "Original order",
    cell: (r) => <span className="text-sm text-muted-foreground">{r.originalNumber}</span>,
  },
  { header: "Amount", align: "right", cell: (r) => formatRs(Math.abs(r.difference)) },
  { header: "Processed by", cell: (r) => <span className="text-sm">{r.processedBy}</span> },
  {
    header: "Type",
    cell: (r) => <StatusPill status={r.kind === "return" ? "returned" : "exchanged"} />,
  },
];
