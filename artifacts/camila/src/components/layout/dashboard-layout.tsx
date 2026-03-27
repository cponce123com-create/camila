import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  LayoutDashboard, Package, Tags, ArrowLeftRight, 
  Users, Settings, LogOut, Menu, X, ShieldCheck, Palette, MessageSquare, UtensilsCrossed, ShoppingBag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { differenceInDays, parseISO } from "date-fns";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, store, license, logout, isLoading } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  if (!user) return null;

  const isSuperAdmin = user.role === 'superadmin';

  const menuItems = isSuperAdmin ? [
    { icon: ShieldCheck, label: 'Panel de Control', path: '/admin' },
  ] : [
    { icon: LayoutDashboard, label: 'Inicio', path: '/dashboard' },
    { icon: Package, label: 'Productos', path: '/dashboard/products' },
    { icon: Tags, label: 'Categorías', path: '/dashboard/categories' },
    { icon: ArrowLeftRight, label: 'Inventario', path: '/dashboard/inventory' },
    { icon: MessageSquare, label: 'Reseñas', path: '/dashboard/reviews' },
    { icon: ShoppingBag, label: 'Ventas', path: '/dashboard/sales' },
    { icon: UtensilsCrossed, label: 'Restaurante', path: '/dashboard/restaurant' },
    { icon: Palette, label: 'Personalización', path: '/dashboard/customize' },
    { icon: Users, label: 'Equipo', path: '/dashboard/team' },
    { icon: Settings, label: 'Configuración', path: '/dashboard/settings' },
  ];

  // Calculate License Banner
  let banner = null;
  if (!isSuperAdmin && license) {
    if (license.status === 'trial') {
      const daysLeft = license.expiresAt ? differenceInDays(parseISO(license.expiresAt), new Date()) : 0;
      banner = (
        <div className="bg-accent/10 border-b border-accent/20 text-accent-foreground px-4 py-2 text-center text-sm font-medium">
          Período de prueba - {daysLeft > 0 ? `${daysLeft} días restantes` : 'Último día'}
        </div>
      );
    } else if (license.status === 'expired') {
      banner = (
        <div className="bg-destructive/10 border-b border-destructive/20 text-destructive px-4 py-2 text-center text-sm font-medium">
          Licencia vencida - contacta al administrador para renovar
        </div>
      );
    } else if (license.status === 'suspended') {
      banner = (
        <div className="bg-orange-500/10 border-b border-orange-500/20 text-orange-600 px-4 py-2 text-center text-sm font-medium">
          Cuenta suspendida - contacta soporte
        </div>
      );
    }
  }

  const SidebarContent = () => (
    <>
      <div className="p-6">
        <Link href="/" className="flex items-center gap-3">
          <img src={`${import.meta.env.BASE_URL}images/camila-logo.png`} alt="Camila" className="h-8 w-8 object-contain" />
          <span className="font-display font-bold text-xl tracking-tight text-primary">Camila</span>
        </Link>
        {!isSuperAdmin && store && (
          <div className="mt-6 px-3 py-2 bg-secondary/50 rounded-lg border border-border/50">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Tu Negocio</p>
            <p className="font-medium text-foreground truncate">{store.businessName}</p>
          </div>
        )}
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = location === item.path || (item.path !== '/dashboard' && location.startsWith(item.path));
          const Icon = item.icon;
          return (
            <Link key={item.path} href={item.path} onClick={() => setIsMobileMenuOpen(false)}>
              <div className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${isActive 
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' 
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }
              `}>
                <Icon className={`h-5 w-5 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border/50">
        <div className="flex items-center gap-3 px-3 py-2 mb-4">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.role}</p>
          </div>
        </div>
        <Button variant="outline" className="w-full justify-start text-muted-foreground" onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar sesión
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {banner}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-72 flex-col bg-card border-r border-border/50 shadow-sm z-10">
          <SidebarContent />
        </aside>

        {/* Mobile Header & Sidebar */}
        <div className="md:hidden absolute top-0 left-0 right-0 h-16 bg-card border-b border-border/50 flex items-center justify-between px-4 z-20">
          <Link href="/" className="flex items-center gap-2">
            <img src={`${import.meta.env.BASE_URL}images/camila-logo.png`} alt="Camila" className="h-6 w-6" />
            <span className="font-display font-bold text-lg text-primary">Camila</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.aside 
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              className="md:hidden fixed inset-y-0 left-0 w-72 bg-card shadow-2xl z-50 flex flex-col pt-16"
            >
              <SidebarContent />
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-background/50 pt-16 md:pt-0">
          <div className="p-4 md:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
