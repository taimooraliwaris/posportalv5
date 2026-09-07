import { createFileRoute, Link } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Plus, Receipt, ShoppingCart } from "lucide-react";
import { BackendLayout } from "@/components/backend/backend-layout";
import { DataCard, StatCard } from "@/components/backend/backend-ui";
import { formatDate } from "@/lib/backend-data";
import { formatRs } from "@/lib/pos-data";
import { useHydrated } from "@/lib/use-hydrated";
import { usePos } from "@/lib/pos-context";
import { usePricing } from "@/lib/use-pricing";
import { useRealtimeRefresh } from "@/lib/use-realtime-refresh";

export const Route = createFileRoute("/backend/")({
  head: () => ({
    meta: [
      { title: "Back office dashboard — Velora POS" },
      { name: "description", content: "Live sales, stock alerts and trends for Velora Mart." },
      { property: "og:title", content: "Back office dashboard — Velora POS" },
      {
        property: "og:description",
        content: "Live sales, stock alerts and trends for Velora Mart.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

const dayKey = (value: string | undefined) => (value ? value.slice(0, 10) : "");

function Dashboard() {
  const { productList, orders, returns } = usePos();
  const { totalsFor } = usePricing();
  const hydrated = useHydrated();
  useRealtimeRefresh();

  if (!hydrated) return <BackendLayout title="Dashboard">{null}</BackendLayout>;

  const todayKey = new Date().toISOString().slice(0, 10);

  /* Completed sales are the single source of truth for every figure below. */
  const settled = orders.filter((o) => o.status === "paid" || o.status === "exchanged");

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

  const netForDay = (day: string) => {
    const sales = settled
      .filter((o) => dayKey(o.date) === day)
      .reduce((sum, o) => sum + totalsFor(o).total, 0);
    const refunds = returns
      .filter((r) => dayKey(r.date) === day)
      .reduce((sum, r) => sum + Math.max(0, r.refundAmount), 0);
    return sales - refunds;
  };

  const chartData = last7.map((day) => ({
    day: formatDate(day).slice(0, 5),
    sales: Math.round(netForDay(day) * 100) / 100,
  }));

  const today = netForDay(todayKey);
  const yesterday = netForDay(last7[5] ?? "");
  const trend = yesterday ? ((today - yesterday) / yesterday) * 100 : 0;

  const todayOrders = settled.filter((o) => dayKey(o.date) === todayKey);
  const ordersTodayCount = todayOrders.length;
  const avgBasket = ordersTodayCount
    ? todayOrders.reduce((sum, o) => sum + totalsFor(o).total, 0) / ordersTodayCount
    : 0;

  const lowStock = productList.filter((p) => Number(p.stock_qty ?? 0) <= 5).length;

  /* Net units and revenue per product, returns deducted. */
  const perProduct = new Map<string, { units: number; revenue: number }>();
  const bump = (productId: string, units: number, revenue: number) => {
    const entry = perProduct.get(productId) ?? { units: 0, revenue: 0 };
    entry.units += units;
    entry.revenue += revenue;
    perProduct.set(productId, entry);
  };

  for (const order of settled) {
    for (const line of order.lines) {
      bump(line.productId, line.qty, line.qty * line.unitPrice * (1 - (line.discount || 0) / 100));
    }
  }
  for (const record of returns) {
    for (const line of record.lines ?? []) {
      bump(line.productId, -line.qty, -(line.qty * (line.unitPrice ?? 0)));
    }
  }

  const top = [...perProduct.entries()]
    .filter(([, v]) => v.units > 0)
    .sort((a, b) => b[1].units - a[1].units)
    .slice(0, 5)
    .map(([id, v]) => ({ name: productList.find((p) => p.id === id)?.name ?? id, ...v }));

  return (
    <BackendLayout title="Dashboard">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today's sales" value={formatRs(today)} trend={trend} />
        <StatCard label="Orders today" value={String(ordersTodayCount)} hint="Completed sales" />
        <StatCard label="Average basket" value={formatRs(avgBasket)} hint="Today" />
        <StatCard label="Items low on stock" value={String(lowStock)} hint="5 or fewer left" />
      </div>

      <DataCard className="mt-4 p-4">
        <p className="mb-3 font-medium">Last 7 days</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip formatter={(v: number) => formatRs(v)} />
              <Bar dataKey="sales" fill="var(--primary)" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </DataCard>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <DataCard className="p-4">
          <p className="mb-3 font-medium">Top selling products</p>
          {top.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">No completed sales yet.</p>
          ) : (
            top.map((t) => (
              <div
                key={t.name}
                className="flex justify-between border-b border-border py-2 text-sm last:border-0"
              >
                <span>{t.name}</span>
                <span className="text-muted-foreground">
                  {t.units} units · {formatRs(t.revenue)}
                </span>
              </div>
            ))
          )}
        </DataCard>
        <DataCard className="grid gap-2 p-4 sm:grid-cols-3">
          <QuickTile to="/backend/products" icon={<Plus className="h-5 w-5" />} label="Add product" />
          <QuickTile
            to="/backend/purchases"
            icon={<ShoppingCart className="h-5 w-5" />}
            label="New purchase order"
          />
          <QuickTile to="/z-report" icon={<Receipt className="h-5 w-5" />} label="Today's Z Report" />
        </DataCard>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Live figures for {formatDate(todayKey)}</p>
    </BackendLayout>
  );
}

function QuickTile({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to as never}
      className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-3 text-center text-sm font-medium hover:bg-muted"
    >
      {icon}
      {label}
    </Link>
  );
}
