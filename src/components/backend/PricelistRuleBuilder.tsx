import { useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataCard } from "./backend-ui";
import { useBackend } from "@/lib/backend-context";
import type { PricelistDetail, PricelistRule, RuleScopeKind } from "@/lib/backend-data";
import { usePos } from "@/lib/pos-context";
import { formatRs } from "@/lib/pos-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const selectClass = "h-11 w-full rounded-md border border-border bg-card px-3 text-sm";

export function describeRule(rule: PricelistRule) {
  if (rule.type === "fixed") return `Fixed price ${formatRs(rule.value)}`;
  if (rule.type === "buy-x-get-y")
    return `Buy ${rule.minQty ?? 1} get ${rule.freeQty ?? 1} free`;
  return `${rule.value}% off`;
}

/**
 * Builds a rule for a pricelist: pick a scope (whole store, a category or a
 * single product), the discount type, then optional advanced conditions.
 */
export function PricelistRuleBuilder({ pricelist }: { pricelist: PricelistDetail }) {
  const { updatePricelist } = useBackend();
  const { productList, categoryList } = usePos();

  const [scopeKind, setScopeKind] = useState<RuleScopeKind>("store");
  const [scopeId, setScopeId] = useState("");
  const [type, setType] = useState<PricelistRule["type"]>("percentage");
  const [value, setValue] = useState("10");
  const [minQty, setMinQty] = useState("1");
  const [freeQty, setFreeQty] = useState("1");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [advanced, setAdvanced] = useState(false);

  const scopeLabel = () => {
    if (scopeKind === "store") return "All products";
    if (scopeKind === "category")
      return categoryList.find((c) => c.id === scopeId)?.name ?? "Category";
    return productList.find((p) => p.id === scopeId)?.name ?? "Product";
  };

  const addRule = () => {
    if (scopeKind !== "store" && !scopeId) {
      toast("Choose a " + scopeKind);
      return;
    }
    if (type !== "buy-x-get-y" && !(Number(value) > 0)) {
      toast("Enter a value greater than zero");
      return;
    }
    const rule: PricelistRule = {
      id: `r-${Math.random().toString(36).slice(2, 8)}`,
      scope: scopeLabel(),
      type,
      value: type === "buy-x-get-y" ? 0 : Number(value),
      scopeKind,
      ...(scopeKind === "store" ? {} : { scopeId }),
      ...(type === "buy-x-get-y" || advanced ? { minQty: Number(minQty) || 1 } : {}),
      ...(type === "buy-x-get-y" ? { freeQty: Number(freeQty) || 1 } : {}),
      ...(advanced && startDate ? { startDate } : {}),
      ...(advanced && endDate ? { endDate } : {}),
    };
    updatePricelist(pricelist.id, { rules: [...pricelist.rules, rule] });
    toast.success("Rule added");
  };

  const removeRule = (id: string) =>
    updatePricelist(pricelist.id, { rules: pricelist.rules.filter((r) => r.id !== id) });

  return (
    <>
      <DataCard className="space-y-3 p-4">
        <p className="text-sm font-medium">Add a rule</p>

        <div className="space-y-2">
          <Label htmlFor="rule-scope">Applies to</Label>
          <select
            id="rule-scope"
            value={scopeKind}
            onChange={(e) => {
              setScopeKind(e.target.value as RuleScopeKind);
              setScopeId("");
            }}
            className={selectClass}
          >
            <option value="store">Whole store</option>
            <option value="category">A category</option>
            <option value="product">A single product</option>
          </select>
        </div>

        {scopeKind === "category" && (
          <div className="space-y-2">
            <Label htmlFor="rule-category">Category</Label>
            <select
              id="rule-category"
              value={scopeId}
              onChange={(e) => setScopeId(e.target.value)}
              className={selectClass}
            >
              <option value="">Select category</option>
              {categoryList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {scopeKind === "product" && (
          <div className="space-y-2">
            <Label htmlFor="rule-product">Product</Label>
            <select
              id="rule-product"
              value={scopeId}
              onChange={(e) => setScopeId(e.target.value)}
              className={selectClass}
            >
              <option value="">Select product</option>
              {productList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="rule-type">Rule type</Label>
            <select
              id="rule-type"
              value={type}
              onChange={(e) => setType(e.target.value as PricelistRule["type"])}
              className={selectClass}
            >
              <option value="percentage">Percentage discount</option>
              <option value="fixed">Fixed price</option>
              <option value="buy-x-get-y">Buy X get Y free</option>
            </select>
          </div>

          {type === "buy-x-get-y" ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="rule-buy">Buy</Label>
                <Input
                  id="rule-buy"
                  type="number"
                  min={1}
                  value={minQty}
                  onChange={(e) => setMinQty(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rule-free">Get free</Label>
                <Input
                  id="rule-free"
                  type="number"
                  min={1}
                  value={freeQty}
                  onChange={(e) => setFreeQty(e.target.value)}
                  className="h-11"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="rule-value">
                {type === "fixed" ? "Fixed price" : "Discount %"}
              </Label>
              <Input
                id="rule-value"
                type="number"
                inputMode="decimal"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="h-11"
              />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setAdvanced((v) => !v)}
          className="flex items-center gap-1 text-sm font-medium text-muted-foreground"
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", advanced && "rotate-180")} />
          Advanced conditions
        </button>

        {advanced && (
          <div className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="rule-min">Min quantity</Label>
              <Input
                id="rule-min"
                type="number"
                min={1}
                value={minQty}
                onChange={(e) => setMinQty(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rule-start">Starts</Label>
              <Input
                id="rule-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rule-end">Ends</Label>
              <Input
                id="rule-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-11"
              />
            </div>
          </div>
        )}

        <Button className="h-11 w-full" onClick={addRule}>
          <Plus className="h-4 w-4" /> Add rule
        </Button>
      </DataCard>

      <DataCard>
        <p className="border-b border-border px-4 py-2 text-sm font-medium">
          Rules ({pricelist.rules.length})
        </p>
        {pricelist.rules.map((rule) => (
          <div
            key={rule.id}
            className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 text-sm last:border-0"
          >
            <span className="min-w-0">
              <span className="block truncate font-medium">{rule.scope}</span>
              <span className="block text-xs text-muted-foreground">
                {describeRule(rule)}
                {rule.minQty && rule.type !== "buy-x-get-y" ? ` · min qty ${rule.minQty}` : ""}
                {rule.startDate ? ` · from ${rule.startDate}` : ""}
                {rule.endDate ? ` · until ${rule.endDate}` : ""}
              </span>
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-destructive"
              onClick={() => removeRule(rule.id)}
              aria-label={`Remove rule ${rule.scope}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {pricelist.rules.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">No rules yet.</p>
        )}
      </DataCard>
    </>
  );
}
