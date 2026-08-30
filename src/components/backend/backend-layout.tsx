// @ts-nocheck
import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Boxes,
  LayoutDashboard,
  Menu,
  Moon,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Sun,
  Tags,
  UserRound,
  Users, ChevronDown, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth-context";
import { useBackend, useStore } from "@/lib/backend-context";
import { usePos } from "@/lib/pos-context";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/backend", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/backend/products", label: "Products", icon: Package },
  { to: "/backend/inventory", label: "Inventory", icon: Boxes },
  { to: "/backend/pricelists", label: "Pricelists", icon: Tags },
  { to: "/backend/customers", label: "Customers", icon: Users },
  { to: "/backend/sales", label: "Sales", icon: Receipt },
  { to: "/backend/purchases", label: "Purchases", icon: ShoppingCart },
  { to: "/backend/reports", label: "Reports", icon: BarChart3 },
  { to: "/backend/settings", label: "Settings", icon: Settings },
] as { to: string; label: string; icon: typeof Package; exact?: boolean }[];

export function BackendLayout({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { dark, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const store = useStore();
  const { lowStock } = useBackend();
  const { currentUser, signOut } = useAuth();
  const { categoryList } = usePos();
  const [productsOpen, setProductsOpen] = useState(true);
  const navigate = useNavigate();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex h-screen w-64 shrink-0 flex-col border-r border-border bg-card transition-transform lg:sticky lg:top-0 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
            {store.brand.charAt(0)}
          </span>
          <span className="truncate font-semibold">{store.brand}</span>
        </div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto custom-scrollbar p-2">
          {navItems.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);

            if (item.to === "/backend/products") {
              return (
                <div key={item.to} className="flex flex-col">
                  <div
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors cursor-pointer select-none",
                      active ? "bg-accent text-accent-foreground" : "hover:bg-muted",
                    )}
                    onClick={() => {
                      if (active) {
                        setProductsOpen(!productsOpen);
                      } else {
                        setProductsOpen(true);
                        navigate({ to: "/backend/products", search: {} });
                      }
                    }}
                  >
                    <item.icon className="h-4 w-4" /> {item.label}
                    {productsOpen ? (
                      <ChevronDown className="h-4 w-4 ml-auto opacity-50" />
                    ) : (
                      <ChevronRight className="h-4 w-4 ml-auto opacity-50" />
                    )}
                  </div>

                  <div 
                    className={cn(
                      "ml-5 flex flex-col border-l border-border pl-3 overflow-hidden transition-all duration-300 ease-in-out",
                      (productsOpen && active) ? "max-h-[500px] mt-1 pb-1 opacity-100 space-y-1" : "max-h-0 opacity-0"
                    )}
                  >
                    <Link
                      to="/backend/products/spare-parts"
                      onClick={() => setOpen(false)}
                      className="px-2 py-1.5 text-[13px] rounded hover:bg-muted text-muted-foreground flex items-center [&.active]:bg-muted [&.active]:text-foreground [&.active]:font-medium"
                    >
                      Spare Parts
                    </Link>
                    <Link
                      to="/backend/products/tyres"
                      onClick={() => setOpen(false)}
                      className="px-2 py-1.5 text-[13px] rounded hover:bg-muted text-muted-foreground flex items-center [&.active]:bg-muted [&.active]:text-foreground [&.active]:font-medium"
                    >
                      Tyres
                    </Link>
                    <Link
                      to="/backend/products/tubes"
                      onClick={() => setOpen(false)}
                      className="px-2 py-1.5 text-[13px] rounded hover:bg-muted text-muted-foreground flex items-center [&.active]:bg-muted [&.active]:text-foreground [&.active]:font-medium"
                    >
                      Tubes
                    </Link>
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={item.to}
                to={item.to as never}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                  active ? "bg-accent text-accent-foreground" : "hover:bg-muted",
                )}
              >
                <item.icon className="h-4 w-4" /> {item.label}
                {item.to === "/backend/inventory" && lowStock.length > 0 && (
                  <span className="ml-auto rounded-full bg-warning px-2 py-0.5 text-xs font-semibold text-foreground">
                    {lowStock.length}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-foreground/30 lg:hidden"
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-auto flex-wrap items-center gap-3 border-b border-border bg-card px-3 py-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-base font-semibold">{title}</h1>
          <div className="order-last w-full lg:order-none lg:w-auto lg:flex-1">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search the back office..."
              className="mx-auto h-11 max-w-md"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            {actions}
            {lowStock.length > 0 && (
              <Button variant="secondary" className="h-11 gap-2" asChild>
                <Link to="/backend/inventory">
                  <AlertTriangle className="h-4 w-4 text-warning-foreground" />
                  <span className="hidden sm:inline">Low stock</span>
                  <span className="rounded-full bg-warning px-2 py-0.5 text-xs font-semibold text-foreground">
                    {lowStock.length}
                  </span>
                </Link>
              </Button>
            )}
            <span className="hidden text-sm font-medium sm:inline">{store.name}</span>
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
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11"
              onClick={toggle}
              aria-label="Toggle dark mode"
            >
              {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Button variant="secondary" className="h-11 gap-2" asChild>
              <Link to="/till">
                <ArrowLeft className="h-4 w-4" /> Back to Till
              </Link>
            </Button>
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 overflow-y-auto custom-scrollbar">
          <ErrorBoundary name="backend_content">{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
