import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "@/components/auth/auth-screen";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in - Velora POS" },
      { name: "description", content: "Sign in to the Velora POS register and back office." },
      { property: "og:title", content: "Sign in - Velora POS" },
      {
        property: "og:description",
        content: "Sign in to the Velora POS register and back office.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthScreen,
});
