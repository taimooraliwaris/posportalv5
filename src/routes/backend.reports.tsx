import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BackendLayout } from "@/components/backend/backend-layout";
import { DataCard, Field, StatCard } from "@/components/backend/backend-ui";
import { useBackend, useStore } from "@/lib/backend-context";
import { formatDate, toDateKey, type SessionRecord } from "@/lib/backend-data";
import { categories, formatRs, products, TAX_RATE } from "@/lib/pos-data";
import { useHydrated } from "@/lib/use-hydrated";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/backend/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Velora back office" },
      {
        name: "description",
        content: "Profit and loss, sales analytics and a calendar of X and Z reports.",
      },
      { property: "og:title", content: "Reports — Velora back office" },
      {
        property: "og:description",
        content: "Profit and loss, sales analytics and a calendar of X and Z reports.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportsPage,
});

const chartColors = ["var(--primary)", "var(--success)", "var(--info)", "var(--warning)"];

function ReportsPage() {
  const store = useStore();
  const hydrated = useHydrated();
  const { sessions, sales, stock } = useBackend();
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<SessionRecord | null>(null);

  const month = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);

  if (!hydrated) return <BackendLayout title="Reports">{null}</BackendLayout>;

  const costFor = (productId: string) => stock.find((s) => s.productId === productId)?.cost ?? 0;

  const revenue = sales.reduce((sum, s) => sum + s.total / (1 + TAX_RATE), 0);
  const cogs = sales.reduce(
    (sum, s) => sum + s.lines.reduce((ls, l) => ls + l.qty * costFor(l.productId), 0),
    0,
  );
  const grossProfit = revenue - cogs;

  const byCategory = categories.map((c) => {
    const catRevenue = sales.reduce(
      (sum, s) =>
        sum +
        s.lines
          .filter((l) => products.find((p) => p.id === l.productId)?.category === c.id)
          .reduce((ls, l) => ls + l.qty * l.unitPrice, 0),
      0,
    );
    const catCost = sales.reduce(
      (sum, s) =>
        sum +
        s.lines
          .filter((l) => products.find((p) => p.id === l.productId)?.category === c.id)
          .reduce((ls, l) => ls + l.qty * costFor(l.productId), 0),
      0,
    );
    return { name: c.name, revenue: Math.round(catRevenue), cost: Math.round(catCost) };
  });

  const byMethod = (["Cash", "Card", "Customer Account"] as const).map((m, i) => ({
    name: m,
    value: Math.round(sales.filter((s) => s.method === m).reduce((sum, s) => sum + s.total, 0)),
    fill: chartColors[i]!,
  }));

  const bestSellers = [...products]
    .map((p) => ({
      name: p.name,
      units: sales.reduce(
        (sum, s) =>
          sum + s.lines.filter((l) => l.productId === p.id).reduce((ls, l) => ls + l.qty, 0),
        0,
      ),
    }))
    .sort((a, b) => b.units - a.units)
    .slice(0, 6);

  const monthKeyPrefix = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
  const monthSessions = sessions.filter((s) => s.date.startsWith(monthKeyPrefix));
  const monthSales = monthSessions.reduce((sum, s) => sum + s.totalSales, 0);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const maxDaySales = Math.max(
    1,
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const key = `${monthKeyPrefix}-${String(i + 1).padStart(2, "0")}`;
      return monthSessions.filter((s) => s.date === key).reduce((sum, s) => sum + s.totalSales, 0);
    }),
  );

  const daySessions = selectedDay ? sessions.filter((s) => s.date === selectedDay) : [];

  return (
    <BackendLayout title="Reports">
      <Tabs defaultValue="pl">
        <TabsList>
          <TabsTrigger value="pl">Profit &amp; loss</TabsTrigger>
          <TabsTrigger value="analytics">Sales analytics</TabsTrigger>
          <TabsTrigger value="zreports">X &amp; Z reports</TabsTrigger>
        </TabsList>

        <TabsContent value="pl">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Revenue" value={formatRs(revenue)} />
            <StatCard label="Cost of goods sold" value={formatRs(cogs)} />
            <StatCard label="Gross profit" value={formatRs(grossProfit)} />
            <StatCard
              label="Gross margin"
              value={`${revenue ? ((grossProfit / revenue) * 100).toFixed(1) : "0.0"}%`}
            />
          </div>
          <DataCard className="mt-4 p-4">
            <p className="mb-3 font-medium">Revenue and cost by category</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCategory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip formatter={(v: number) => formatRs(v)} />
                  <Bar dataKey="revenue" fill="var(--primary)" radius={4} />
                  <Bar dataKey="cost" fill="var(--info)" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </DataCard>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid gap-4 lg:grid-cols-2">
            <DataCard className="p-4">
              <p className="mb-3 font-medium">Best selling products</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bestSellers} layout="vertical">
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                      horizontal={false}
                    />
                    <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis dataKey="name" type="category" width={110} fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="units" fill="var(--primary)" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </DataCard>
            <DataCard className="p-4">
              <p className="mb-3 font-medium">Sales by payment method</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={byMethod}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={90}
                    >
                      {byMethod.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatRs(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </DataCard>
          </div>
        </TabsContent>

        <TabsContent value="zreports">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Total sales this month" value={formatRs(monthSales)} />
            <StatCard label="Sessions closed" value={String(monthSessions.length)} />
            <StatCard
              label="Average per session"
              value={formatRs(monthSessions.length ? monthSales / monthSessions.length : 0)}
            />
          </div>

          <DataCard className="mt-4 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => setMonthOffset((v) => v - 1)}
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-medium">
                  {month.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
                </span>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => setMonthOffset((v) => v + 1)}
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="secondary"
                className="h-10"
                onClick={() => {
                  setMonthOffset(0);
                  setSelectedDay(toDateKey(new Date()));
                }}
              >
                Jump to today
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: daysInMonth }, (_, i) => {
                const key = `${monthKeyPrefix}-${String(i + 1).padStart(2, "0")}`;
                const dayS = monthSessions.filter((s) => s.date === key);
                const total = dayS.reduce((sum, s) => sum + s.totalSales, 0);
                const intensity = total / maxDaySales;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDay(key)}
                    className={cn(
                      "min-h-20 rounded-md border border-border p-2 text-left text-xs transition-colors",
                      selectedDay === key && "ring-2 ring-primary",
                    )}
                    style={{
                      backgroundColor:
                        total > 0
                          ? `color-mix(in oklab, var(--primary) ${Math.round(intensity * 70)}%, var(--card))`
                          : undefined,
                    }}
                  >
                    <span className="font-medium">{i + 1}</span>
                    {total > 0 && (
                      <span className="mt-1 block text-[11px]">
                        {formatRs(total)}
                        <span className="block text-muted-foreground">
                          {dayS.length} session{dayS.length > 1 ? "s" : ""}
                        </span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </DataCard>

          {selectedDay && (
            <DataCard className="mt-4">
              <p className="border-b border-border px-4 py-2 font-medium">
                Sessions on {formatDate(selectedDay)}
              </p>
              {daySessions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedSession(s)}
                  className="grid w-full grid-cols-1 items-center gap-3 border-b border-border px-4 py-3 text-left last:border-0 hover:bg-muted md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]"
                >
                  <span className="font-medium">{s.id}</span>
                  <span className="text-sm">{s.cashier}</span>
                  <span className="text-sm text-muted-foreground">
                    {s.openedAt} — {s.closedAt}
                  </span>
                  <span>{formatRs(s.totalSales)}</span>
                  <span className={s.variance === 0 ? "text-success" : "text-destructive"}>
                    Variance {formatRs(s.variance)}
                  </span>
                </button>
              ))}
              {daySessions.length === 0 && (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  No sessions were closed on this day.
                </p>
              )}
            </DataCard>
          )}

          {selectedSession && (
            <DataCard className="mt-4 max-w-md space-y-2 p-4 text-sm">
              <p className="text-center font-semibold">{store.name} — Z Report</p>
              <Field label="Session" value={selectedSession.id} />
              <Field label="Cashier" value={selectedSession.cashier} />
              <Field label="Opening float" value={formatRs(selectedSession.openingFloat)} />
              <div className="border-t border-dashed border-border pt-2">
                <p className="font-medium">SOLD</p>
                <Field label="Orders" value={selectedSession.orderCount} />
                <Field
                  label="Net sales"
                  value={formatRs(selectedSession.totalSales / (1 + TAX_RATE))}
                />
              </div>
              <div className="border-t border-dashed border-border pt-2">
                <p className="font-medium">PAYMENTS</p>
                <Field label="Cash" value={formatRs(selectedSession.cashSales)} />
                <Field label="Card" value={formatRs(selectedSession.cardSales)} />
              </div>
              <div className="border-t border-dashed border-border pt-2">
                <p className="font-medium">TAXES</p>
                <Field
                  label="GST 18%"
                  value={formatRs(
                    selectedSession.totalSales - selectedSession.totalSales / (1 + TAX_RATE),
                  )}
                />
              </div>
              <div className="border-t border-dashed border-border pt-2">
                <Field label="TOTAL" value={formatRs(selectedSession.totalSales)} />
                <Field label="Cash variance" value={formatRs(selectedSession.variance)} />
              </div>
              <Button
                variant="secondary"
                className="h-11 w-full"
                onClick={() => toast.success("Report sent to printer")}
              >
                <Printer className="h-4 w-4" /> Print / export
              </Button>
            </DataCard>
          )}
        </TabsContent>
      </Tabs>
    </BackendLayout>
  );
}
