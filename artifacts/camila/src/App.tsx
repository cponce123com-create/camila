import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";

// Pages
import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/auth/login";
import RegisterPage from "@/pages/auth/register";
import DashboardPage from "@/pages/dashboard";
import ProductsPage from "@/pages/dashboard/products";
import CategoriesPage from "@/pages/dashboard/categories";
import InventoryPage from "@/pages/dashboard/inventory";
import TeamPage from "@/pages/dashboard/team";
import SettingsPage from "@/pages/dashboard/settings";
import CustomizePage from "@/pages/dashboard/customize";
import ReviewsPage from "@/pages/dashboard/reviews";
import AdminPage from "@/pages/admin";
import AdminStoresPage from "@/pages/admin/stores";
import AdminStoreDetailPage from "@/pages/admin/store-detail";
import AdminAuditPage from "@/pages/admin/audit";
import AdminSupportPage from "@/pages/admin/support";
import AdminAnnouncementsPage from "@/pages/admin/announcements";
import AdminAnalyticsPage from "@/pages/admin/analytics";
import StoreAnalyticsPage from "@/pages/dashboard/analytics";
import RestaurantAnalyticsPage from "@/pages/dashboard/analytics/restaurant";
import NotFound from "@/pages/not-found";

// Restaurant pages
import RestaurantPage from "@/pages/dashboard/restaurant";
import RestaurantSetupPage from "@/pages/dashboard/restaurant/setup";
import RestaurantOrdersPage from "@/pages/dashboard/restaurant/orders";
import DailyMenuPage from "@/pages/dashboard/restaurant/daily-menu";
import TableOrderPage from "@/pages/dashboard/restaurant/table-order";
import SalesPage from "@/pages/dashboard/sales";
import NewSalePage from "@/pages/dashboard/sales/new";
import SaleDetailPage from "@/pages/dashboard/sales/detail";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      {/* Public / Auth */}
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />

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

      <Route component={NotFound} />
    </Switch>
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
