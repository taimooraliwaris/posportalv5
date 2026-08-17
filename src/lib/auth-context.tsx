import { createContext, useContext, useState, type ReactNode } from "react";
import { usePersistentState } from "./use-persistent-state";
import { seedStaff, type StaffRole, type StaffUser } from "./backend-data";

export type AppUser = StaffUser & { password: string; active: boolean };

export type SecurityEvent = {
  id: string;
  kind: "failed-passcode" | "unlocked" | "failed-login" | "signed-in" | "credential-change";
  user: string;
  timestamp: string;
  attempt: number;
  location: string;
  detail?: string;
};

const seedUsers: AppUser[] = seedStaff.map((u) => ({
  ...u,
  password:
    u.role === "Admin" ? "admin123" : u.role === "Manager" ? "manager123" : "cashier123",
  active: true,
}));

const mockLocations = [
  "Karachi, PK - Till 1",
  "Karachi, PK - Back Office",
  "Lahore, PK - Remote",
];

function mockLocation() {
  return mockLocations[Math.floor(Math.random() * mockLocations.length)]!;
}

type AuthState = {
  users: AppUser[];
  currentUser: AppUser | null;
  signIn: (email: string, password: string) => { ok: boolean; error?: string };
  signOut: () => void;

  backendUnlocked: boolean;
  backendPasscode: string;
  unlockBackend: (code: string) => { ok: boolean; error?: string };
  lockBackend: () => void;
  lockedUntil: number | null;

  securityLog: SecurityEvent[];
  clearSecurityLog: () => void;

  createUser: (input: { name: string; email: string; role: StaffRole; password: string }) => void;
  updateUser: (id: string, patch: Partial<AppUser>) => void;

  changePassword: (userId: string, next: string) => void;
  changePasscode: (next: string) => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = usePersistentState<AppUser[]>("velora.users", seedUsers);
  const [currentUserId, setCurrentUserId] = usePersistentState<string | null>(
    "velora.session",
    null,
  );
  const [backendPasscode, setBackendPasscode] = usePersistentState<string>(
    "velora.passcode",
    "246810",
  );
  const [securityLog, setSecurityLog] = usePersistentState<SecurityEvent[]>(
    "velora.security-log",
    [],
  );
  const [backendUnlocked, setBackendUnlocked] = useState(false);
  const [failures, setFailures] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  const currentUser = users.find((u) => u.id === currentUserId) ?? null;

  const log = (event: Omit<SecurityEvent, "id" | "timestamp" | "location">) =>
    setSecurityLog((prev) =>
      [
        {
          ...event,
          id: `sec-${Math.random().toString(36).slice(2, 9)}`,
          timestamp: new Date().toISOString(),
          location: mockLocation(),
        },
        ...prev,
      ].slice(0, 200),
    );

  const value: AuthState = {
    users,
    currentUser,
    signIn: (email, password) => {
      const user = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      if (!user || !user.active || user.password !== password) {
        log({ kind: "failed-login", user: email || "unknown", attempt: 1 });
        return { ok: false, error: "Incorrect email or password." };
      }
      setCurrentUserId(user.id);
      log({ kind: "signed-in", user: user.name, attempt: 0 });
      return { ok: true };
    },
    signOut: () => {
      setCurrentUserId(null);
      setBackendUnlocked(false);
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

    securityLog,
    clearSecurityLog: () => setSecurityLog([]),

    createUser: (input) =>
      setUsers((prev) => [
        ...prev,
        { ...input, id: `u-${Math.random().toString(36).slice(2, 8)}`, active: true },
      ]),
    updateUser: (id, patch) =>
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u))),

    changePassword: (userId, next) => {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, password: next } : u)));
      log({
        kind: "credential-change",
        user: users.find((u) => u.id === userId)?.name ?? "Unknown",
        attempt: 0,
        detail: "Login password changed",
      });
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
