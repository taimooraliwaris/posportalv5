import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BackendLayout } from "@/components/backend/backend-layout";
import { DataCard, StatusPill } from "@/components/backend/backend-ui";
import { useBackend } from "@/lib/backend-context";
import { formatDate, rolePermissions } from "@/lib/backend-data";
import { formatRs } from "@/lib/pos-data";
import { useHydrated } from "@/lib/use-hydrated";
import { toast } from "sonner";

export const Route = createFileRoute("/backend/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Velora back office" },
      { name: "description", content: "Staff roles, tax rates, store details and register session history." },
      { property: "og:title", content: "Settings — Velora back office" },
      { property: "og:description", content: "Staff roles, tax rates, store details and register session history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const hydrated = useHydrated();
  const { staff, taxes, storeSettings, updateStoreSettings, sessions } = useBackend();

  return (
    <BackendLayout title="Settings">
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users &amp; roles</TabsTrigger>
          <TabsTrigger value="taxes">Taxes</TabsTrigger>
          <TabsTrigger value="store">Store details</TabsTrigger>
          <TabsTrigger value="sessions">Session history</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <DataCard>
            {staff.map((u) => (
              <div
                key={u.id}
                className="grid grid-cols-1 items-center gap-3 border-b border-border px-4 py-3 last:border-0 md:grid-cols-[1.2fr_1.5fr_1fr_2fr]"
              >
                <span className="font-medium">{u.name}</span>
                <span className="text-sm text-muted-foreground">{u.email}</span>
                <span className="text-sm">{u.role}</span>
                <span className="text-sm text-muted-foreground">{rolePermissions[u.role]}</span>
              </div>
            ))}
          </DataCard>
        </TabsContent>

        <TabsContent value="taxes">
          <DataCard>
            {taxes.map((t) => (
              <div
                key={t.id}
                className="grid grid-cols-1 items-center gap-3 border-b border-border px-4 py-3 last:border-0 md:grid-cols-[1.5fr_1fr_2fr]"
              >
                <span className="font-medium">{t.name}</span>
                <span>{t.percentage}%</span>
                <span className="text-sm text-muted-foreground">{t.appliesTo}</span>
              </div>
            ))}
          </DataCard>
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

        <TabsContent value="sessions">
          <DataCard>
            {hydrated &&
              sessions
                .slice()
                .reverse()
                .map((s) => (
                  <div
                    key={s.id}
                    className="grid grid-cols-1 items-center gap-3 border-b border-border px-4 py-3 last:border-0 md:grid-cols-[1fr_1fr_1fr_1fr_auto]"
                  >
                    <span>{formatDate(s.date)}</span>
                    <span className="text-sm">{s.cashier}</span>
                    <span className="text-sm text-muted-foreground">
                      {s.openedAt} — {s.closedAt}
                    </span>
                    <span>{formatRs(s.totalSales)}</span>
                    <StatusPill
                      status={s.variance === 0 ? "healthy" : "low"}
                      label={s.variance === 0 ? "Balanced" : `Variance ${formatRs(s.variance)}`}
                    />
                  </div>
                ))}
          </DataCard>
        </TabsContent>
      </Tabs>
    </BackendLayout>
  );
}
