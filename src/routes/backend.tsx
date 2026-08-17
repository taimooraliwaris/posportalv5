import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PasscodeGate } from "@/components/backend/passcode-gate";

export const Route = createFileRoute("/backend")({
  component: BackendShell,
});

function BackendShell() {
  return (
    <PasscodeGate>
      <Outlet />
    </PasscodeGate>
  );
}
