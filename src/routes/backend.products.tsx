/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/backend/products")({
  beforeLoad: () => {
    throw redirect({ to: "/backend/products/spare-parts" });
  }
});
