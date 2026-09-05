import { useMemo } from "react";
import { useBackend } from "./backend-context";
import { usePos, type CartLine, type Order } from "./pos-context";
import { calculateOrderTotals, type PricingContext } from "./tax-resolver";
import type { PricelistDetail } from "./backend-data";
import type { Category, Product } from "./pos-data";

const norm = (v?: string | null) => (v ?? "").trim().toLowerCase();

function withinDates(start?: string, end?: string) {
  const today = new Date().toISOString().slice(0, 10);
  if (start && today < start) return false;
  if (end && today > end) return false;
  return true;
}

/** Resolve the discount rate (0..1) a pricelist gives a specific product. */
export function pricelistDiscountRate(
  pricelist: PricelistDetail | undefined,
  product: Product | undefined,
  categories: Category[],
): number {
  if (!pricelist) return 0;
  if (!withinDates(pricelist.startDate, pricelist.endDate)) return 0;

  const category = categories.find((c) => c.id === product?.category_id);
  const productKeys = [norm(product?.id), norm(product?.name), norm(product?.item_code)].filter(
    Boolean,
  );
  const categoryKeys = [
    norm(product?.category_id),
    norm(category?.id),
    norm(category?.name),
    norm(category?.slug),
    norm(product?.category),
    norm(product?.category_name),
    norm(product?.category_slug),
  ].filter(Boolean);

  const rules = (pricelist.rules ?? []).filter((r) => withinDates(r.startDate, r.endDate));
  const rate = (value: number) => Math.min(1, Math.max(0, (value || 0) / 100));

  const productRule = rules.find(
    (r) =>
      (r.scopeKind === "product" || !r.scopeKind) &&
      (productKeys.includes(norm(r.scopeId)) || productKeys.includes(norm(r.scope))),
  );
  if (productRule && productRule.type === "percentage") return rate(productRule.value);

  const categoryRule = rules.find(
    (r) =>
      (r.scopeKind === "category" || !r.scopeKind) &&
      (categoryKeys.includes(norm(r.scopeId)) || categoryKeys.includes(norm(r.scope))),
  );
  if (categoryRule && categoryRule.type === "percentage") return rate(categoryRule.value);

  const storeRule = rules.find(
    (r) =>
      r.scopeKind === "store" ||
      norm(r.scope) === "all products" ||
      norm(r.scope) === "store" ||
      norm(r.scope) === "",
  );
  if (storeRule && storeRule.type === "percentage") return rate(storeRule.value);

  return 0;
}

/**
 * Single source of truth for money math: resolves each line's pricelist
 * discount and its tax rate, so till, payment, orders and receipts agree.
 */
export function usePricing() {
  const { pricelists, taxes } = useBackend();
  const { productList, categoryList } = usePos();

  return useMemo(() => {
    const productById = new Map(productList.map((p) => [p.id, p]));

    const taxRateFor = (product: Product | undefined) => {
      const category = categoryList.find((c) => c.id === product?.category_id);
      const keys = [
        norm(category?.name),
        norm(category?.slug),
        norm(product?.category),
        norm(product?.category_name),
        norm(product?.category_slug),
      ].filter(Boolean);
      const specific = taxes.find((t) => keys.includes(norm(t.appliesTo)));
      if (specific) return specific.percentage || 0;
      const all = taxes.find((t) => norm(t.appliesTo) === "all products");
      return all?.percentage ?? 0;
    };

    const contextFor = (pricelistId?: string): PricingContext => {
      const pricelist = pricelists.find((p) => p.id === pricelistId);
      return {
        lineDiscountRate: (line: CartLine) =>
          pricelistDiscountRate(pricelist, productById.get(line.productId), categoryList),
        lineTaxRate: (line: CartLine) => taxRateFor(productById.get(line.productId)),
      };
    };

    const totalsFor = (order: Order | undefined | null) =>
      calculateOrderTotals(order?.lines ?? [], 0, contextFor(order?.pricelistId));

    return { totalsFor, contextFor, taxRateFor, pricelists, taxes };
  }, [pricelists, taxes, productList, categoryList]);
}
