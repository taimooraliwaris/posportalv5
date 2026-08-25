import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  Barcode,
  Banknote,
  LogOut,
  Menu,
  Moon,
  Plus,
  Search,
  Server,
  Sun,
  Tag,
  UserRound,
  Undo2,
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
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme";
import { useBackend, useStore } from "@/lib/backend-context";
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
  const { orders, activeOrderId, setActiveOrderId, newOrder, productList } = usePos();
  const store = useStore();
  const { lowStock } = useBackend();
  const { dark, toggle } = useTheme();
  const { currentUser, signOut } = useAuth();
  const navigate = useNavigate();
  const [cashOpen, setCashOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);

  const openTabs = orders.filter((o) => o.status !== "paid" && o.status !== "cancelled");

  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-border bg-card px-3 py-2">
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
        <div className="flex shrink-0 overflow-hidden rounded-md border border-border">
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
                "min-h-11 shrink-0 rounded-md border border-border px-4 text-sm font-medium transition-colors",
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

      {onSearch && (
        <div className="order-last w-full shrink-0 lg:order-none lg:w-auto lg:flex-[2] lg:justify-center">
          <div className="relative mx-auto w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search products..."
              className="h-11 pl-9"
            />
          </div>
        </div>
      )}

      <div className="flex flex-1 items-center justify-end gap-2">
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
        {lowStock.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="hidden shrink-0 items-center gap-1.5 rounded-full bg-warning/40 px-3 py-1.5 text-xs font-medium md:flex"
                aria-label={`${lowStock.length} products low on stock`}
              >
                <AlertTriangle className="h-3.5 w-3.5" /> {lowStock.length} low stock
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {lowStock.slice(0, 6).map((item) => (
                <DropdownMenuItem
                  key={item.productId}
                  onSelect={() => navigate({ to: "/backend/inventory" })}
                >
                  <span className="truncate">
                    {productList.find((p) => p.id === item.productId)?.name ?? item.productId}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {item.onHand - item.reserved} left
                  </span>
                </DropdownMenuItem>
              ))}
              {lowStock.length > 6 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => navigate({ to: "/backend/inventory" })}>
                    View all {lowStock.length} low-stock products
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-success-soft px-3 py-1.5 text-xs font-medium sm:flex">
          <Wifi className="h-3.5 w-3.5" /> {store.network}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-foreground text-sm font-semibold text-background"
              aria-label={currentUser ? `Account: ${currentUser.name}` : "Account"}
            >
              {(currentUser?.name ?? store.cashier).charAt(0).toUpperCase()}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem disabled className="flex-col items-start gap-0.5">
              <span className="text-sm font-medium">{currentUser?.name ?? store.cashier}</span>
              <span className="text-xs text-muted-foreground">
                {currentUser ? `${currentUser.email} - ${currentUser.role}` : "Not signed in"}
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                void (async () => {
                  await signOut();
                  toast.success("Signed out");
                  navigate({ to: "/auth", replace: true });
                })();
              }}
            >
              <UserRound className="h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label="Menu">
              <Menu className="h-6 w-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuItem onSelect={() => navigate({ to: "/returns" })}>
              <Undo2 className="h-4 w-4" /> Return / Exchange Order
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
            <DropdownMenuItem onSelect={() => navigate({ to: "/price-check" })}>
              <Tag className="h-4 w-4" /> Price check
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setCashOpen(true)}>
              <Banknote className="h-4 w-4" /> Cash In/Out
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setProductOpen(true)}>
              <Plus className="h-4 w-4" /> Create Product
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate({ to: "/backend" })}>
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
