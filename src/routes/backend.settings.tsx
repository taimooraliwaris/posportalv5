import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BackendLayout } from "@/components/backend/backend-layout";
import { DataCard, StatusPill } from "@/components/backend/backend-ui";
import { DataTable, type Column } from "@/components/backend/data-table";
import { SecurityTab } from "@/components/backend/SecurityTab";
import { useBackend } from "@/lib/backend-context";
import { formatDate, rolePermissions, type SessionRecord, type StaffUser } from "@/lib/backend-data";
import { formatRs } from "@/lib/pos-data";
import { useHydrated } from "@/lib/use-hydrated";
import {
  getPrinterSettings,
  savePrinterSettings,
  printOrderReceipt,
  type PrinterProfile,
  type PrinterSettings,
} from "@/lib/print-service";
import { Check, FileText, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/backend/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Velora back office" },
      {
        name: "description",
        content: "Staff roles, store details and register session history.",
      },
      { property: "og:title", content: "Settings — Velora back office" },
      {
        property: "og:description",
        content: "Staff roles, store details and register session history.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const hydrated = useHydrated();
  const { staff, storeSettings, updateStoreSettings, sessions } =
    useBackend();


  return (
    <BackendLayout title="Settings">
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users &amp; roles</TabsTrigger>
          <TabsTrigger value="store">Store details</TabsTrigger>
          <TabsTrigger value="printers">Printers &amp; Hardware</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="sessions">Session history</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <DataTable columns={staffColumns} rows={staff} getKey={(u) => u.id} />
        </TabsContent>

        <TabsContent value="store">
          <DataCard className="max-w-xl space-y-3 p-4">
            <div className="space-y-2">
              <Label htmlFor="store-name">Store name</Label>
              <Input
                id="store-name"
                value={storeSettings.name}
                onChange={(e) => updateStoreSettings({ name: e.target.value })}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store-address">Address</Label>
              <Input
                id="store-address"
                value={storeSettings.address}
                onChange={(e) => updateStoreSettings({ address: e.target.value })}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store-phone">Phone</Label>
              <Input
                id="store-phone"
                value={storeSettings.phone}
                onChange={(e) => updateStoreSettings({ phone: e.target.value })}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store-tagline">Tagline</Label>
              <Input
                id="store-tagline"
                value={storeSettings.tagline}
                onChange={(e) => updateStoreSettings({ tagline: e.target.value })}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store-currency">Currency</Label>
              <Input
                id="store-currency"
                value={storeSettings.currency}
                onChange={(e) => updateStoreSettings({ currency: e.target.value })}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store-footer">Receipt footer</Label>
              <Input
                id="store-footer"
                value={storeSettings.receiptFooter}
                onChange={(e) => updateStoreSettings({ receiptFooter: e.target.value })}
                className="h-11"
              />
            </div>
            <Button className="h-11" onClick={() => toast.success("Store details saved")}>
              Save details
            </Button>
          </DataCard>
        </TabsContent>

        <TabsContent value="printers">
          <PrinterSettingsCard />
        </TabsContent>

        <TabsContent value="security">
          <SecurityTab />
        </TabsContent>

        <TabsContent value="sessions">
          {hydrated && (
            <DataTable
              columns={sessionColumns}
              rows={sessions.slice().reverse()}
              getKey={(s) => s.id}
            />
          )}
        </TabsContent>
      </Tabs>
    </BackendLayout>
  );
}

const staffColumns: Column<StaffUser>[] = [
  { header: "Name", width: "1.2fr", cell: (u) => <span className="font-medium">{u.name}</span> },
  {
    header: "Email",
    width: "1.5fr",
    cell: (u) => <span className="text-sm text-muted-foreground">{u.email}</span>,
  },
  { header: "Role", cell: (u) => <span className="text-sm">{u.role}</span> },
  {
    header: "Permissions",
    width: "2fr",
    cell: (u) => <span className="text-sm text-muted-foreground">{rolePermissions[u.role]}</span>,
  },
];



const sessionColumns: Column<SessionRecord>[] = [
  { header: "Date", cell: (s) => formatDate(s.date) },
  { header: "Cashier", cell: (s) => <span className="text-sm">{s.cashier}</span> },
  {
    header: "Hours",
    cell: (s) => (
      <span className="text-sm text-muted-foreground">
        {s.openedAt} — {s.closedAt}
      </span>
    ),
  },
  { header: "Total sales", align: "right", cell: (s) => formatRs(s.totalSales) },
  {
    header: "Variance",
    width: "1.4fr",
    cell: (s) => (
      <span className="flex justify-end">
        <StatusPill
          status={s.variance === 0 ? "healthy" : "low"}
          label={s.variance === 0 ? "Balanced" : `Variance ${formatRs(s.variance)}`}
        />
      </span>
    ),
  },
];

function PrinterSettingsCard() {
  const { storeSettings } = useBackend();
  const [settings, setSettings] = useState<PrinterSettings>(() => getPrinterSettings());

  const handleUpdate = (patch: Partial<PrinterSettings>) => {
    const updated = savePrinterSettings(patch);
    setSettings(updated);
    toast.success("Printer settings saved");
  };

  const handleTestPrint = () => {
    printOrderReceipt(
      {
        id: "test-order-1",
        number: "1001",
        receipt: "RCP/1001",
        date: new Date().toISOString().slice(0, 10),
        time: new Date().toLocaleTimeString(),
        status: "paid",
        cashier: "Test Cashier",
        lines: [
          { id: "tl-1", productId: "p-1", name: "Servis 2.50-17 6PR Tyre", qty: 2, unitPrice: 3200, discount: 0 },
          { id: "tl-2", productId: "p-2", name: "Crown CG-125 Brake Shoe", qty: 1, unitPrice: 850, discount: 5 },
        ],
        payments: [{ id: "tp-1", method: "Cash", amount: 7250 }],
        noteTags: [],
        pricelistId: "pl1",
      },
      { change: 50, cashier: "Test Cashier", profile: settings.defaultProfile, store: storeSettings },
    );
    toast.success("Test receipt sent to printer");
  };

  return (
    <DataCard className="max-w-2xl space-y-5 p-5">
      <div>
        <h3 className="text-base font-bold flex items-center gap-2">
          <Printer className="h-5 w-5 text-primary" /> POS Receipt &amp; Printer Configuration
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure default hardware printer profile, paper dimensions, and automated print options.
        </p>
      </div>

      {/* Profile Picker */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Default Printer Hardware Profile</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              id: "thermal-80",
              title: "Thermal 80mm POS",
              desc: "Standard thermal receipt roll (80mm / 3.15 in). Ideal for all commercial POS counters.",
              badge: "Default",
            },
            {
              id: "thermal-58",
              title: "Thermal 58mm Mini",
              desc: "Compact 58mm roll (2.28 in) for mini desktop & portable Bluetooth thermal printers.",
            },
            {
              id: "standard-a4",
              title: "Standard A4 / Laser",
              desc: "Full page portrait invoice for laser / inkjet office printers.",
            },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleUpdate({ defaultProfile: p.id as PrinterProfile })}
              className={cn(
                "flex flex-col items-start p-3.5 rounded-xl border-2 text-left transition-all",
                settings.defaultProfile === p.id
                  ? "border-primary bg-primary/10 shadow-xs"
                  : "border-border bg-card hover:bg-muted/50",
              )}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-sm text-foreground">{p.title}</span>
                {settings.defaultProfile === p.id && (
                  <Check className="h-4 w-4 text-primary shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{p.desc}</p>
              {p.badge && (
                <span className="mt-2 text-[10px] font-semibold bg-primary/20 text-primary px-2 py-0.5 rounded-md">
                  {p.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Auto-print toggle */}
      <div className="flex items-center justify-between rounded-xl border border-border p-3.5 bg-muted/20">
        <div>
          <div className="text-sm font-semibold text-foreground">Auto-Print Receipt on Checkout</div>
          <div className="text-xs text-muted-foreground">
            Automatically trigger physical print job upon validating payment.
          </div>
        </div>
        <input
          type="checkbox"
          checked={settings.autoPrintOnCheckout}
          onChange={(e) => handleUpdate({ autoPrintOnCheckout: e.target.checked })}
          className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
        />
      </div>


      {/* Test Print Action */}
      <div className="flex items-center gap-3 pt-2 border-t border-border">
        <Button
          type="button"
          className="h-11 font-bold gap-2"
          onClick={handleTestPrint}
        >
          <Printer className="h-4 w-4" /> Run Test Print on {settings.defaultProfile === "thermal-80" ? "80mm POS" : settings.defaultProfile === "thermal-58" ? "58mm Mini" : "A4 Standard"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Sends a sample formatted receipt to verify printer connection and roll margin.
        </p>
      </div>
    </DataCard>
  );
}
