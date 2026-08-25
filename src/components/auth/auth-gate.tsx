import { useEffect, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useHydrated } from "@/lib/use-hydrated";

const publicPaths = ["/auth", "/reset-password"];

export function AuthGate({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const { currentUser, authLoading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isPublic = publicPaths.includes(pathname);

  useEffect(() => {
    if (!hydrated || authLoading) return;
    if (!currentUser && !isPublic) navigate({ to: "/auth", replace: true });
    if (currentUser && pathname === "/auth") navigate({ to: "/", replace: true });
  }, [hydrated, authLoading, currentUser, pathname, isPublic, navigate]);

  if (!hydrated || authLoading) return <div className="min-h-screen bg-background" />;
  if (!currentUser && !isPublic) return <div className="min-h-screen bg-background" />;

  return <>{children}</>;
}
