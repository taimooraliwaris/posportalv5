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
import { formatDate, rolePermissions, type SessionRecord, type StaffUser, type TaxRate } from "@/lib/backend-data";
import { formatRs } from "@/lib/pos-data";
import { useHydrated } from "@/lib/use-hydrated";
import { toast } from "sonner";

export const Route = createFileRoute("/backend/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Velora back office" },
      {
        name: "description",
        content: "Staff roles, tax rates, store details and register session history.",
      },
      { property: "og:title", content: "Settings — Velora back office" },
      {
        property: "og:description",
        content: "Staff roles, tax rates, store details and register session history.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const hydrated = useHydrated();
  const { staff, taxes, saveTax, removeTax, storeSettings, updateStoreSettings, sessions } =
    useBackend();
  const [taxName, setTaxName] = useState("");
  const [taxPct, setTaxPct] = useState("");
  const [taxApplies, setTaxApplies] = useState("");

  return (
    <BackendLayout title="Settings">
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users &amp; roles</TabsTrigger>
          <TabsTrigger value="taxes">Taxes</TabsTrigger>
          <TabsTrigger value="store">Store details</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="sessions">Session history</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <DataTable columns={staffColumns} rows={staff} getKey={(u) => u.id} />
        </TabsContent>

        <TabsContent value="taxes">
          <DataCard className="mb-4 grid gap-3 p-4 sm:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="tax-name">Tax name</Label>
              <Input
                id="tax-name"
                value={taxName}
                onChange={(e) => setTaxName(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax-pct">Percentage</Label>
              <Input
                id="tax-pct"
                type="number"
                value={taxPct}
                onChange={(e) => setTaxPct(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax-applies">Applies to</Label>
              <Input
                id="tax-applies"
                value={taxApplies}
                onChange={(e) => setTaxApplies(e.target.value)}
                className="h-11"
              />
            </div>
            <Button
              className="h-11 self-end"
              onClick={() => {
                if (!taxName.trim() || !(Number(taxPct) >= 0)) {
                  toast("Enter a tax name and percentage");
                  return;
                }
                saveTax({
                  id: `tax-${Math.random().toString(36).slice(2, 8)}`,
                  name: taxName.trim(),
                  percentage: Number(taxPct),
                  appliesTo: taxApplies.trim() || "All products",
                });
                setTaxName("");
                setTaxPct("");
                setTaxApplies("");
                toast.success("Tax rate added");
              }}
            >
              Add tax
            </Button>
          </DataCard>
          <DataTable
            columns={taxColumns(saveTax, removeTax)}
            rows={taxes}
            getKey={(t) => t.id}
            empty="No tax rates configured."
          />
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

function taxColumns(
  saveTax: (tax: TaxRate) => void,
  removeTax: (id: string) => void,
): Column<TaxRate>[] {
  return [
    { header: "Tax", width: "1.5fr", cell: (t) => <span className="font-medium">{t.name}</span> },
    {
      header: "Percentage",
      align: "right",
      cell: (t) => (
        <Input
          type="number"
          value={t.percentage}
          aria-label={`${t.name} percentage`}
          onChange={(e) => saveTax({ ...t, percentage: Number(e.target.value) || 0 })}
          className="ml-auto h-9 w-24 text-right"
        />
      ),
    },
    {
      header: "Applies to",
      width: "2fr",
      cell: (t) => <span className="text-sm text-muted-foreground">{t.appliesTo}</span>,
    },
    {
      header: "Action",
      cell: (t) => (
        <span className="flex justify-end">
          <Button
            variant="ghost"
            className="h-9 text-destructive"
            onClick={() => {
              removeTax(t.id);
              toast.success(`${t.name} removed`);
            }}
          >
            Delete
          </Button>
        </span>
      ),
    },
  ];
}

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
