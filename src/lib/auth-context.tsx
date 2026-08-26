import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { usePersistentState } from "./use-persistent-state";
import { cloudKeys, fetchStaff } from "./cloud-data";
import type { StaffRole, StaffUser } from "./backend-data";
import { inviteStaffMember } from "./staff.functions";

export type AppUser = StaffUser & { active: boolean };

export type SecurityEvent = {
  id: string;
  kind: "failed-passcode" | "unlocked" | "failed-login" | "signed-in" | "credential-change";
  user: string;
  timestamp: string;
  attempt: number;
  location: string;
  detail?: string;
};

export type AuthResult = { ok: boolean; error?: string };

type AuthState = {
  users: AppUser[];
  currentUser: AppUser | null;
  session: Session | null;
  /** True until the first session check settles — gates redirects. */
  authLoading: boolean;

  signIn: (email: string, password: string) => Promise<AuthResult>;
  
  signInWithGoogle: () => Promise<AuthResult>;
  sendPasswordReset: (email: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;

  backendUnlocked: boolean;
  backendPasscode: string;
  unlockBackend: (code: string) => AuthResult;
  lockBackend: () => void;
  lockedUntil: number | null;

  securityLog: SecurityEvent[];
  clearSecurityLog: () => void;

  createUser: (input: {
    name: string;
    email: string;
    role: StaffRole;
    password: string;
  }) => Promise<AuthResult>;
  updateUser: (id: string, patch: Partial<AppUser>) => void;

  changePassword: (userId: string, next: string) => Promise<AuthResult>;
  changePasscode: (next: string) => void;
};

const AuthContext = createContext<AuthState | null>(null);

const kindFor = (value: string): SecurityEvent["kind"] =>
  (
    ["failed-passcode", "unlocked", "failed-login", "signed-in", "credential-change"] as const
  ).includes(value as SecurityEvent["kind"])
    ? (value as SecurityEvent["kind"])
    : "signed-in";

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [backendPasscode, setBackendPasscode] = usePersistentState<string>(
    "velora.passcode",
    "246810",
  );
  const [backendUnlocked, setBackendUnlocked] = useState(false);
  const [failures, setFailures] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setAuthLoading(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const staffQuery = useQuery({
    queryKey: cloudKeys.staff,
    queryFn: fetchStaff,
    enabled: Boolean(session),
  });

  const eventsQuery = useQuery({
    queryKey: cloudKeys.securityEvents,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("security_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) return [] as SecurityEvent[];
      return (data ?? []).map<SecurityEvent>((row) => ({
        id: row.id,
        kind: kindFor(row.kind),
        user: row.actor,
        timestamp: row.created_at,
        attempt: row.attempt,
        location: row.location,
        ...(row.detail ? { detail: row.detail } : {}),
      }));
    },
    enabled: Boolean(session),
  });

  const users: AppUser[] = (staffQuery.data ?? []).map((u) => ({ ...u, active: true }));
  const currentUser =
    users.find((u) => u.id === session?.user.id) ??
    (session
      ? {
          id: session.user.id,
          name:
            (session.user.user_metadata["name"] as string | undefined) ??
            session.user.email?.split("@")[0] ??
            "Staff",
          email: session.user.email ?? "",
          role: "Cashier" as StaffRole,
          active: true,
        }
      : null);

  const log = useCallback(
    (event: Omit<SecurityEvent, "id" | "timestamp" | "location">) => {
      void supabase.from("security_events").insert({
        kind: event.kind,
        actor: event.user,
        detail: event.detail ?? "",
        location: typeof window === "undefined" ? "" : window.location.host,
        attempt: event.attempt,
      });
      void queryClient.invalidateQueries({ queryKey: cloudKeys.securityEvents });
    },
    [queryClient],
  );

  const invite = useMutation({
    mutationFn: (input: { name: string; email: string; role: StaffRole; password: string }) =>
      inviteStaffMember({ data: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cloudKeys.staff }),
  });

  const value: AuthState = {
    users,
    currentUser,
    session,
    authLoading,

    signIn: async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        log({ kind: "failed-login", user: email.trim() || "unknown", attempt: 1 });
        return { ok: false, error: error.message };
      }
      log({
        kind: "signed-in",
        user: data.user?.email ?? email.trim(),
        attempt: 0,
      });
      return { ok: true };
    },

    // Public self-service sign-up is intentionally unavailable: staff accounts
    // are created by a Manager through inviteStaffMember().



    signInWithGoogle: async () => {
      // Routed through the Lovable auth broker so it also works inside the
      // editor preview iframe (a raw OAuth redirect is blocked there).
      const { lovable } = await import("@/integrations/lovable");
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        const message = result.error.message ?? "Google sign-in failed";
        const isUnconfigured =
          /unsupported.+provider|missing oauth|provider.+not.+enabled|not.+configured/i.test(
            message,
          );
        return {
          ok: false,
          error: isUnconfigured
            ? "Google sign-in isn't available yet. Please sign in with email and password."
            : message,
        };
      }
      // Either the browser is on its way to Google, or the broker already set
      // the session in place.
      return { ok: true };
    },


    sendPasswordReset: async (email) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },

    signOut: async () => {
      await queryClient.cancelQueries();
      queryClient.clear();
      setBackendUnlocked(false);
      await supabase.auth.signOut();
    },

    backendUnlocked,
    backendPasscode,
    unlockBackend: (code) => {
      if (lockedUntil && Date.now() < lockedUntil) {
        return { ok: false, error: "Too many attempts. Try again shortly." };
      }
      if (code !== backendPasscode) {
        const attempt = failures + 1;
        setFailures(attempt);
        log({
          kind: "failed-passcode",
          user: currentUser?.name ?? "Unknown",
          attempt,
          detail: "Backend passcode",
        });
        if (attempt >= 3) {
          setLockedUntil(Date.now() + 30_000);
          setFailures(0);
          return { ok: false, error: "3 failed attempts - locked for 30 seconds." };
        }
        return { ok: false, error: `Incorrect passcode (attempt ${attempt} of 3).` };
      }
      setFailures(0);
      setLockedUntil(null);
      setBackendUnlocked(true);
      log({ kind: "unlocked", user: currentUser?.name ?? "Unknown", attempt: 0 });
      return { ok: true };
    },
    lockBackend: () => setBackendUnlocked(false),
    lockedUntil,

    securityLog: eventsQuery.data ?? [],
    clearSecurityLog: () => {
      // The audit trail is append-only in the cloud; clearing only hides it locally.
      queryClient.setQueryData<SecurityEvent[]>(cloudKeys.securityEvents, []);
    },

    createUser: async (input) => {
      try {
        await invite.mutateAsync(input);
        log({
          kind: "credential-change",
          user: currentUser?.name ?? "Unknown",
          attempt: 0,
          detail: `Invited ${input.email} as ${input.role}`,
        });
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Could not invite staff member",
        };
      }
    },

    updateUser: (id, patch) => {
      queryClient.setQueryData<StaffUser[]>(cloudKeys.staff, (prev) =>
        (prev ?? []).map((u) => (u.id === id ? { ...u, ...patch } : u)),
      );
      if (patch.name) void supabase.from("profiles").update({ name: patch.name }).eq("id", id);
      if (patch.role)
        void supabase
          .from("user_roles")
          .upsert({ user_id: id, role: patch.role }, { onConflict: "user_id,role" });
    },

    changePassword: async (userId, next) => {
      if (userId !== session?.user.id) {
        return { ok: false, error: "You can only change your own password." };
      }
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) return { ok: false, error: error.message };
      log({
        kind: "credential-change",
        user: currentUser?.name ?? "Unknown",
        attempt: 0,
        detail: "Login password changed",
      });
      return { ok: true };
    },

    changePasscode: (next) => {
      setBackendPasscode(next);
      log({
        kind: "credential-change",
        user: currentUser?.name ?? "Unknown",
        attempt: 0,
        detail: "Backend passcode changed",
      });
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
