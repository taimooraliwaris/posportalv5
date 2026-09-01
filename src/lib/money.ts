/**
 * Single source of truth for POS arithmetic.
 *
 * Every screen that shows money (till, payment, returns, receipts, close
 * register, Z report, back-office reports) must use these helpers so the same
 * numbers are produced everywhere and rounding never drifts.
 */

export type DocumentKind = "sale" | "return" | "exchange";

/** Currency rounding to 2 decimals, immune to float noise (0.145 → 0.15). */
export function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

type LineLike = { qty: number; unitPrice: number; discount?: number };
type PaymentLike = { method: string; amount: number };

/** Net value of one cart line after its own percentage discount. */
export function lineNet(line: LineLike): number {
  const discount = line.discount ? line.discount / 100 : 0;
  return round2(line.qty * line.unitPrice * (1 - discount));
}

/** Net value of a set of lines. */
export function sumLines(lines: LineLike[] = []): number {
  return round2(lines.reduce((total, line) => total + lineNet(line), 0));
}

/** Units on a document (used for item counts, never for money). */
export function sumQty(lines: { qty: number }[] = []): number {
  return lines.reduce((total, line) => total + (Number(line.qty) || 0), 0);
}

/** Total collected on a document across all payment lines. */
export function paymentsTotal(payments: PaymentLike[] = []): number {
  return round2(payments.reduce((total, p) => total + (Number(p.amount) || 0), 0));
}

/** Total collected for one payment method. */
export function paymentsByMethod(payments: PaymentLike[] = [], method: string): number {
  return round2(
    payments
      .filter((p) => p.method === method)
      .reduce((total, p) => total + (Number(p.amount) || 0), 0),
  );
}

/**
 * Refund owed for returned lines. Always a positive number; the direction of
 * the money is decided by the document kind, not by the sign of this value.
 */
export function refundTotal(lines: LineLike[] = []): number {
  return sumLines(lines);
}

/**
 * Exchange settlement: positive when the customer owes more, negative when the
 * store owes the customer.
 */
export function exchangeDifference(
  returnedLines: LineLike[] = [],
  replacementLines: LineLike[] = [],
): number {
  return round2(sumLines(replacementLines) - sumLines(returnedLines));
}

/** +1 for money coming in, -1 for money going out of the till. */
export function documentSign(kind: DocumentKind | undefined): 1 | -1 {
  return kind === "return" ? -1 : 1;
}

/** True when the document represents a new sale (not a refund or an exchange). */
export function isSaleDocument(kind: DocumentKind | undefined): boolean {
  return (kind ?? "sale") === "sale";
}

/**
 * Net stock movement for a document, keyed by product id.
 * Sales deduct, returned lines restore, replacement lines deduct again, so a
 * one-for-one exchange of the same product nets to zero.
 */
export function stockDelta(
  kind: DocumentKind,
  lines: { productId: string; qty: number }[] = [],
  replacements: { productId: string; qty: number }[] = [],
): Map<string, number> {
  const delta = new Map<string, number>();
  const add = (productId: string, qty: number) => {
    delta.set(productId, (delta.get(productId) ?? 0) + qty);
  };

  if (kind === "sale") {
    for (const line of lines) add(line.productId, -line.qty);
    return delta;
  }

  // return + exchange: the returned goods come back on the shelf
  for (const line of lines) add(line.productId, line.qty);
  if (kind === "exchange") {
    for (const line of replacements) add(line.productId, -line.qty);
  }
  return delta;
}

/** Expected cash in the drawer for a shift. */
export function expectedDrawerCash(input: {
  openingFloat: number;
  cashSales: number;
  cashRefunds?: number;
  cashIn: number;
  cashOut: number;
}): number {
  return round2(
    input.openingFloat +
      input.cashSales -
      (input.cashRefunds ?? 0) +
      input.cashIn -
      input.cashOut,
  );
}
