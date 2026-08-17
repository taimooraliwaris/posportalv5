import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
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
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/lib/theme";
import { STORE } from "@/lib/pos-data";
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

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-60 shrink-0 border-r border-border bg-card transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
            V
          </span>
          <span className="font-semibold">{STORE.brand}</span>
        </div>
        <nav className="space-y-1 p-2">
          {navItems.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
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
            <span className="hidden text-sm font-medium sm:inline">{STORE.name}</span>
            <span className="grid h-11 w-11 place-items-center rounded-md bg-foreground text-sm font-semibold text-background">
              R
            </span>
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
        <main className="min-w-0 flex-1 p-4">{children}</main>
      </div>
    </div>
  );
}
