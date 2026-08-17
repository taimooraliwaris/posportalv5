import { createFileRoute, Link } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Plus, Receipt, ShoppingCart } from "lucide-react";
import { BackendLayout } from "@/components/backend/backend-layout";
import { DataCard, StatCard } from "@/components/backend/backend-ui";
import { useBackend } from "@/lib/backend-context";
import { formatDate, stockStatus, toDateKey } from "@/lib/backend-data";
import { formatRs, products } from "@/lib/pos-data";
import { useHydrated } from "@/lib/use-hydrated";

export const Route = createFileRoute("/backend/")({
  head: () => ({
    meta: [
      { title: "Back office dashboard — Velora POS" },
      { name: "description", content: "Daily sales, stock alerts and trends for Velora Mart." },
      { property: "og:title", content: "Back office dashboard — Velora POS" },
      {
        property: "og:description",
        content: "Daily sales, stock alerts and trends for Velora Mart.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const hydrated = useHydrated();
  const { sessions, sales, stock } = useBackend();

  if (!hydrated) return <BackendLayout title="Dashboard">{null}</BackendLayout>;

  const days = [...new Set(sessions.map((s) => s.date))].sort().slice(-7);
  const chartData = days.map((day) => ({
    day: formatDate(day).slice(0, 5),
    sales: Math.round(
      sessions.filter((s) => s.date === day).reduce((sum, s) => sum + s.totalSales, 0),
    ),
  }));
  const today = chartData.at(-1)?.sales ?? 0;
  const yesterday = chartData.at(-2)?.sales ?? 0;
  const trend = yesterday ? ((today - yesterday) / yesterday) * 100 : 0;
  const lastDay = days.at(-1);
  const todaysSales = sales.filter((s) => s.date === lastDay);
  const avgBasket = todaysSales.length ? today / todaysSales.length : 0;
  const lowStock = stock.filter((s) => stockStatus(s) !== "healthy").length;

  const unitsByProduct = new Map<string, { units: number; revenue: number }>();
  sales.forEach((sale) =>
    sale.lines.forEach((line) => {
      const entry = unitsByProduct.get(line.productId) ?? { units: 0, revenue: 0 };
      entry.units += line.qty;
      entry.revenue += line.qty * line.unitPrice;
      unitsByProduct.set(line.productId, entry);
    }),
  );
  const top = [...unitsByProduct.entries()]
    .sort((a, b) => b[1].units - a[1].units)
    .slice(0, 5)
    .map(([id, v]) => ({ name: products.find((p) => p.id === id)?.name ?? id, ...v }));

  return (
    <BackendLayout title="Dashboard">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today's sales" value={formatRs(today)} trend={trend} />
        <StatCard label="Orders today" value={String(todaysSales.length)} trend={trend / 2} />
        <StatCard label="Average basket" value={formatRs(avgBasket)} trend={-1.4} />
        <StatCard label="Items low on stock" value={String(lowStock)} hint="Below reorder point" />
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
          {top.map((t) => (
            <div
              key={t.name}
              className="flex justify-between border-b border-border py-2 text-sm last:border-0"
            >
              <span>{t.name}</span>
              <span className="text-muted-foreground">
                {t.units} units · {formatRs(t.revenue)}
              </span>
            </div>
          ))}
        </DataCard>
        <DataCard className="grid gap-2 p-4 sm:grid-cols-3">
          <QuickTile
            to="/backend/products"
            icon={<Plus className="h-5 w-5" />}
            label="Add product"
          />
          <QuickTile
            to="/backend/purchases"
            icon={<ShoppingCart className="h-5 w-5" />}
            label="New purchase order"
          />
          <QuickTile
            to="/z-report"
            icon={<Receipt className="h-5 w-5" />}
            label="Today's Z Report"
          />
        </DataCard>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Latest trading day shown:{" "}
        {lastDay ? formatDate(lastDay) : formatDate(toDateKey(new Date()))}
      </p>
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
