import type { CartLine } from "./pos-context";

export type CalculatedOrderTotals = {
  gross: number;
  discountAmount: number;
  subtotal: number;
  taxAmount: number;
  total: number;
};

export type PricingContext = {
  /** Extra discount rate (0..1) coming from the order's pricelist, per line. */
  lineDiscountRate?: (line: CartLine) => number;
  /** Tax percentage (e.g. 18 for 18%) resolved for the line's product. */
  lineTaxRate?: (line: CartLine) => number;
};

export function calculateOrderTotals(
  lines: CartLine[],
  orderDiscountRate: number = 0,
  pricing?: PricingContext,
): CalculatedOrderTotals {
  let gross = 0;
  let taxable: { net: number; rate: number }[] = [];

  for (const line of lines) {
    const lineDiscount = line.discount ? line.discount / 100 : 0;
    const listDiscount = pricing?.lineDiscountRate?.(line) ?? 0;
    const net =
      line.qty *
      line.unitPrice *
      (1 - Math.min(1, Math.max(0, lineDiscount))) *
      (1 - Math.min(1, Math.max(0, listDiscount)));
    gross += net;
    taxable.push({ net, rate: pricing?.lineTaxRate?.(line) ?? 0 });
  }

  const discountAmount = gross * orderDiscountRate;
  const subtotal = gross - discountAmount;
  const afterOrderDiscount = 1 - orderDiscountRate;

  let taxAmount = 0;
  for (const entry of taxable) {
    if (!entry.rate) continue;
    taxAmount += ((entry.net * afterOrderDiscount) * entry.rate) / 100;
  }

  return {
    gross,
    discountAmount,
    subtotal,
    taxAmount,
    total: subtotal + taxAmount,
  };
}
