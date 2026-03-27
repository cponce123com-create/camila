import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard, Store, FileText, Megaphone, LifeBuoy,
  LogOut, Menu, X, Shield, ChevronRight, BarChart2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface AdminLayoutProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
  { icon: Store, label: "Tiendas", path: "/admin/stores" },
  { icon: BarChart2, label: "Analítica", path: "/admin/analytics" },
  { icon: FileText, label: "Auditoría", path: "/admin/audit" },
  { icon: LifeBuoy, label: "Soporte", path: "/admin/support" },
  { icon: Megaphone, label: "Anuncios", path: "/admin/announcements" },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === "/admin") return location === "/admin";
    return location.startsWith(path);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full" style={{ background: "hsl(var(--sidebar-bg))" }}>
      {/* Brand */}
      <div
        className="flex items-center gap-3 px-5 py-6"
        style={{ borderBottom: "1px solid hsl(var(--sidebar-border))" }}
      >
        <div
          className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md"
          style={{ background: "hsl(var(--sidebar-accent))" }}
        >
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div>
          <p
            className="font-bold text-sm font-display leading-tight"
            style={{ color: "hsl(var(--sidebar-fg))" }}
          >
            Camila Admin
          </p>
          <p className="text-xs" style={{ color: "hsl(var(--sidebar-muted))" }}>
            Superadmin
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto sidebar-scroll">
        {NAV_ITEMS.map(({ icon: Icon, label, path }) => {
          const active = isActive(path);
          return (
            <Link key={path} href={path} onClick={() => setOpen(false)}>
              <div
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer"
                style={{
                  background: active ? "hsl(var(--sidebar-active-bg))" : "transparent",
                  color: active ? "hsl(var(--sidebar-fg))" : "hsl(var(--sidebar-muted))",
                  borderLeft: active ? "3px solid hsl(var(--sidebar-accent))" : "3px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = "hsl(var(--sidebar-hover-bg))";
                    (e.currentTarget as HTMLElement).style.color = "hsl(var(--sidebar-fg))";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "hsl(var(--sidebar-muted))";
                  }
                }}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{label}</span>
                {active && <ChevronRight className="h-3.5 w-3.5 opacity-50" />}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User Footer */}
      <div
        className="px-3 pb-5 pt-4 space-y-2"
        style={{ borderTop: "1px solid hsl(var(--sidebar-border))" }}
      >
        <div
          className="px-3 py-2.5 rounded-xl"
          style={{ background: "hsl(var(--sidebar-hover-bg))" }}
        >
          <p
            className="text-xs font-semibold truncate"
            style={{ color: "hsl(var(--sidebar-fg))" }}
          >
            {user?.name}
          </p>
          <p className="text-xs truncate" style={{ color: "hsl(var(--sidebar-muted))" }}>
            {user?.email}
          </p>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer"
          style={{ color: "hsl(var(--sidebar-muted))" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.12)";
            (e.currentTarget as HTMLElement).style.color = "#fca5a5";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "hsl(var(--sidebar-muted))";
          }}
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex w-60 flex-col fixed inset-y-0 left-0 z-40 shadow-sidebar"
        style={{ background: "hsl(var(--sidebar-bg))" }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center px-4 h-14 backdrop-blur-md"
        style={{
          background: "hsl(var(--sidebar-bg) / 0.97)",
          borderBottom: "1px solid hsl(var(--sidebar-border))",
        }}
      >
        <Button
          variant="ghost"
          size="icon"
          className="text-white/70 hover:text-white hover:bg-white/10"
          onClick={() => setOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2 ml-3">
          <div
            className="h-7 w-7 rounded-lg flex items-center justify-center"
            style={{ background: "hsl(var(--sidebar-accent))" }}
          >
            <Shield className="h-4 w-4 text-white" />
          </div>
          <span
            className="font-bold text-sm font-display"
            style={{ color: "hsl(var(--sidebar-fg))" }}
          >
            Camila Admin
          </span>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.22 }}
              className="fixed inset-y-0 left-0 z-50 w-64 md:hidden flex flex-col shadow-sidebar"
              style={{ background: "hsl(var(--sidebar-bg))" }}
            >
              <div className="absolute top-3 right-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/60 hover:text-white hover:bg-white/10"
                  onClick={() => setOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="flex-1 md:ml-60 min-h-screen">
        <div className="pt-14 md:pt-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
