/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { ProductsPageShared } from "@/components/backend/ProductsPageShared";

export const Route = createFileRoute("/backend/products/spare-parts")({
  component: () => <ProductsPageShared categorySlug="spare_parts" />
});
