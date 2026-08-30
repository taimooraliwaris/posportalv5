import { createFileRoute, Link } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Plus, Receipt, ShoppingCart } from "lucide-react";
import { BackendLayout } from "@/components/backend/backend-layout";
import { DataCard, StatCard } from "@/components/backend/backend-ui";
import { useBackend } from "@/lib/backend-context";
import { formatDate, stockStatus, toDateKey } from "@/lib/backend-data";
import { formatRs, products } from "@/lib/pos-data";
import { useHydrated } from "@/lib/use-hydrated";
import { usePos } from "@/lib/pos-context";


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
  const { productList, orders } = usePos();
  const hydrated = useHydrated();
  const { sessions, sales } = useBackend();

  if (!hydrated) return <BackendLayout title="Dashboard">{null}</BackendLayout>;

  const todayKey = new Date().toISOString().slice(0, 10);
  const days = [...new Set([...sessions.map((s) => s.date), todayKey])].sort().slice(-7);
  
  const chartData = days.map((day) => {
    const daySessions = sessions.filter((s) => s.date === day);
    const daySales = sales.filter((s) => s.date === day);
    const sessionTotal = daySessions.reduce((sum, s) => sum + s.totalSales, 0);
    const salesTotal = daySales.reduce((sum, s) => sum + s.total, 0);
    const total = daySessions.length > 0 ? sessionTotal : salesTotal;
    return {
      day: formatDate(day).slice(0, 5),
      sales: Math.round(total * 100) / 100,
    };
  });

  const todaySalesRecords = sales.filter((s) => s.date === todayKey);
  const todaySessions = sessions.filter((s) => s.date === todayKey);

  // Net sales for today: if active sessions exist use session total, otherwise sum sales records
  const today = todaySessions.length > 0
    ? todaySessions.reduce((sum, s) => sum + s.totalSales, 0)
    : todaySalesRecords.reduce((sum, s) => sum + s.total, 0);

  const yesterdayKey = days.length > 1 ? days.at(-2) : undefined;
  const yesterdaySessions = yesterdayKey ? sessions.filter((s) => s.date === yesterdayKey) : [];
  const yesterday = yesterdaySessions.reduce((sum, s) => sum + s.totalSales, 0);
  const trend = yesterday ? ((today - yesterday) / yesterday) * 100 : 0;

  // Positive sales orders count
  const salesOrdersToday = todaySalesRecords.filter((s) => s.total > 0);
  const ordersTodayCount = todaySessions.length > 0
    ? todaySessions.reduce((sum, s) => sum + (s.orderCount || 0), 0)
    : salesOrdersToday.length;

  const avgBasket = ordersTodayCount > 0 ? Math.max(0, today / ordersTodayCount) : 0;

  // Real product catalog low/out-of-stock count
  const lowStock = productList.filter((p) => Number(p.stock_qty ?? 0) <= 5).length;

  // Compute Net units sold and net revenue per product (net of returns)
  const unitsByProduct = new Map<string, { units: number; revenue: number }>();
  
  // 1. Process from completed live orders
  const completedOrders = orders.filter((o) => o.status === "paid" || o.status === "exchanged");
  if (completedOrders.length > 0) {
    completedOrders.forEach((order) => {
      const isReturn = order.number.startsWith("RET-") || (order.payments && order.payments.some((p) => p.amount < 0));
      const multiplier = isReturn ? -1 : 1;
      order.lines.forEach((line) => {
        const entry = unitsByProduct.get(line.productId) ?? { units: 0, revenue: 0 };
        const lineRevenue = line.qty * line.unitPrice * (1 - (line.discount || 0) / 100);
        entry.units += line.qty * multiplier;
        entry.revenue += lineRevenue * multiplier;
        unitsByProduct.set(line.productId, entry);
      });
    });
  } else {
    // Fallback to sales table if no local orders
    sales.forEach((sale) => {
      const isReturn = sale.number.startsWith("RET-") || sale.total < 0;
      const multiplier = isReturn ? -1 : 1;
      sale.lines.forEach((line) => {
        const entry = unitsByProduct.get(line.productId) ?? { units: 0, revenue: 0 };
        entry.units += line.qty * multiplier;
        entry.revenue += line.qty * line.unitPrice * multiplier;
        unitsByProduct.set(line.productId, entry);
      });
    });
  }

  const top = [...unitsByProduct.entries()]
    .filter(([_, v]) => v.units > 0)
    .sort((a, b) => b[1].units - a[1].units)
    .slice(0, 5)
    .map(([id, v]) => ({ name: productList.find((p) => p.id === id)?.name ?? id, ...v }));

  return (
    <BackendLayout title="Dashboard">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today's sales" value={formatRs(today)} trend={trend} />
        <StatCard label="Orders today" value={String(ordersTodayCount)} trend={trend / 2} />
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
        Latest trading day shown: {formatDate(todayKey)}
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
