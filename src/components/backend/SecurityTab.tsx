import { useState } from "react";
import { KeyRound, MailCheck, ShieldCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataCard, StatusPill } from "./backend-ui";
import { DataTable, type Column } from "./data-table";
import { useAuth, type AppUser, type SecurityEvent } from "@/lib/auth-context";
import { useStore } from "@/lib/backend-context";
import { rolePermissions, type StaffRole } from "@/lib/backend-data";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Pending omits `code` — the real OTP is sent via Supabase email, not stored here.
type Pending = { kind: "password" | "passcode"; value: string } | null;

const roles: StaffRole[] = ["Cashier", "Manager", "Admin"];
const selectClass = "h-11 w-full rounded-md border border-border bg-card px-3 text-sm";

const eventLabels: Record<SecurityEvent["kind"], string> = {
  "failed-passcode": "Failed passcode",
  unlocked: "Back office unlocked",
  "failed-login": "Failed login",
  "signed-in": "Signed in",
  "credential-change": "Credential change",
};

/**
 * Password/passcode changes are confirmed with a real OTP sent by Supabase,
 * then applied through the auth context so the security log stays accurate.
 */
export function SecurityTab() {
  const {
    users,
    currentUser,
    securityLog,
    clearSecurityLog,
    createUser,
    updateUser,
    changePassword,
    changePasscode,
  } = useAuth();
  const store = useStore();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passcode, setPasscode] = useState("");
  const [pending, setPending] = useState<Pending>(null);
  const [entered, setEntered] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const email = currentUser?.email ?? store.email;

  /** Send a real OTP to the user's email via Supabase — no code in the UI. */
  const sendCode = async (kind: "password" | "passcode", value: string) => {
    if (!email) {
      toast.error("No email address on file — cannot send verification code");
      return;
    }
    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    setSending(false);
    if (error) {
      toast.error("Could not send verification email: " + error.message);
      return;
    }
    setPending({ kind, value });
    setEntered("");
    // Toast confirms dispatch — code is NOT shown here.
    toast.success("Verification code sent", {
      description: `Check your inbox at ${email}`,
    });
  };

  const startPassword = () => {
    if (!currentUser) {
      toast("Sign in to change your password");
      return;
    }
    if (password.length < 8) {
      toast("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      toast("Passwords do not match");
      return;
    }
    void sendCode("password", password);
  };

  const startPasscode = () => {
    if (!/^\d{6}$/.test(passcode)) {
      toast("The backend passcode must be 6 digits");
      return;
    }
    void sendCode("passcode", passcode);
  };

  const verify = async () => {
    if (!pending) return;
    setVerifying(true);

    // Verify the OTP against Supabase — this is the real email OTP check.
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: entered.trim(),
      type: "email",
    });
    setVerifying(false);

    if (error) {
      toast.error("Incorrect or expired verification code");
      return;
    }

    if (pending.kind === "password") {
      if (!currentUser) {
        toast.error("Sign in to change your password");
        return;
      }
      const result = await changePassword(currentUser.id, pending.value);
      if (!result.ok) {
        toast.error(result.error ?? "Could not update password");
        return;
      }
      setPassword("");
      setConfirm("");
      toast.success("Password updated");
    } else {
      changePasscode(pending.value);
      setPasscode("");
      toast.success("Backend passcode updated");
    }
    setPending(null);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <DataCard className="space-y-3 p-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <KeyRound className="h-4 w-4" /> Change my login password
          </p>
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="h-11"
            />
          </div>
          <Button className="h-11 w-full" onClick={startPassword} disabled={sending}>
            {sending ? "Sending…" : "Send verification email"}
          </Button>
        </DataCard>

        <DataCard className="space-y-3 p-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="h-4 w-4" /> Change back office passcode
          </p>
          <div className="space-y-2">
            <Label htmlFor="new-passcode">New 6-digit passcode</Label>
            <Input
              id="new-passcode"
              inputMode="numeric"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="h-11"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Required whenever the back office is opened from the register.
          </p>
          <Button className="h-11 w-full" onClick={startPasscode} disabled={sending}>
            {sending ? "Sending…" : "Send verification email"}
          </Button>
        </DataCard>
      </div>

      {pending && (
        <DataCard className="space-y-3 p-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <MailCheck className="h-4 w-4" /> Enter the 6-digit code emailed to {email}
          </p>
          <div className="flex flex-wrap gap-2">
            <Input
              value={entered}
              onChange={(e) => setEntered(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              aria-label="Verification code"
              className="h-11 w-40"
            />
            <Button className="h-11" onClick={() => void verify()} disabled={verifying}>
              {verifying ? "Confirming…" : "Confirm change"}
            </Button>
            <Button variant="ghost" className="h-11" onClick={() => setPending(null)}>
              Cancel
            </Button>
          </div>
        </DataCard>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">Users</p>
        <Button className="h-11" onClick={() => setUserOpen(true)}>
          <UserPlus className="h-4 w-4" /> Add user
        </Button>
      </div>
      <DataTable
        columns={userColumns((id, active) => updateUser(id, { active }))}
        rows={users}
        getKey={(u) => u.id}
        empty="No users yet."
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">Security log</p>
        <Button variant="secondary" className="h-11" onClick={clearSecurityLog}>
          Clear log
        </Button>
      </div>
      <DataTable
        columns={logColumns}
        rows={securityLog}
        getKey={(e) => e.id}
        empty="No security activity recorded yet."
      />

      <AddUserModal open={userOpen} onOpenChange={setUserOpen} onCreate={createUser} />
    </div>
  );
}

function AddUserModal({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: {
    name: string;
    email: string;
    role: StaffRole;
    password: string;
  }) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("Cashier");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim() || !email.trim()) {
      toast("Name and email are required");
      return;
    }
    if (password.length < 8) {
      toast("Password must be at least 8 characters");
      return;
    }
    setBusy(true);
    const result = await onCreate({ name: name.trim(), email: email.trim(), role, password });
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error ?? "Could not invite staff member");
      return;
    }
    toast.success(`${name.trim()} invited as ${role}`);
    setName("");
    setEmail("");
    setPassword("");
    setRole("Cashier");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add user</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="user-name">Full name</Label>
            <Input
              id="user-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-email">Email</Label>
            <Input
              id="user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-role">Role</Label>
            <select
              id="user-role"
              value={role}
              onChange={(e) => setRole(e.target.value as StaffRole)}
              className={selectClass}
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r} — {rolePermissions[r]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-password">Temporary password</Label>
            <Input
              id="user-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11"
            />
          </div>
          <Button className="h-11 w-full" onClick={() => void save()} disabled={busy}>
            Invite user
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function userColumns(setActive: (id: string, active: boolean) => void): Column<AppUser>[] {
  return [
    { header: "Name", width: "1.2fr", cell: (u) => <span className="font-medium">{u.name}</span> },
    {
      header: "Email",
      width: "1.5fr",
      cell: (u) => <span className="text-sm text-muted-foreground">{u.email}</span>,
    },
    { header: "Role", cell: (u) => <span className="text-sm">{u.role}</span> },
    {
      header: "Access",
      width: "1.6fr",
      cell: (u) => <span className="text-sm text-muted-foreground">{rolePermissions[u.role]}</span>,
    },
    {
      header: "Status",
      width: "1.2fr",
      cell: (u) => (
        <span className="flex items-center justify-end gap-2">
          <StatusPill
            status={u.active ? "healthy" : "low"}
            label={u.active ? "Active" : "Disabled"}
          />
          <Button variant="secondary" className="h-9" onClick={() => setActive(u.id, !u.active)}>
            {u.active ? "Disable" : "Enable"}
          </Button>
        </span>
      ),
    },
  ];
}

const logColumns: Column<SecurityEvent>[] = [
  {
    header: "When",
    width: "1.3fr",
    cell: (e) => (
      <span className="text-sm text-muted-foreground">
        {new Date(e.timestamp).toLocaleString()}
      </span>
    ),
  },
  {
    header: "Event",
    width: "1.3fr",
    cell: (e) => <span className="font-medium">{eventLabels[e.kind]}</span>,
  },
  { header: "User", cell: (e) => <span className="text-sm">{e.user}</span> },
  {
    header: "Location",
    width: "1.3fr",
    cell: (e) => <span className="text-sm text-muted-foreground">{e.location}</span>,
  },
  {
    header: "Detail",
    width: "1.3fr",
    cell: (e) => <span className="text-sm text-muted-foreground">{e.detail ?? "—"}</span>,
  },
];
