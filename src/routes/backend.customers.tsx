import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BackendLayout } from "@/components/backend/backend-layout";
import { DataCard, DetailDrawer, Field } from "@/components/backend/backend-ui";
import { CreatePartnerModal } from "@/components/pos/CustomerModals";
import { usePos } from "@/lib/pos-context";
import { formatRs, type Customer } from "@/lib/pos-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/backend/customers")({
  head: () => ({
    meta: [
      { title: "Customers — Velora back office" },
      { name: "description", content: "Customer records, order history and account ledgers." },
      { property: "og:title", content: "Customers — Velora back office" },
      { property: "og:description", content: "Customer records, order history and account ledgers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CustomersPage,
});

function CustomersPage() {
  const { customers, orders } = usePos();
  const [selected, setSelected] = useState<Customer | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const balanceFor = (index: number) => [0, -4200, 1500, -18750][index % 4] ?? 0;

  return (
    <BackendLayout
      title="Customers"
      actions={<Button className="h-11" onClick={() => setCreateOpen(true)}>New customer</Button>}
    >
      <DataCard>
        <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-3 border-b border-border px-4 py-2 text-sm font-medium text-muted-foreground md:grid">
          <span>Name</span>
          <span>Phone</span>
          <span>Orders</span>
          <span>Lifetime spend</span>
          <span>Account balance</span>
        </div>
        {customers.map((c, index) => {
          const customerOrders = orders.filter((o) => o.customerId === c.id);
          const spend = customerOrders.reduce(
            (sum, o) => sum + o.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0),
            0,
          );
          const balance = balanceFor(index);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelected(c)}
              className="grid w-full grid-cols-1 items-center gap-3 border-b border-border px-4 py-3 text-left last:border-0 hover:bg-muted md:grid-cols-[2fr_1fr_1fr_1fr_1fr]"
            >
              <span className="font-medium">{c.name}</span>
              <span className="text-sm text-muted-foreground">{c.phone ?? "—"}</span>
              <span>{customerOrders.length}</span>
              <span>{formatRs(spend)}</span>
              <span className={cn("font-medium", balance < 0 ? "text-destructive" : "text-success")}>
                {formatRs(Math.abs(balance))}
              </span>
            </button>
          );
        })}
      </DataCard>

      <DetailDrawer
        open={!!selected}
        onOpenChange={() => setSelected(null)}
        title={selected?.name ?? ""}
        description="Contact details, orders and account ledger."
      >
        <DataCard className="space-y-2 p-4">
          <Field label="Email" value={selected?.email ?? "—"} />
          <Field label="Phone" value={selected?.phone ?? "—"} />
          <Field label="Location" value={selected?.location ?? "—"} />
          <Field label="Company" value={selected?.company ?? "—"} />
        </DataCard>
        <DataCard className="p-4">
          <p className="mb-2 text-sm font-medium">Account ledger</p>
          {[
            { date: "01/08/2026", description: "Opening balance", amount: 0 },
            { date: "09/08/2026", description: "Invoice RCP/1000", amount: -12500 },
            { date: "14/08/2026", description: "Cash received", amount: 8000 },
          ].map((row) => (
            <div key={row.date} className="flex justify-between border-b border-border py-2 text-sm last:border-0">
              <span className="text-muted-foreground">
                {row.date} · {row.description}
              </span>
              <span>{formatRs(row.amount)}</span>
            </div>
          ))}
        </DataCard>
      </DetailDrawer>

      <CreatePartnerModal open={createOpen} onOpenChange={setCreateOpen} />
    </BackendLayout>
  );
}
