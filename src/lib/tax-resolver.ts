import type { Product, Category } from "./pos-data";
import type { TaxRate } from "./backend-data";
import type { CartLine } from "./pos-context";

export type ResolvedTax = {
  rate: number; // e.g. 0.18 for 18%
  percentage: number; // e.g. 18
  taxName: string; // e.g. "GST 18%"
  taxId: string;
};

export type TaxBreakdownItem = {
  name: string;
  percentage: number;
  taxableAmount: number;
  taxAmount: number;
};

export type CalculatedOrderTotals = {
  gross: number;
  discountAmount: number;
  subtotal: number;
  taxes: number;
  total: number;
  taxBreakdown: TaxBreakdownItem[];
  lineTaxes: Array<{
    lineId: string;
    subtotal: number;
    taxAmount: number;
    taxRate: ResolvedTax;
  }>;
};

/**
 * Resolves the effective tax rate for a product based on configured tax rates.
 * Resolution hierarchy:
 * 1. Product match: appliesTo matches product ID or product Name (case-insensitive)
 * 2. Category match: appliesTo matches category ID or category Name (case-insensitive)
 * 3. Default/All: appliesTo is "all products", "all", or empty string
 * 4. Fallback: 18% default GST or 0 if explicitly exempted
 */
export function resolveProductTaxRate(
  productOrLine: { productId?: string; categoryId?: string; name?: string; category?: string },
  taxes?: TaxRate[],
  products?: Product[],
  categories?: Category[],
): ResolvedTax {
  const taxList = taxes && taxes.length > 0 ? taxes : [];

  if (taxList.length === 0) {
    return {
      rate: 0.18,
      percentage: 18,
      taxName: "GST 18%",
      taxId: "default-gst",
    };
  }

  const pId = (productOrLine.productId ?? "").toLowerCase().trim();
  const pName = (productOrLine.name ?? "").toLowerCase().trim();
  
  // Find product if only productId provided
  const matchedProduct = products?.find(
    (p) => p.id.toLowerCase() === pId || p.name.toLowerCase() === pName,
  );
  const effectiveCatId = (
    productOrLine.categoryId ??
    productOrLine.category ??
    matchedProduct?.category ??
    ""
  )
    .toLowerCase()
    .trim();

  const matchedCategory = categories?.find((c) => c.id.toLowerCase() === effectiveCatId);
  const effectiveCatName = (matchedCategory?.name ?? "").toLowerCase().trim();

  // 1. Exact Product Match
  const productTax = taxList.find((t) => {
    const applies = t.appliesTo.toLowerCase().trim();
    return (
      (pId && applies === pId) ||
      (pName && applies === pName) ||
      (matchedProduct && applies === matchedProduct.name.toLowerCase().trim())
    );
  });
  if (productTax) {
    return {
      rate: Number(productTax.percentage) / 100,
      percentage: Number(productTax.percentage),
      taxName: productTax.name,
      taxId: productTax.id,
    };
  }

  // 2. Category Match
  const categoryTax = taxList.find((t) => {
    const applies = t.appliesTo.toLowerCase().trim();
    return (
      (effectiveCatId && applies === effectiveCatId) ||
      (effectiveCatName && applies === effectiveCatName) ||
      (effectiveCatId && applies.includes(effectiveCatId)) ||
      (effectiveCatName && applies.includes(effectiveCatName))
    );
  });
  if (categoryTax) {
    return {
      rate: Number(categoryTax.percentage) / 100,
      percentage: Number(categoryTax.percentage),
      taxName: categoryTax.name,
      taxId: categoryTax.id,
    };
  }

  // 3. General / "All products" Match
  const generalTax = taxList.find((t) => {
    const applies = t.appliesTo.toLowerCase().trim();
    return applies === "all products" || applies === "all" || applies === "*" || applies === "";
  });
  if (generalTax) {
    return {
      rate: Number(generalTax.percentage) / 100,
      percentage: Number(generalTax.percentage),
      taxName: generalTax.name,
      taxId: generalTax.id,
    };
  }

  // 4. Default to the first tax rate in the list
  const fallback = taxList[0]!;
  return {
    rate: Number(fallback.percentage) / 100,
    percentage: Number(fallback.percentage),
    taxName: fallback.name,
    taxId: fallback.id,
  };
}

/**
 * Calculates accurate itemized order totals, line taxes, and tax breakdowns.
 */
export function calculateOrderTotals(
  lines: CartLine[] = [],
  discountRate = 0,
  options?: {
    taxes?: TaxRate[] | undefined;
    products?: Product[] | undefined;
    categories?: Category[] | undefined;
  },
): CalculatedOrderTotals {
  let gross = 0;
  let subtotal = 0;
  let totalTaxes = 0;

  const breakdownMap = new Map<string, TaxBreakdownItem>();
  const lineTaxes: CalculatedOrderTotals["lineTaxes"] = [];

  for (const line of lines) {
    const lineGross = line.unitPrice * line.qty;
    gross += lineGross;

    const lineNetBeforeOrderDiscount = lineGross * (1 - (line.discount || 0) / 100);
    const lineSubtotal = lineNetBeforeOrderDiscount * (1 - discountRate);
    subtotal += lineSubtotal;

    const taxInfo = resolveProductTaxRate(
      { productId: line.productId, name: line.name },
      options?.taxes,
      options?.products,
      options?.categories,
    );

    const lineTaxAmount = lineSubtotal * taxInfo.rate;
    totalTaxes += lineTaxAmount;

    lineTaxes.push({
      lineId: line.id,
      subtotal: lineSubtotal,
      taxAmount: lineTaxAmount,
      taxRate: taxInfo,
    });

    const existingBreakdown = breakdownMap.get(taxInfo.taxName) ?? {
      name: taxInfo.taxName,
      percentage: taxInfo.percentage,
      taxableAmount: 0,
      taxAmount: 0,
    };
    existingBreakdown.taxableAmount += lineSubtotal;
    existingBreakdown.taxAmount += lineTaxAmount;
    breakdownMap.set(taxInfo.taxName, existingBreakdown);
  }

  const discountAmount = gross - subtotal;
  const roundedSubtotal = Math.round(subtotal * 100) / 100;
  const roundedTaxes = Math.round(totalTaxes * 100) / 100;
  const roundedTotal = Math.round((subtotal + totalTaxes) * 100) / 100;

  return {
    gross: Math.round(gross * 100) / 100,
    discountAmount: Math.round(discountAmount * 100) / 100,
    subtotal: roundedSubtotal,
    taxes: roundedTaxes,
    total: roundedTotal,
    taxBreakdown: Array.from(breakdownMap.values()).map((item) => ({
      ...item,
      taxableAmount: Math.round(item.taxableAmount * 100) / 100,
      taxAmount: Math.round(item.taxAmount * 100) / 100,
    })),
    lineTaxes,
  };
}
