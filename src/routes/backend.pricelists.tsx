import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BackendLayout } from "@/components/backend/backend-layout";
import { ConfirmAction, DataCard, DetailDrawer } from "@/components/backend/backend-ui";
import { PricelistRuleBuilder } from "@/components/backend/PricelistRuleBuilder";
import { useBackend } from "@/lib/backend-context";
import type { PricelistDetail } from "@/lib/backend-data";
import { toast } from "sonner";
import { Plus, Tag, Tags, CalendarClock, Settings2, Trash2 } from "lucide-react";

export const Route = createFileRoute("/backend/pricelists")({
  component: PricelistsPage,
});

function PricelistsPage() {
  const { pricelists, addPricelist, removePricelist } = useBackend();
  const [selected, setSelected] = useState<PricelistDetail | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  return (
    <BackendLayout title="Pricelists">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-[15px] font-medium text-foreground">Pricing Rules</h2>
          <p className="text-[11px] text-muted-foreground">Manage discounts, wholesale rates, and promotions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            className="h-9 px-4 text-xs gap-2 rounded-full shadow-sm" 
            onClick={() => setCreating((v) => !v)}
          >
            <Plus className="w-3.5 h-3.5" />
            Create Campaign
          </Button>
        </div>
      </div>

      {creating && (
        <div className="mb-6 bg-card border border-border p-6 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <h3 className="font-semibold mb-1">New Pricing Campaign</h3>
          <p className="text-xs text-muted-foreground mb-4">Give your campaign or pricelist a memorable name.</p>
          
          <div className="flex flex-col sm:flex-row gap-3 items-end max-w-lg">
            <div className="space-y-1.5 flex-1 w-full">
              <Label htmlFor="pl-name" className="text-xs">Campaign Name</Label>
              <Input
                id="pl-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10"
                placeholder="e.g. Eid Mega Sale, Wholesale Partners..."
              />
            </div>
            <Button
              className="h-10 px-6 shrink-0 w-full sm:w-auto"
              onClick={() => {
                if (!name.trim()) {
                  toast.error("Please enter a campaign name");
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
                toast.success("Campaign created");
              }}
            >
              Start Building
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pricelists.map((pl) => (
          <DataCard key={pl.id} className="p-0 overflow-hidden flex flex-col border border-border shadow-sm hover:shadow-md transition-shadow group">
            <div className="p-5 flex-1">
              <div className="flex items-start justify-between mb-4">
                <div className="bg-primary/10 p-2 rounded-lg text-primary">
                  <Tags className="w-5 h-5" />
                </div>
                <div className="bg-secondary/50 text-secondary-foreground text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded">
                  {pl.rules.length} Rule{pl.rules.length !== 1 ? 's' : ''}
                </div>
              </div>
              
              <h3 className="font-semibold text-base mb-1 group-hover:text-primary transition-colors">{pl.name}</h3>
              
              {pl.rules.length > 0 ? (
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">Active Rules</p>
                  {pl.rules.slice(0, 2).map((rule, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm bg-muted/50 p-2 rounded-md">
                      <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="truncate flex-1">
                        {rule.type === 'percentage' ? `${rule.value}% off` : rule.type === 'fixed' ? 'Fixed Price' : 'BOGO'} on {rule.scope}
                      </span>
                    </div>
                  ))}
                  {pl.rules.length > 2 && (
                    <div className="text-xs text-muted-foreground pl-1">+ {pl.rules.length - 2} more rules</div>
                  )}
                </div>
              ) : (
                <div className="mt-4 py-4 px-3 bg-muted/30 border border-dashed border-border rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Empty campaign</p>
                </div>
              )}
            </div>
            
            <div className="border-t border-border bg-muted/10 p-3 flex gap-2">
              <Button variant="secondary" className="flex-1 h-9 text-xs" onClick={() => setSelected(pl)}>
                <Settings2 className="w-3.5 h-3.5 mr-1.5" />
                Configure Rules
              </Button>
              <ConfirmAction
                trigger={
                  <Button variant="outline" className="h-9 w-9 p-0 text-destructive border-border hover:bg-destructive/10">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                }
                title="Delete campaign?"
                body={`${pl.name} and all its rules will be permanently removed.`}
                confirmLabel="Delete"
                onConfirm={() => {
                  removePricelist(pl.id);
                  toast.success("Campaign deleted");
                }}
              />
            </div>
          </DataCard>
        ))}
        
        {pricelists.length === 0 && !creating && (
          <div className="col-span-full py-16 text-center text-muted-foreground bg-muted/10 border border-dashed border-border rounded-2xl flex flex-col items-center justify-center">
            <CalendarClock className="w-12 h-12 mb-4 opacity-20" />
            <p className="font-medium text-foreground">No pricing campaigns active.</p>
            <p className="text-sm mt-1 mb-4 max-w-sm">Create specific rules for Ramadan sales, wholesale customers, or bulk purchases.</p>
            <Button onClick={() => setCreating(true)} variant="outline" className="rounded-full shadow-sm">Create your first campaign</Button>
          </div>
        )}
      </div>

      <DetailDrawer
        title={selected?.name || ""}
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        {selected && <PricelistRuleBuilder pricelist={selected} />}
      </DetailDrawer>
    </BackendLayout>
  );
}
