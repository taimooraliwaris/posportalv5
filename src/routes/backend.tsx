import { createFileRoute, Outlet } from "@tanstack/react-router";
import { BackendProvider } from "@/lib/backend-context";

export const Route = createFileRoute("/backend")({
  component: BackendShell,
});

function BackendShell() {
  return (
    <BackendProvider>
      <Outlet />
    </BackendProvider>
  );
}
