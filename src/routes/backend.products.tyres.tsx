/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { ProductsPageShared } from "@/components/backend/ProductsPageShared";

export const Route = createFileRoute("/backend/products/tyres")({
  component: () => <ProductsPageShared categorySlug="tyres" />
});
