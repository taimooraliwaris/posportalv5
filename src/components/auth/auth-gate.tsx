import { useEffect, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useHydrated } from "@/lib/use-hydrated";
import { useBackend } from "@/lib/backend-context";

const publicPaths = ["/auth", "/reset-password"];

export function AuthGate({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const { currentUser, authLoading } = useAuth();
  const { loading: backendLoading } = useBackend();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isPublic = publicPaths.includes(pathname);
  const isBackend = pathname.startsWith("/backend");

  useEffect(() => {
    if (!hydrated || authLoading) return;

    // Not signed in → send to login
    if (!currentUser && !isPublic) {
      navigate({ to: "/auth", replace: true });
      return;
    }

    // Signed in on the login page → send to till
    if (currentUser && pathname === "/auth") {
      navigate({ to: "/", replace: true });
      return;
    }

    // Cashiers must not access backend pages — redirect them to the till
    if (currentUser && currentUser.role === "Cashier" && isBackend) {
      navigate({ to: "/till", replace: true });
    }
  }, [hydrated, authLoading, currentUser, pathname, isPublic, isBackend, navigate]);

  if (!hydrated || authLoading || (currentUser && backendLoading)) {
    return <div className="min-h-screen bg-background" />;
  }
  if (!currentUser && !isPublic) {
    return <div className="min-h-screen bg-background" />;
  }

  // Block render while redirecting a Cashier who landed on a backend page
  if (currentUser?.role === "Cashier" && isBackend) {
    return <div className="min-h-screen bg-background" />;
  }

  return <>{children}</>;
}
