import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { 
  LayoutDashboard, Package, Tags, ArrowLeftRight, 
  Users, Settings, LogOut, Menu, X, ShieldCheck, Palette,
  MessageSquare, UtensilsCrossed, ShoppingBag, BarChart2, ChevronRight,
  ExternalLink, Share2, CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { differenceInDays, parseISO } from "date-fns";

interface DashboardLayoutProps {
  children: ReactNode;
}

const BASE_MENU_GROUPS = [
  {
    label: null,
    items: [
      { icon: LayoutDashboard, label: "Inicio", path: "/dashboard" },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { icon: Package, label: "Productos", path: "/dashboard/products" },
      { icon: Tags, label: "Categorías", path: "/dashboard/categories" },
      { icon: MessageSquare, label: "Reseñas", path: "/dashboard/reviews" },
    ],
  },
  {
    label: "Operaciones",
    items: [
      { icon: ArrowLeftRight, label: "Inventario", path: "/dashboard/inventory" },
      { icon: ShoppingBag, label: "Ventas", path: "/dashboard/sales" },
      { icon: BarChart2, label: "Analítica", path: "/dashboard/analytics" },
    ],
  },
  {
    label: "Ajustes",
    items: [
      { icon: Palette, label: "Personalización", path: "/dashboard/customize" },
      { icon: Users, label: "Equipo", path: "/dashboard/team" },
      { icon: Settings, label: "Configuración", path: "/dashboard/settings" },
    ],
  },
];

const RESTAURANT_GROUP = {
  label: "Módulos",
  items: [
    { icon: UtensilsCrossed, label: "Restaurante", path: "/dashboard/restaurant" },
  ],
};

const SUPERADMIN_MENU = [
  { icon: ShieldCheck, label: "Panel de Control", path: "/admin" },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, store, license, logout, isLoading } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-3 w-48">
          <div className="h-8 rounded-lg bg-muted animate-pulse" />
          <div className="h-4 rounded-lg bg-muted animate-pulse w-3/4" />
          <div className="h-4 rounded-lg bg-muted animate-pulse w-1/2" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const isSuperAdmin = user.role === "superadmin";
  const isStoreAdmin = user.role === "store_admin";
  const isRestaurant = (store as any)?.businessType === "restaurant";
  const baseGroups = isRestaurant
    ? [...BASE_MENU_GROUPS.slice(0, 3), RESTAURANT_GROUP, BASE_MENU_GROUPS[3]]
    : BASE_MENU_GROUPS;

  // Inject "Facturación" into the Ajustes group for store_admin only
  const MENU_GROUPS = isStoreAdmin
    ? baseGroups.map((g) =>
        g.label === "Ajustes"
          ? { ...g, items: [...g.items, { icon: CreditCard, label: "Facturación", path: "/dashboard/billing" }] }
          : g
      )
    : baseGroups;

  const isActive = (path: string) =>
    path === "/dashboard" ? location === path : location.startsWith(path);

  let banner = null;
  if (!isSuperAdmin && license) {
    if (license.status === "trial") {
      const daysLeft = license.expiresAt
        ? differenceInDays(parseISO(license.expiresAt), new Date())
        : 0;
      banner = (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-800 px-4 py-2 text-center text-sm font-medium">
          ⏳ Período de prueba —{" "}
          {daysLeft > 0 ? `${daysLeft} días restantes` : "Último día"}
        </div>
      );
    } else if (license.status === "expired") {
      banner = (
        <div className="bg-red-50 border-b border-red-200 text-red-700 px-4 py-2 text-center text-sm font-medium">
          Tu licencia ha vencido.{" "}
          <Link href="/dashboard/billing" className="underline font-semibold hover:text-red-800">
            Renueva aquí →
          </Link>
        </div>
      );
    } else if (license.status === "suspended") {
      banner = (
        <div className="bg-orange-50 border-b border-orange-200 text-orange-700 px-4 py-2 text-center text-sm font-medium">
          Cuenta suspendida —{" "}
          <Link href="/dashboard/billing" className="underline font-semibold hover:text-orange-800">
            revisa tu facturación
          </Link>{" "}
          o contacta soporte
        </div>
      );
    }
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full" style={{ background: "hsl(var(--sidebar-bg))" }}>
      {/* Brand */}
      <div className="px-5 pt-6 pb-5" style={{ borderBottom: "1px solid hsl(var(--sidebar-border))" }}>
        <Link href="/" className="flex items-center gap-3">
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md"
            style={{ background: "hsl(var(--sidebar-accent))" }}
          >
            <img
              src={`${import.meta.env.BASE_URL}images/camila-logo.png`}
              alt="Camila"
              className="h-5 w-5 object-contain brightness-0 invert"
            />
          </div>
          <span
            className="font-display font-bold text-xl tracking-tight"
            style={{ color: "hsl(var(--sidebar-fg))" }}
          >
            Camila
          </span>
        </Link>

        {!isSuperAdmin && store && (
          <div
            className="mt-4 px-3 py-2.5 rounded-xl"
            style={{
              background: "hsl(var(--sidebar-hover-bg))",
              border: "1px solid hsl(var(--sidebar-border))",
            }}
          >
            <p className="text-xs uppercase tracking-widest font-semibold mb-0.5" style={{ color: "hsl(var(--sidebar-muted))" }}>
              Tu negocio
            </p>
            <p className="text-sm font-semibold truncate" style={{ color: "hsl(var(--sidebar-fg))" }}>
              {store.businessName}
            </p>
            {(store as unknown as { slug?: string }).slug && (
              <a
                href={`/tienda/${(store as unknown as { slug?: string }).slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 flex items-center gap-1 text-xs transition-colors hover:opacity-80"
                style={{ color: "hsl(var(--sidebar-accent))" }}
              >
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">Ver tienda pública</span>
              </a>
            )}
            {(store as unknown as { slug?: string; whatsapp?: string }).slug &&
              (store as unknown as { whatsapp?: string }).whatsapp && (
              <button
                onClick={() => {
                  const s = store as unknown as { slug: string; whatsapp: string; businessName?: string };
                  const wa = s.whatsapp.replace(/^51/, "").replace(/\D/g, "");
                  const text = encodeURIComponent(
                    `Hola, visita mi tienda en camila.pe/tienda/${s.slug}`
                  );
                  window.open(`https://wa.me/51${wa}?text=${text}`, "_blank");
                }}
                className="mt-1.5 flex items-center gap-1 text-xs transition-colors hover:opacity-80 w-full text-left"
                style={{ color: "#25D366" }}
              >
                <Share2 className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">Compartir mi tienda</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto sidebar-scroll space-y-5">
        {isSuperAdmin ? (
          <div className="space-y-0.5">
            {SUPERADMIN_MENU.map((item) => {
              const active = isActive(item.path);
              const Icon = item.icon;
              return (
                <NavItem
                  key={item.path}
                  icon={Icon}
                  label={item.label}
                  active={active}
                  onClick={() => setIsMobileMenuOpen(false)}
                  href={item.path}
                />
              );
            })}
          </div>
        ) : (
          MENU_GROUPS.map((group, gi) => (
            <div key={gi} className="space-y-0.5">
              {group.label && (
                <p
                  className="px-3 pb-1 text-xs font-semibold uppercase tracking-widest"
                  style={{ color: "hsl(var(--sidebar-muted))" }}
                >
                  {group.label}
                </p>
              )}
              {group.items.map((item) => {
                const active = isActive(item.path);
                const Icon = item.icon;
                return (
                  <NavItem
                    key={item.path}
                    icon={Icon}
                    label={item.label}
                    active={active}
                    onClick={() => setIsMobileMenuOpen(false)}
                    href={item.path}
                  />
                );
              })}
            </div>
          ))
        )}
      </nav>

      {/* User Footer */}
      <div
        className="px-3 pb-5 pt-4"
        style={{ borderTop: "1px solid hsl(var(--sidebar-border))" }}
      >
        <div className="flex items-center gap-3 px-2 py-2 mb-3 rounded-xl" style={{ background: "hsl(var(--sidebar-hover-bg))" }}>
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ background: "hsl(var(--sidebar-accent))", color: "hsl(var(--sidebar-fg))" }}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold truncate leading-tight" style={{ color: "hsl(var(--sidebar-fg))" }}>
              {user.name}
            </p>
            <p className="text-xs truncate capitalize" style={{ color: "hsl(var(--sidebar-muted))" }}>
              {user.role}
            </p>
          </div>
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
          <LogOut className="h-4 w-4 shrink-0" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {banner}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-64 flex-col flex-shrink-0 shadow-sidebar z-10" style={{ background: "hsl(var(--sidebar-bg))" }}>
          <SidebarContent />
        </aside>

        {/* Mobile Header */}
        <div
          className="md:hidden absolute top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-20 backdrop-blur-md"
          style={{
            background: "hsl(var(--sidebar-bg) / 0.97)",
            borderBottom: "1px solid hsl(var(--sidebar-border))",
          }}
        >
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className="h-7 w-7 rounded-lg flex items-center justify-center"
              style={{ background: "hsl(var(--sidebar-accent))" }}
            >
              <img
                src={`${import.meta.env.BASE_URL}images/camila-logo.png`}
                alt="Camila"
                className="h-4 w-4 object-contain brightness-0 invert"
              />
            </div>
            <span className="font-display font-bold text-base" style={{ color: "hsl(var(--sidebar-fg))" }}>
              Camila
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            aria-label={isMobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="md:hidden fixed inset-0 z-30 bg-black/50"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <motion.aside
                initial={{ x: -280, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -280, opacity: 0 }}
                transition={{ type: "tween", duration: 0.22 }}
                className="md:hidden fixed inset-y-0 left-0 w-64 z-40 flex flex-col pt-14"
                style={{ background: "hsl(var(--sidebar-bg))" }}
              >
                <SidebarContent />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main id="main-content" className="flex-1 overflow-y-auto pt-14 md:pt-0">
          <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-full">
            {children}
          </div>
        </main>
      </div>

      {/* Onboarding wizard — only for store_admin users with incomplete profile */}
      {user.role === "store_admin" && store && (
        <OnboardingWizard store={store} />
      )}
    </div>
  );
}

function NavItem({
  icon: Icon,
  label,
  active,
  href,
  onClick,
}: {
  icon: any;
  label: string;
  active: boolean;
  href: string;
  onClick: () => void;
}) {
  return (
    <Link href={href} onClick={onClick}>
      <div
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer relative"
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
}
