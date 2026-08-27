import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Info, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PosHeader } from "@/components/pos/PosHeader";
import { usePos, orderTotals, type Order } from "@/lib/pos-context";
import { formatRs } from "@/lib/pos-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "Orders — Velora POS" },
      { name: "description", content: "Review today's orders and their statuses." },
      { property: "og:title", content: "Orders — Velora POS" },
      { property: "og:description", content: "Review today's orders and their statuses." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Orders,
});

const statusFilters = [
  "All",
  "ongoing",
  "payment",
  "paid",
  "cancelled",
  "returned",
  "exchanged",
] as const;

function Orders() {
  const { orders, deleteOrder,  productList, categoryList } = usePos();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("All");
  const [selected, setSelected] = useState<Order | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Order | null>(null);

  const filtered = useMemo(() => {
    let list = orders;
    if (filter !== "All") list = list.filter((o) => o.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (o) =>
          o.number.toLowerCase().includes(q) ||
          o.receipt.toLowerCase().includes(q) ||
          o.time.includes(q),
      );
    }
    return list.sort((a, b) => b.time.localeCompare(a.time));
  }, [orders, filter, search]);

  const handleDelete = (o: Order) => {
    deleteOrder(o.id);
    setConfirmDelete(null);
    setSelected(null);
    toast.success("Order deleted");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PosHeader tab="orders" />
      <main className="mx-auto w-full max-w-5xl p-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search orders..."
              className="h-11 pl-9"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {statusFilters.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "min-h-11 shrink-0 rounded-full border border-border px-4 text-sm font-medium capitalize",
                  filter === f ? "bg-primary text-primary-foreground" : "bg-card",
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-soft">
          <div className="hidden grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 border-b border-border px-4 py-2 text-sm font-medium text-muted-foreground sm:grid">
            <span>Order</span>
            <span>Receipt</span>
            <span>Time</span>
            <span>Total</span>
            <span>Status</span>
          </div>
          {filtered.map((o) => {
            const { total } = orderTotals(o, 0);
            return (
              <div
                key={o.id}
                className="grid grid-cols-1 items-center gap-3 border-b border-border px-4 py-3 last:border-0 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]"
              >
                <span className="font-medium">{o.number}</span>
                <span className="text-sm text-muted-foreground">{o.receipt}</span>
                <span className="text-sm text-muted-foreground">{o.time}</span>
                <span className="font-medium">{formatRs(total)}</span>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium capitalize",
                      statusStyle(o.status),
                    )}
                  >
                    {o.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelected(o)}
                    className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"
                    aria-label="Order details"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(o)}
                    className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Delete order"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground">No orders found.</p>
          )}
        </div>
      </main>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Order {selected?.number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Receipt</span>
              <span>{selected?.receipt}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Time</span>
              <span>{selected?.time}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="capitalize">{selected?.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Items</span>
              <span>{selected?.lines.reduce((s, l) => s + l.qty, 0)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span>
                {selected
                  ? formatRs(
                      orderTotals(selected, 0, {
                        products: productList,
                        categories: categoryList,
                      }).total,
                    )
                  : "Rs. 0.00"}
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete order?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently remove order {confirmDelete?.number}.
          </p>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              className="h-11"
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
            >
              Delete
            </Button>
            <Button variant="secondary" className="h-11" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function statusStyle(status: string) {
  switch (status) {
    case "paid":
      return "bg-success-soft text-success-foreground";
    case "ongoing":
      return "bg-info/20 text-info-foreground";
    case "payment":
      return "bg-warning/40 text-foreground";
    case "cancelled":
      return "bg-destructive/20 text-destructive-foreground";
    case "returned":
      return "bg-sky text-cat-foreground";
    case "exchanged":
      return "bg-sand text-cat-foreground";
    default:
      return "bg-muted text-foreground";
  }
}
