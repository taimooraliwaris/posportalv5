import { useState } from "react";
import { Plus, Trash2, Calendar, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataCard } from "./backend-ui";
import { useBackend } from "@/lib/backend-context";
import type { PricelistDetail, PricelistRule, RuleScopeKind } from "@/lib/backend-data";
import { usePos } from "@/lib/pos-context";
import { formatRs } from "@/lib/pos-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function describeRule(rule: PricelistRule) {
  if (rule.type === "fixed") return `Fixed price ${formatRs(rule.value)}`;
  if (rule.type === "buy-x-get-y") return `Buy ${rule.minQty ?? 1} get ${rule.freeQty ?? 1} free`;
  return `${rule.value}% off`;
}

export function PricelistRuleBuilder({ pricelist }: { pricelist: PricelistDetail }) {
  const { updatePricelist } = useBackend();
  const { productList, categoryList } = usePos();

  const [scopeKind, setScopeKind] = useState<RuleScopeKind>("store");
  const [scopeId, setScopeId] = useState("");
  const [type, setType] = useState<PricelistRule["type"]>("percentage");
  const [value, setValue] = useState("");
  const [minQty, setMinQty] = useState("");
  const [freeQty, setFreeQty] = useState("");
  const [hasDates, setHasDates] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const scopeLabel = () => {
    if (scopeKind === "store") return "Whole store";
    if (scopeKind === "category")
      return categoryList.find((c) => c.id === scopeId)?.name || "Unknown category";
    return productList.find((p) => p.id === scopeId)?.name || "Unknown product";
  };

  const addRule = () => {
    if (scopeKind !== "store" && !scopeId) {
      toast("Please select a specific " + scopeKind);
      return;
    }
    if (type !== "buy-x-get-y" && !(Number(value) > 0)) {
      toast("Please enter a discount value greater than zero");
      return;
    }

    const rule: PricelistRule = {
      id: `r-${Math.random().toString(36).slice(2, 8)}`,
      scope: scopeLabel(),
      type,
      value: type === "buy-x-get-y" ? 0 : Number(value),
      scopeKind,
      ...(scopeKind === "store" ? {} : { scopeId }),
      ...(type === "buy-x-get-y" || minQty ? { minQty: Number(minQty) || 1 } : {}),
      ...(type === "buy-x-get-y" ? { freeQty: Number(freeQty) || 1 } : {}),
      ...(hasDates && startDate ? { startDate } : {}),
      ...(hasDates && endDate ? { endDate } : {}),
    };
    updatePricelist(pricelist.id, { rules: [...pricelist.rules, rule] });
    toast.success("Rule added");

    // reset
    setValue("");
    setMinQty("");
    setFreeQty("");
  };

  const removeRule = (id: string) =>
    updatePricelist(pricelist.id, { rules: pricelist.rules.filter((r) => r.id !== id) });

  const inputClass =
    "h-10 rounded-lg border-border bg-muted/50 px-3 text-sm focus:bg-background transition-colors inline-block text-center font-medium shadow-sm";

  return (
    <div className="space-y-6 mt-6">
      <div className="bg-primary/5 border border-primary/20 p-6 rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Tag className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-primary text-base">Create a New Rule</h3>
        </div>

        {/* Mad Libs Sentence Builder */}
        <div className="text-base md:text-lg leading-[3rem] text-foreground flex flex-wrap items-center gap-x-2 gap-y-3 font-medium">
          <span>When a customer buys</span>

          <select
            value={scopeKind}
            onChange={(e) => {
              setScopeKind(e.target.value as RuleScopeKind);
              setScopeId("");
            }}
            className={cn(inputClass, "w-48 cursor-pointer")}
          >
            <option value="store">Anything in the store</option>
            <option value="category">From a category</option>
            <option value="product">A specific product</option>
          </select>

          {scopeKind === "category" && (
            <select
              value={scopeId}
              onChange={(e) => setScopeId(e.target.value)}
              className={cn(inputClass, "w-48 cursor-pointer")}
            >
              <option value="">Select category...</option>
              {categoryList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          {scopeKind === "product" && (
            <select
              value={scopeId}
              onChange={(e) => setScopeId(e.target.value)}
              className={cn(inputClass, "w-64 cursor-pointer")}
            >
              <option value="">Select product...</option>
              {productList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          <span>,</span>

          {/* Conditional Quantity */}
          {type !== "buy-x-get-y" && (
            <>
              <select
                value={minQty ? "min" : "any"}
                onChange={(e) => setMinQty(e.target.value === "min" ? "2" : "")}
                className={cn(inputClass, "w-32 cursor-pointer")}
              >
                <option value="any">Any amount</option>
                <option value="min">At least</option>
              </select>
              {minQty && (
                <>
                  <Input
                    type="number"
                    min="1"
                    value={minQty}
                    onChange={(e) => setMinQty(e.target.value)}
                    className={cn(inputClass, "w-20")}
                  />
                  <span>items,</span>
                </>
              )}
            </>
          )}

          <span>we will apply</span>

          <select
            value={type}
            onChange={(e) => setType(e.target.value as PricelistRule["type"])}
            className={cn(
              inputClass,
              "w-48 cursor-pointer text-primary bg-primary/10 border-primary/20",
            )}
          >
            <option value="percentage">a % discount</option>
            <option value="fixed">a fixed price</option>
            <option value="buy-x-get-y">a Buy X Get Y Free</option>
          </select>

          {type === "percentage" && (
            <>
              <span>of</span>
              <Input
                type="number"
                min="1"
                max="100"
                placeholder="%"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className={cn(
                  inputClass,
                  "w-24 text-primary font-bold bg-primary/10 border-primary/20",
                )}
              />
            </>
          )}

          {type === "fixed" && (
            <>
              <span>of</span>
              <Input
                type="number"
                min="1"
                placeholder="Rs."
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className={cn(
                  inputClass,
                  "w-32 text-primary font-bold bg-primary/10 border-primary/20",
                )}
              />
              <span>Rs.</span>
            </>
          )}

          {type === "buy-x-get-y" && (
            <>
              <span>deal: Buy</span>
              <Input
                type="number"
                min="1"
                value={minQty}
                onChange={(e) => setMinQty(e.target.value)}
                className={cn(inputClass, "w-20")}
              />
              <span>get</span>
              <Input
                type="number"
                min="1"
                value={freeQty}
                onChange={(e) => setFreeQty(e.target.value)}
                className={cn(
                  inputClass,
                  "w-20 text-primary font-bold bg-primary/10 border-primary/20",
                )}
              />
              <span>free!</span>
            </>
          )}

          <div className="w-full h-px bg-border/50 my-2" />

          <div className="flex items-center gap-3 w-full">
            <button
              type="button"
              onClick={() => setHasDates(!hasDates)}
              className={cn(
                "flex items-center gap-2 text-sm px-3 py-1.5 rounded-full transition-colors",
                hasDates
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              <Calendar className="w-4 h-4" />
              {hasDates ? "Active during specific dates" : "Active forever"}
            </button>

            {hasDates && (
              <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
                <span className="text-sm">From</span>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={cn(inputClass, "w-40")}
                />
                <span className="text-sm">until</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={cn(inputClass, "w-40")}
                />
              </div>
            )}

            <Button onClick={addRule} className="ml-auto rounded-full px-6 shadow-sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Rule
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pricelist.rules.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/20 border border-dashed border-border rounded-xl">
            <Tag className="w-8 h-8 mx-auto mb-3 opacity-20" />
            <p>No rules defined yet.</p>
            <p className="text-sm mt-1">Use the builder above to create your first pricing rule.</p>
          </div>
        )}

        {pricelist.rules.map((rule) => (
          <DataCard
            key={rule.id}
            className="p-5 flex flex-col justify-between border border-border/60 shadow-sm hover:shadow transition-shadow"
          >
            <div>
              <div className="flex items-start justify-between mb-3">
                <div className="bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md">
                  {rule.type === "percentage"
                    ? "% Discount"
                    : rule.type === "fixed"
                      ? "Fixed Price"
                      : "BOGO Deal"}
                </div>
                <button
                  onClick={() => removeRule(rule.id)}
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-1.5 rounded-md transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <h4 className="text-xl font-bold text-foreground mb-1">{describeRule(rule)}</h4>
              <p className="text-sm font-medium text-muted-foreground">
                On <span className="text-foreground">{rule.scope}</span>
              </p>
            </div>

            <div className="mt-4 pt-4 border-t border-border/50 space-y-1.5 text-xs text-muted-foreground">
              {rule.minQty && rule.type !== "buy-x-get-y" && (
                <div className="flex justify-between">
                  <span className="opacity-70">Min Qty:</span>{" "}
                  <span className="font-medium text-foreground">{rule.minQty}</span>
                </div>
              )}
              {rule.startDate && (
                <div className="flex justify-between">
                  <span className="opacity-70">Starts:</span>{" "}
                  <span className="font-medium text-foreground">{rule.startDate}</span>
                </div>
              )}
              {rule.endDate && (
                <div className="flex justify-between">
                  <span className="opacity-70">Ends:</span>{" "}
                  <span className="font-medium text-foreground">{rule.endDate}</span>
                </div>
              )}
              {!rule.startDate && !rule.endDate && (
                <div className="flex justify-between">
                  <span className="opacity-70">Duration:</span>{" "}
                  <span className="font-medium text-success">Forever</span>
                </div>
              )}
            </div>
          </DataCard>
        ))}
      </div>
    </div>
  );
}
