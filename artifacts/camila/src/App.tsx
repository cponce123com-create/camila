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
import AdminStoreDetailPage from "@/pages/admin/store-detail";
import NotFound from "@/pages/not-found";

// Restaurant pages
import RestaurantPage from "@/pages/dashboard/restaurant";
import RestaurantSetupPage from "@/pages/dashboard/restaurant/setup";
import RestaurantOrdersPage from "@/pages/dashboard/restaurant/orders";
import DailyMenuPage from "@/pages/dashboard/restaurant/daily-menu";
import TableOrderPage from "@/pages/dashboard/restaurant/table-order";

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

      {/* Protected Superadmin */}
      <Route path="/admin" component={AdminPage} />
      <Route path="/admin/stores/:id" component={AdminStoreDetailPage} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
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
