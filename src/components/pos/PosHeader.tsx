import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Barcode,
  Banknote,
  Download,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Plus,
  RefreshCw,
  Search,
  Server,
  Sun,
  Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePos } from "@/lib/pos-context";
import { useTheme } from "@/lib/theme";
import { STORE } from "@/lib/pos-data";
import { cn } from "@/lib/utils";
import { CashInOutModal, NewProductModal } from "./MenuModals";
import { toast } from "sonner";

export function PosHeader({
  tab,
  search,
  onSearch,
  onScan,
}: {
  tab: "register" | "orders";
  search?: string;
  onSearch?: (v: string) => void;
  onScan?: () => void;
}) {
  const { orders, activeOrderId, setActiveOrderId, newOrder } = usePos();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const [cashOpen, setCashOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);

  const openTabs = orders.filter((o) => o.status !== "paid" && o.status !== "cancelled");

  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-card px-3 py-2 lg:flex lg:flex-wrap">
      <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
        <div className="flex shrink-0 overflow-hidden rounded-xl border border-border">
          <Link
            to="/till"
            className={cn(
              "grid min-h-11 place-items-center px-4 text-sm font-medium",
              tab === "register" ? "bg-accent text-accent-foreground" : "bg-card",
            )}
          >
            Register
          </Link>
          <Link
            to="/orders"
            className={cn(
              "grid min-h-11 place-items-center border-l border-border px-4 text-sm font-medium",
              tab === "orders" ? "bg-accent text-accent-foreground" : "bg-card",
            )}
          >
            Orders
          </Link>
        </div>
        <Button
          variant="secondary"
          size="icon"
          className="h-11 w-11 shrink-0"
          onClick={() => {
            newOrder();
            navigate({ to: "/till" });
          }}
          aria-label="New order"
        >
          <Plus className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-1.5">
          {openTabs.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => {
                setActiveOrderId(o.id);
                navigate({ to: "/till" });
              }}
              className={cn(
                "min-h-11 shrink-0 rounded-xl border border-border px-4 text-sm font-medium transition-colors",
                o.id === activeOrderId && tab === "register"
                  ? "border-primary bg-accent text-accent-foreground"
                  : "bg-card",
              )}
            >
              {o.number}
            </button>
          ))}
        </div>
      </div>

      <div className="col-span-2 flex min-w-0 flex-1 items-center gap-2 lg:col-auto">
        {onSearch && (
          <div className="relative min-w-0 flex-1 lg:mx-4 lg:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search products..."
              className="h-11 pl-9"
            />
          </div>
        )}
        {onScan && (
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 shrink-0"
            onClick={onScan}
            aria-label="Scan barcode"
          >
            <Barcode className="h-6 w-6" />
          </Button>
        )}
        <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-success-soft px-3 py-1.5 text-xs font-medium sm:flex">
          <Wifi className="h-3.5 w-3.5" /> {STORE.network}
        </span>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-foreground text-sm font-semibold text-background">
          R
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label="Menu">
              <Menu className="h-6 w-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <div className="m-1 rounded-lg bg-info px-3 py-2 text-sm font-medium text-info-foreground">
              <Wifi className="mr-2 inline h-4 w-4" /> Wifi: {STORE.network}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => toast("Customer display opened on screen 2")}>
              <Monitor className="h-4 w-4" /> Customer Display
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                toggle();
              }}
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {dark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => toast("Install prompt is not available in preview")}>
              <Download className="h-4 w-4" /> Install App
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setCashOpen(true)}>
              <Banknote className="h-4 w-4" /> Cash In/Out
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => toast.success("Data reloaded")}>
              <RefreshCw className="h-4 w-4" /> Reload Data
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setProductOpen(true)}>
              <Plus className="h-4 w-4" /> Create Product
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => toast("Backend is coming soon")}>
              <Server className="h-4 w-4" /> Backend
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate({ to: "/close-register" })}>
              <LogOut className="h-4 w-4" /> Close Register
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CashInOutModal open={cashOpen} onOpenChange={setCashOpen} />
      <NewProductModal open={productOpen} onOpenChange={setProductOpen} />
    </header>
  );
}
