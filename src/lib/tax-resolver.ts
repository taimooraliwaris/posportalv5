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
    const lineDiscount = line.discount ? line.discount / 100 : 0;
    gross += line.qty * line.unitPrice * (1 - lineDiscount);
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
