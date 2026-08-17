import { useEffect, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useHydrated } from "@/lib/use-hydrated";

export function AuthGate({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!hydrated) return;
    if (!currentUser && pathname !== "/login") navigate({ to: "/login", replace: true });
    if (currentUser && pathname === "/login") navigate({ to: "/", replace: true });
  }, [hydrated, currentUser, pathname, navigate]);

  if (!hydrated) return <div className="min-h-screen bg-background" />;
  if (!currentUser && pathname !== "/login") return <div className="min-h-screen bg-background" />;

  return <>{children}</>;
}
