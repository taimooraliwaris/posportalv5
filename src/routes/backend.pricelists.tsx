import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BackendLayout } from "@/components/backend/backend-layout";
import { ConfirmAction, DataCard, DetailDrawer, Field } from "@/components/backend/backend-ui";
import { useBackend } from "@/lib/backend-context";
import type { PricelistDetail } from "@/lib/backend-data";
import { toast } from "sonner";

export const Route = createFileRoute("/backend/pricelists")({
  head: () => ({
    meta: [
      { title: "Pricelists — Velora back office" },
      { name: "description", content: "Create and manage retail, wholesale and seasonal pricing rules." },
      { property: "og:title", content: "Pricelists — Velora back office" },
      { property: "og:description", content: "Create and manage retail, wholesale and seasonal pricing rules." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PricelistsPage,
});

function PricelistsPage() {
  const { pricelists, addPricelist, removePricelist } = useBackend();
  const [selected, setSelected] = useState<PricelistDetail | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  return (
    <BackendLayout
      title="Pricelists"
      actions={
        <Button className="h-11" onClick={() => setCreating((v) => !v)}>
          New pricelist
        </Button>
      }
    >
      {creating && (
        <DataCard className="mb-4 space-y-3 p-4">
          <div className="space-y-2">
            <Label htmlFor="pl-name">Name</Label>
            <Input
              id="pl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 max-w-sm"
              placeholder="Eid Weekend"
            />
          </div>
          <Button
            className="h-11"
            onClick={() => {
              if (!name.trim()) {
                toast("Enter a pricelist name");
                return;
              }
              addPricelist({
                name,
                ruleType: "percentage",
                appliesTo: "All products",
                productCount: 0,
                customerCount: 0,
                rules: [],
              });
              setName("");
              setCreating(false);
              toast.success("Pricelist created");
            }}
          >
            Save pricelist
          </Button>
        </DataCard>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {pricelists.map((pl) => (
          <DataCard key={pl.id} className="space-y-2 p-4">
            <p className="font-medium">{pl.name}</p>
            <Field label="Rule type" value={pl.ruleType} />
            <Field label="Applies to" value={pl.appliesTo} />
            <Field label="Products" value={pl.productCount} />
            <Field label="Customers" value={pl.customerCount} />
            <div className="flex gap-2 pt-2">
              <Button variant="secondary" className="h-10" onClick={() => setSelected(pl)}>
                View rules
              </Button>
              <ConfirmAction
                trigger={
                  <Button variant="ghost" className="h-10 text-destructive">
                    Delete
                  </Button>
                }
                title="Delete pricelist?"
                body={`${pl.name} will be removed from the back office.`}
                confirmLabel="Delete"
                onConfirm={() => {
                  removePricelist(pl.id);
                  toast.success("Pricelist deleted");
                }}
              />
            </div>
          </DataCard>
        ))}
      </div>

      <DetailDrawer
        open={!!selected}
        onOpenChange={() => setSelected(null)}
        title={selected?.name ?? ""}
        description="Rules inside this pricelist."
      >
        <DataCard>
          {(selected?.rules ?? []).map((rule) => (
            <div
              key={rule.id}
              className="flex justify-between border-b border-border px-4 py-3 text-sm last:border-0"
            >
              <span>{rule.scope}</span>
              <span className="text-muted-foreground">
                {rule.type === "fixed" ? `Fixed ${rule.value}` : `${rule.value}% off`}
              </span>
            </div>
          ))}
          {selected?.rules.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">No rules yet.</p>
          )}
        </DataCard>
      </DetailDrawer>
    </BackendLayout>
  );
}
