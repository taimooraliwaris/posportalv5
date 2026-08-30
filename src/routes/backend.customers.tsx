import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BackendLayout } from "@/components/backend/backend-layout";
import { DataCard, DetailDrawer } from "@/components/backend/backend-ui";
import { DataTable, type Column } from "@/components/backend/data-table";
import { CreatePartnerModal } from "@/components/pos/CustomerModals";
import { usePos } from "@/lib/pos-context";
import { formatRs, type Customer } from "@/lib/pos-data";
import { cn } from "@/lib/utils";
import { Plus, User, Phone, Mail, MapPin, Building, Briefcase, CreditCard, History, Calculator, Edit, Trash2 } from "lucide-react";

import { useScanTarget } from "@/lib/scan-mode-context";
import { toast } from "sonner";
import { Search } from "lucide-react";

export const Route = createFileRoute("/backend/customers")({
  component: CustomersPage,
});

function CustomersPage() {
  const { customers, orders, deleteCustomer } = usePos();
  const [selected, setSelected] = useState<Customer | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [query, setQuery] = useState("");

  // Barcode / Loyalty card / Phone scanner support on Customers Page
  useScanTarget("customers", ({ code }) => {
    const trimmed = code.trim().toLowerCase();
    const match = customers.find(
      (c) =>
        c.id.toLowerCase() === trimmed ||
        c.phone?.toLowerCase() === trimmed ||
        c.name.toLowerCase().includes(trimmed) ||
        c.email?.toLowerCase() === trimmed,
    );
    if (match) {
      setSelected(match);
      setQuery(match.name);
      toast.success(`Customer found: ${match.name}`);
      return "added";
    }
    toast.error(`No customer found with member ID / phone ${code}`);
    return "unknown";
  });

  const filteredCustomers = customers.filter((c) => {
    if (!query) return true;
    const lower = query.toLowerCase();
    return (
      c.name.toLowerCase().includes(lower) ||
      c.phone?.toLowerCase().includes(lower) ||
      c.email?.toLowerCase().includes(lower) ||
      c.id.toLowerCase().includes(lower)
    );
  });

  // Mock ledger balance based on string length to remain deterministic
  const balanceFor = (name: string) => [0, -4200, 1500, -18750][name.length % 4] ?? 0;

  return (
    <BackendLayout title="Customers">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-[15px] font-medium text-foreground">Customer Directory</h2>
          <p className="text-[11px] text-muted-foreground">Manage client relationships, ledgers, and order histories</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search or scan card/phone..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-full border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
            />
          </div>
          <Button className="h-9 px-4 text-xs gap-2 rounded-full shadow-sm shrink-0" onClick={() => setCreateOpen(true)}>
            <Plus className="w-3.5 h-3.5" />
            Add Customer
          </Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <DataTable
          columns={customerColumns(
            (id) => orders.filter((o) => o.customerId === id),
            balanceFor,
          )}
          rows={filteredCustomers}
          getKey={(c) => c.id}
          onRowClick={setSelected}
          empty="No customers found."
        />
      </div>

      <DetailDrawer
        open={!!selected}
        onOpenChange={(isOpen) => !isOpen && setSelected(null)}
        title={selected?.name ?? ""}
      >
        {selected && (
          <div className="space-y-6 mt-4 pb-12">
            <div className="flex gap-2 mb-2">
              <Button variant="outline" size="sm" onClick={() => { setEditCustomer(selected); setCreateOpen(true); }}>
                <Edit className="w-3.5 h-3.5 mr-2" />
                Edit Profile
              </Button>
              <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 border-destructive/20" onClick={() => {
                if (confirm("Are you sure you want to delete this customer?")) {
                  deleteCustomer(selected.id);
                  setSelected(null);
                }
              }}>
                <Trash2 className="w-3.5 h-3.5 mr-2" />
                Delete
              </Button>
            </div>
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/40 p-4 rounded-xl border border-border">
                <div className="text-muted-foreground text-xs mb-1 flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> Total Orders</div>
                <div className="font-semibold text-lg">{orders.filter(o => o.customerId === selected.id).length}</div>
              </div>
              <div className="bg-primary/5 p-4 rounded-xl border border-primary/20">
                <div className="text-primary/70 text-xs mb-1 flex items-center gap-1.5"><Calculator className="w-3.5 h-3.5" /> Lifetime Value</div>
                <div className="font-mono font-bold text-lg text-primary">
                  {formatRs(
                    orders.filter(o => o.customerId === selected.id).reduce((sum, o) => sum + o.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0), 0)
                  )}
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <DataCard className="p-0 overflow-hidden shadow-sm">
              <div className="bg-muted/40 px-4 py-2 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Contact Info
              </div>
              <div className="divide-y divide-border">
                <div className="flex items-center gap-3 p-3">
                  <Mail className="w-4 h-4 text-muted-foreground/70" />
                  <div className="flex-1 text-sm">{selected.email || <span className="text-muted-foreground italic">No email provided</span>}</div>
                </div>
                <div className="flex items-center gap-3 p-3">
                  <Phone className="w-4 h-4 text-muted-foreground/70" />
                  <div className="flex-1 text-sm">{selected.phone || <span className="text-muted-foreground italic">No phone provided</span>}</div>
                </div>
                <div className="flex items-center gap-3 p-3">
                  <MapPin className="w-4 h-4 text-muted-foreground/70" />
                  <div className="flex-1 text-sm">{selected.location || <span className="text-muted-foreground italic">No location provided</span>}</div>
                </div>
                {selected.company && (
                  <div className="flex items-center gap-3 p-3 bg-muted/20">
                    <Building className="w-4 h-4 text-muted-foreground/70" />
                    <div className="flex-1 text-sm font-medium">{selected.company}</div>
                  </div>
                )}
              </div>
            </DataCard>

            {/* Ledger */}
            <DataCard className="p-0 overflow-hidden shadow-sm">
              <div className="bg-muted/40 px-4 py-2 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" />
                  Account Ledger
                </div>
                <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold", balanceFor(selected.name) < 0 ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success")}>
                  {balanceFor(selected.name) < 0 ? "OWES BALANCE" : "CLEAR"}
                </span>
              </div>
              <div className="divide-y divide-border">
                {[
                  { date: "01/08/2026", description: "Opening balance", amount: 0 },
                  { date: "09/08/2026", description: "Invoice RCP/1000", amount: -12500 },
                  { date: "14/08/2026", description: "Cash received", amount: 8000 },
                ].map((row, i) => (
                  <div key={i} className="flex justify-between items-center p-3 text-sm hover:bg-muted/30 transition-colors">
                    <div>
                      <div className="font-medium">{row.description}</div>
                      <div className="text-xs text-muted-foreground">{row.date}</div>
                    </div>
                    <div className={cn("font-mono font-medium", row.amount < 0 ? "text-destructive" : row.amount > 0 ? "text-success" : "text-muted-foreground")}>
                      {row.amount > 0 ? "+" : ""}{formatRs(row.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </DataCard>

            {/* Recent Orders Timeline */}
            <DataCard className="p-0 overflow-hidden shadow-sm">
              <div className="bg-muted/40 px-4 py-2 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" />
                Recent Orders
              </div>
              <div className="p-4">
                {orders.filter(o => o.customerId === selected.id).length > 0 ? (
                  <div className="space-y-4">
                    {orders.filter(o => o.customerId === selected.id).slice(0, 5).map(o => (
                      <div key={o.id} className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-sm">Order #{o.number}</div>
                          <div className="text-xs text-muted-foreground">Processed {o.date ? new Date(o.date).toLocaleDateString() : o.time}</div>
                        </div>
                        <div className="font-mono text-sm font-semibold">
                          {formatRs(o.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    No orders placed yet.
                  </div>
                )}
              </div>
            </DataCard>
          </div>
        )}
      </DetailDrawer>

      <CreatePartnerModal
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setEditCustomer(null);
        }}
        onCreated={() => {
          setCreateOpen(false);
          setEditCustomer(null);
        }}
        editCustomer={editCustomer || undefined}
      />
    </BackendLayout>
  );
}

function customerColumns(
  ordersFor: (customerId: string) => { lines: { qty: number; unitPrice: number }[] }[],
  balanceFor: (name: string) => number,
): Column<Customer>[] {
  return [
    { 
      header: "Contact Info", 
      width: "3fr", 
      cell: (c) => (
        <div className="flex flex-col">
          <span className="font-semibold text-sm text-foreground">{c.name}</span>
          {(c.phone || c.email) && (
            <span className="text-xs text-muted-foreground mt-0.5">{c.phone || c.email}</span>
          )}
        </div>
      ) 
    },
    { 
      header: "Total Orders", 
      align: "right", 
      cell: (c) => <span className="text-sm font-medium">{ordersFor(c.id).length}</span> 
    },
    {
      header: "Lifetime Value",
      align: "right",
      cell: (c) => (
        <span className="font-mono text-sm">
          {formatRs(ordersFor(c.id).reduce((sum, o) => sum + o.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0), 0))}
        </span>
      ),
    },
    {
      header: "Outstanding Balance",
      align: "right",
      cell: (c) => {
        const balance = balanceFor(c.name);
        return (
          <span className={cn("font-mono font-medium text-sm px-2 py-1 rounded-md bg-muted/30", balance < 0 ? "text-destructive" : "text-success")}>
            {formatRs(Math.abs(balance))}
          </span>
        );
      },
    },
  ];
}
