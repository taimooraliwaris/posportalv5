import type { CartLine } from "./pos-context";
import { round2, sumLines } from "./money";

export type CalculatedOrderTotals = {
  gross: number;
  discountAmount: number;
  total: number;
};

/**
 * Order arithmetic. The store sells at tax-inclusive prices, so there is no
 * separate tax component — only line discounts and an optional order-level
 * discount rate.
 */
export function calculateOrderTotals(
  lines: CartLine[],
  orderDiscountRate: number = 0,
): CalculatedOrderTotals {
  const gross = sumLines(lines);
  const discountAmount = round2(gross * orderDiscountRate);
  const total = round2(gross - discountAmount);

  return { gross, discountAmount, total };
}
