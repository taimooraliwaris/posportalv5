import type { CartLine } from "./pos-context";

export type CalculatedOrderTotals = {
  gross: number;
  discountAmount: number;
  subtotal: number;
  total: number;
};

export function calculateOrderTotals(
  lines: CartLine[],
  orderDiscountRate: number = 0,
): CalculatedOrderTotals {
  let gross = 0;
  for (const line of lines) {
    gross += line.qty * line.unitPrice;
  }
  
  const discountAmount = gross * orderDiscountRate;
  const subtotal = gross - discountAmount;

  return {
    gross,
    discountAmount,
    subtotal,
    total: subtotal,
  };
}
