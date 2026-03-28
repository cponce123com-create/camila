import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";

// Eagerly loaded — part of critical path
import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/auth/login";
import RegisterPage from "@/pages/auth/register";
import NotFound from "@/pages/not-found";

// Lazy loaded — dashboard, admin and heavy pages
const DashboardPage = lazy(() => import("@/pages/dashboard"));
const ProductsPage = lazy(() => import("@/pages/dashboard/products"));
const CategoriesPage = lazy(() => import("@/pages/dashboard/categories"));
const InventoryPage = lazy(() => import("@/pages/dashboard/inventory"));
const TeamPage = lazy(() => import("@/pages/dashboard/team"));
const SettingsPage = lazy(() => import("@/pages/dashboard/settings"));
const CustomizePage = lazy(() => import("@/pages/dashboard/customize"));
const ReviewsPage = lazy(() => import("@/pages/dashboard/reviews"));
const SalesPage = lazy(() => import("@/pages/dashboard/sales"));
const NewSalePage = lazy(() => import("@/pages/dashboard/sales/new"));
const SaleDetailPage = lazy(() => import("@/pages/dashboard/sales/detail"));
const BillingPage = lazy(() => import("@/pages/dashboard/billing"));

// Analytics — heavy (Recharts), always lazy
const StoreAnalyticsPage = lazy(() => import("@/pages/dashboard/analytics"));
const RestaurantAnalyticsPage = lazy(() => import("@/pages/dashboard/analytics/restaurant"));

// Restaurant module
const RestaurantPage = lazy(() => import("@/pages/dashboard/restaurant"));
const RestaurantSetupPage = lazy(() => import("@/pages/dashboard/restaurant/setup"));
const RestaurantOrdersPage = lazy(() => import("@/pages/dashboard/restaurant/orders"));
const DailyMenuPage = lazy(() => import("@/pages/dashboard/restaurant/daily-menu"));
const TableOrderPage = lazy(() => import("@/pages/dashboard/restaurant/table-order"));

// Admin module
const AdminPage = lazy(() => import("@/pages/admin"));
const AdminStoresPage = lazy(() => import("@/pages/admin/stores"));
const AdminStoreDetailPage = lazy(() => import("@/pages/admin/store-detail"));
const AdminAuditPage = lazy(() => import("@/pages/admin/audit"));
const AdminSupportPage = lazy(() => import("@/pages/admin/support"));
const AdminAnnouncementsPage = lazy(() => import("@/pages/admin/announcements"));
const AdminAnalyticsPage = lazy(() => import("@/pages/admin/analytics"));
const AdminLicenseCodesPage = lazy(() => import("@/pages/admin/license-codes"));

// Public pages
const TiendaPage = lazy(() => import("@/pages/tienda"));
const PricingPage = lazy(() => import("@/pages/pricing"));

const queryClient = new QueryClient();

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {/* Public / Auth */}
        <Route path="/" component={LandingPage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/register" component={RegisterPage} />
        <Route path="/tienda/:slug" component={TiendaPage} />
        <Route path="/precios" component={PricingPage} />

        {/* Protected Dashboard */}
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/dashboard/products" component={ProductsPage} />
        <Route path="/dashboard/categories" component={CategoriesPage} />
        <Route path="/dashboard/inventory" component={InventoryPage} />
        <Route path="/dashboard/team" component={TeamPage} />
        <Route path="/dashboard/customize" component={CustomizePage} />
        <Route path="/dashboard/reviews" component={ReviewsPage} />
        <Route path="/dashboard/settings" component={SettingsPage} />

        {/* Restaurant module */}
        <Route path="/dashboard/restaurant" component={RestaurantPage} />
        <Route path="/dashboard/restaurant/setup" component={RestaurantSetupPage} />
        <Route path="/dashboard/restaurant/orders" component={RestaurantOrdersPage} />
        <Route path="/dashboard/restaurant/daily-menu" component={DailyMenuPage} />
        <Route path="/dashboard/restaurant/tables/:tableId" component={TableOrderPage} />

        {/* Sales module */}
        <Route path="/dashboard/sales" component={SalesPage} />
        <Route path="/dashboard/sales/new" component={NewSalePage} />
        <Route path="/dashboard/sales/:id" component={SaleDetailPage} />
        <Route path="/dashboard/billing" component={BillingPage} />

        {/* Protected Superadmin */}
        <Route path="/dashboard/analytics" component={StoreAnalyticsPage} />
        <Route path="/dashboard/analytics/restaurant" component={RestaurantAnalyticsPage} />

        <Route path="/admin" component={AdminPage} />
        <Route path="/admin/stores" component={AdminStoresPage} />
        <Route path="/admin/stores/:id" component={AdminStoreDetailPage} />
        <Route path="/admin/audit" component={AdminAuditPage} />
        <Route path="/admin/support" component={AdminSupportPage} />
        <Route path="/admin/announcements" component={AdminAnnouncementsPage} />
        <Route path="/admin/analytics" component={AdminAnalyticsPage} />
        <Route path="/admin/license-codes" component={AdminLicenseCodesPage} />

        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {/* Skip-to-main accessibility link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:font-semibold focus:shadow-lg"
        >
          Ir al contenido principal
        </a>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
