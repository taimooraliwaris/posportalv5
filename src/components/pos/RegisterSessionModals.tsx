// @ts-nocheck
import { useState, useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  Banknote,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  History,
  Lock,
  LogOut,
  Sparkles,
  User,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePos } from "@/lib/pos-context";
import { useAuth } from "@/lib/auth-context";
import { useStore } from "@/lib/backend-context";
import { formatRs } from "@/lib/pos-data";
import { toast } from "sonner";

const presetFloats = [2000, 5000, 10000, 15000, 20000];

/**
 * Mandatory Opening Cash Float Modal
 * Appears when register is not yet opened for the active date.
 * Cashier MUST enter starting float to unlock register.
 */
export function OpenRegisterModal({ open }: { open: boolean }) {
  const { openRegister } = usePos();
  const { currentUser } = useAuth();
  const store = useStore();
  const [amount, setAmount] = useState("5000");

  const handleOpen = () => {
    const num = Number(amount);
    if (isNaN(num) || num < 0) {
      toast.error("Please enter a valid starting cash float (e.g. Rs. 5,000)");
      return;
    }

    openRegister(num);
    toast.success(`Register opened with starting cash float of ${formatRs(num)}`);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-md p-6 border-2 border-primary/40 rounded-2xl shadow-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lock className="h-7 w-7" />
          </div>
          <DialogTitle className="mt-3 text-xl font-bold text-foreground">
            Start Register &amp; Open Cash Float
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Enter the starting physical cash amount present in the drawer to begin today's shift.
          </p>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Cashier & Shift Info */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-3 text-xs">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <span>Cashier: <strong className="text-foreground">{currentUser?.name ?? store.cashier}</strong></span>
            </div>
            <div className="flex items-center gap-1 font-mono text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>{new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">Starting Cash Float</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-base font-bold text-muted-foreground">
                Rs.
              </span>
              <Input
                autoFocus
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="h-12 pl-12 font-mono text-xl font-bold"
              />
            </div>

            {/* Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {presetFloats.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAmount(String(p))}
                  className="rounded-md border border-border bg-secondary/60 px-2.5 py-1 text-xs font-mono font-medium text-foreground hover:bg-secondary"
                >
                  +{p}
                </button>
              ))}
            </div>
          </div>

          {/* Confirm Button */}
          <div className="pt-2">
            <Button
              className="h-12 w-full text-base font-bold shadow-md gap-2"
              onClick={handleOpen}
            >
              <CheckCircle2 className="h-5 w-5" /> Open Register &amp; Start Shift
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Previous Shift Handover Modal
 * Shown when date rolled over and yesterday's register was soft-closed.
 */
export function PreviousShiftReviewModal({ open }: { open: boolean }) {
  const { dismissPreviousShiftClose } = usePos();
  const navigate = useNavigate();

  const previousSnapshot = useMemo(() => {
    try {
      const saved = localStorage.getItem("velora_last_z_report");
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-md p-6 border-2 border-warning/40 rounded-2xl shadow-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-warning/15 text-warning">
            <History className="h-7 w-7" />
          </div>
          <DialogTitle className="mt-3 text-lg font-bold text-foreground">
            Previous Shift Auto-Closed
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            The date changed since the last session. Yesterday's register was soft-closed.
          </p>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {previousSnapshot && (
            <div className="rounded-xl border border-border bg-muted/40 p-4 text-xs space-y-2">
              <div className="font-semibold text-foreground">Previous Shift Summary:</div>
              <div className="flex justify-between text-muted-foreground">
                <span>Total Sales:</span>
                <span className="font-mono font-bold text-foreground">{formatRs(previousSnapshot.totalSales || 0)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Expected Cash:</span>
                <span className="font-mono font-bold text-foreground">{formatRs(previousSnapshot.expectedCash || 0)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Closed at:</span>
                <span>{previousSnapshot.closedAt ? new Date(previousSnapshot.closedAt).toLocaleTimeString() : "Midnight"}</span>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button
              className="h-11 font-bold"
              onClick={() => {
                dismissPreviousShiftClose();
                toast.success("Previous shift acknowledged. Opening new day register.");
              }}
            >
              <Sparkles className="mr-2 h-4 w-4" /> Open Today's Cash Counter
            </Button>
            <Button
              variant="outline"
              className="h-10 text-xs"
              onClick={() => {
                dismissPreviousShiftClose();
                navigate({ to: "/z-report" });
              }}
            >
              View Full Z-Report
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 15-Minute End-of-Day Closing Alert Modal
 * Automatically alerts the cashier at 23:45 (11:45 PM) to reconcile and close before midnight.
 */
export function EndOfDayWarningModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md p-6 border-2 border-destructive/40 rounded-2xl shadow-2xl">
        <DialogHeader className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/15 text-destructive animate-pulse">
            <Clock className="h-7 w-7" />
          </div>
          <DialogTitle className="mt-3 text-lg font-bold text-foreground">
            End of Day Closing Warning (11:45 PM)
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            The business day ends in approximately 15 minutes. Please reconcile your cash drawer and close the counter cleanly.
          </p>
        </DialogHeader>

        <div className="mt-4 space-y-2">
          <Button
            className="h-12 w-full font-bold shadow-md bg-primary gap-2"
            onClick={() => {
              onClose();
              navigate({ to: "/close-register" });
            }}
          >
            <LogOut className="h-4 w-4" /> Reconcile &amp; Close Register Now
          </Button>
          <Button variant="outline" className="h-10 w-full text-xs" onClick={onClose}>
            Dismiss &amp; Continue Working
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
