// src/routes/__tests__/CartLineItem.test.tsx
import { render, screen } from "@testing-library/react";
import { CartLineItem } from "../till";
import type { CartLine } from "@/lib/pos-context";

// Mock utilities used by the component
jest.mock("@/lib/utils", () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(" ")
}));
jest.mock("@/lib/pos-data", () => ({
  formatRs: (n: number) => `$${n.toFixed(2)}`
}));

const baseLine: CartLine = {
  id: "line-1",
  productId: "prod-1",
  name: "Test Product",
  qty: 1,
  unitPrice: 10,
  discount: 0
};

describe("CartLineItem stock & claim UI", () => {
  test("shows Out of Stock when stock_qty is 0", () => {
    render(
      <CartLineItem
        line={{ ...baseLine, stock_qty: 0, reorder_point: 5 }}
        selected={false}
        editingLabel={null}
        onClick={() => {}}
        onRemove={() => {}}
      />
    );
    expect(screen.getByText("Out of Stock")).toBeInTheDocument();
  });

  test("shows Low Stock when stock_qty <= reorder_point and > 0", () => {
    render(
      <CartLineItem
        line={{ ...baseLine, stock_qty: 3, reorder_point: 5 }}
        selected={false}
        editingLabel={null}
        onClick={() => {}}
        onRemove={() => {}}
      />
    );
    expect(screen.getByText("Low Stock")).toBeInTheDocument();
  });

  test("renders claim terms when claimable", () => {
    const terms = "Warranty 30 days";
    render(
      <CartLineItem
        line={{
          ...baseLine,
          stock_qty: 10,
          reorder_point: 5,
          claimable: true,
          claim_terms: terms
        }}
        selected={false}
        editingLabel={null}
        onClick={() => {}}
        onRemove={() => {}}
      />
    );
    expect(screen.getByText(terms)).toBeInTheDocument();
  });
});
