import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Package, Users, Activity, TrendingUp, TrendingDown,
  AlertTriangle, BarChart3, Plus, ArrowRight, BoxIcon,
  Star, DollarSign, ShoppingBag, ArrowUpRight,
} from "lucide-react";
import { useGetStoreStats, useGetStoreUsers } from "@workspace/api-client-react";
import { StatCardGridSkeleton, CardListSkeleton } from "@/components/ui/skeletons";
import { Helmet } from "react-helmet-async";

type Period = "today" | "week" | "month";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: any;
  accent: string;
  accentText: string;
  sub?: string;
  trend?: "up" | "down" | "neutral";
}

function StatCard({ title, value, icon: Icon, accent, accentText, sub, trend }: StatCardProps) {
  return (
    <div
      className="bg-card rounded-2xl p-5 border border-border/60 hover:border-primary/20 transition-all group hover:shadow-card-hover shadow-card"
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={`h-10 w-10 rounded-xl flex items-center justify-center ${accent} group-hover:scale-105 transition-transform shrink-0`}
        >
          <Icon className={`h-5 w-5 ${accentText}`} />
        </div>
        {trend && trend !== "neutral" && (
          <span className={`flex items-center text-xs font-semibold rounded-full px-2 py-0.5 ${
            trend === "up"
              ? "bg-emerald-500/10 text-emerald-600"
              : "bg-red-500/10 text-red-600"
          }`}>
            {trend === "up" ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
            {trend === "up" ? "activo" : "atención"}
          </span>
        )}
      </div>
      <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
      <h3 className="text-2xl font-display font-black text-foreground">{value}</h3>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

const PERIOD_LABELS: Record<Period, string> = {
  today: "Hoy",
  week: "Semana",
  month: "Mes",
};

export default function DashboardPage() {
  const { store } = useAuth();
  const [, navigate] = useLocation();
  const [period, setPeriod] = useState<Period>("month");

  const { data: stats, isLoading } = useGetStoreStats({ period });
  const { data: users } = useGetStoreUsers();

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(v);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Buenos días";
    if (h < 19) return "Buenas tardes";
    return "Buenas noches";
  };

  return (
    <DashboardLayout>
      <Helmet>
        <title>Inicio — {store?.businessName ?? "Camila"}</title>
      </Helmet>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-8 gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{greeting()},</p>
          <h1 className="text-3xl font-display font-black text-foreground leading-tight">
            {store?.businessName ?? "Tu Negocio"}
          </h1>
        </div>
        <div
          className="flex items-center gap-1 p-1 rounded-xl border border-border/60 bg-card self-start sm:self-auto"
        >
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                period === p
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <>
          <StatCardGridSkeleton count={4} />
          <div className="mt-8">
            <CardListSkeleton rows={5} />
          </div>
        </>
      ) : (
        <>
          {/* Primary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
            <StatCard
              title="Total Productos"
              value={stats?.totalProducts ?? 0}
              icon={Package}
              accent="bg-blue-500/10"
              accentText="text-blue-600"
              sub={`${stats?.activeProducts ?? 0} activos`}
              trend="neutral"
            />
            <StatCard
              title="Valor de Inventario"
              value={formatCurrency(stats?.stockValue ?? 0)}
              icon={DollarSign}
              accent="bg-emerald-500/10"
              accentText="text-emerald-600"
              sub="Basado en costo"
              trend="up"
            />
            <StatCard
              title="Stock Bajo"
              value={stats?.lowStockCount ?? 0}
              icon={AlertTriangle}
              accent="bg-amber-500/10"
              accentText="text-amber-600"
              sub={`${stats?.outOfStockCount ?? 0} sin stock`}
              trend={(stats?.lowStockCount ?? 0) > 0 ? "down" : "up"}
            />
            <StatCard
              title="Equipo"
              value={users?.length ?? 1}
              icon={Users}
              accent="bg-purple-500/10"
              accentText="text-purple-600"
              sub="miembros activos"
              trend="up"
            />
          </div>

          {/* Secondary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            <StatCard
              title="Entradas"
              value={stats?.inventoryIn ?? 0}
              icon={TrendingUp}
              accent="bg-emerald-500/10"
              accentText="text-emerald-600"
              sub="unidades ingresadas"
            />
            <StatCard
              title="Salidas"
              value={stats?.inventoryOut ?? 0}
              icon={TrendingDown}
              accent="bg-red-500/10"
              accentText="text-red-500"
              sub="unidades salidas"
            />
            <StatCard
              title="Destacados"
              value={stats?.featuredProducts ?? 0}
              icon={Star}
              accent="bg-yellow-500/10"
              accentText="text-yellow-600"
              sub="productos destacados"
            />
            <StatCard
              title="Categorías"
              value={stats?.totalCategories ?? 0}
              icon={BarChart3}
              accent="bg-indigo-500/10"
              accentText="text-indigo-600"
            />
          </div>

          {/* Bottom Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Category Chart */}
            <Card className="lg:col-span-2 border-border/60 shadow-card rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-display text-base font-bold">Productos por Categoría</CardTitle>
                  <button
                    onClick={() => navigate("/dashboard/products")}
                    className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    Ver productos <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                {!stats?.productsByCategory?.length ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground rounded-xl bg-muted/40 border-2 border-dashed border-border/60">
                    <Activity className="h-8 w-8 mb-2 opacity-30" />
                    <p className="text-sm font-medium">Aún no hay categorías con productos</p>
                    <button
                      onClick={() => navigate("/dashboard/products")}
                      className="mt-3 text-xs text-primary font-semibold hover:underline"
                    >
                      Agrega tu primer producto →
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3.5 pt-1">
                    {stats.productsByCategory
                      .sort((a, b) => b.productCount - a.productCount)
                      .slice(0, 8)
                      .map((cat, i) => {
                        const pct =
                          stats.totalProducts > 0
                            ? Math.round((cat.productCount / stats.totalProducts) * 100)
                            : 0;
                        const colors = [
                          "bg-primary",
                          "bg-emerald-500",
                          "bg-blue-500",
                          "bg-amber-500",
                          "bg-purple-500",
                          "bg-rose-500",
                          "bg-teal-500",
                          "bg-indigo-500",
                        ];
                        return (
                          <div key={cat.categoryId} className="flex items-center gap-3">
                            <div className="w-28 shrink-0 truncate text-sm font-medium text-foreground">
                              {cat.categoryName}
                            </div>
                            <div className="flex-1 bg-muted rounded-full h-2">
                              <div
                                className={`${colors[i % colors.length]} rounded-full h-2 transition-all duration-500`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="text-xs text-muted-foreground w-14 text-right font-medium">
                              {cat.productCount} prod.
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              {/* Low Stock Alert */}
              <Card className="border-border/60 shadow-card rounded-2xl">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-display text-base font-bold">Stock Bajo</CardTitle>
                    {(stats?.lowStockCount ?? 0) > 0 && (
                      <Badge
                        variant="destructive"
                        className="text-xs rounded-full"
                      >
                        {stats!.lowStockCount}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {!stats?.lowStockProducts?.length ? (
                    <div className="flex flex-col items-center py-5">
                      <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2">
                        <Package className="h-5 w-5 text-emerald-600" />
                      </div>
                      <p className="text-sm font-medium text-foreground">¡Todo bien!</p>
                      <p className="text-xs text-muted-foreground">Sin alertas de stock</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {stats.lowStockProducts.slice(0, 5).map((p) => (
                        <div key={p.id} className="flex items-center justify-between text-sm py-1">
                          <span className="truncate font-medium text-foreground">{p.name}</span>
                          <Badge
                            variant="outline"
                            className="text-amber-600 border-amber-300 shrink-0 ml-2 text-xs font-semibold"
                          >
                            {p.stock} uds.
                          </Badge>
                        </div>
                      ))}
                      {stats.lowStockProducts.length > 5 && (
                        <button
                          onClick={() => navigate("/dashboard/inventory")}
                          className="w-full text-xs text-primary font-semibold hover:underline mt-1 flex items-center justify-center gap-1"
                        >
                          Ver todos <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="border-border/60 shadow-card rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="font-display text-base font-bold">Acciones Rápidas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <button
                    onClick={() => navigate("/dashboard/products")}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border/60 hover:border-primary/30 hover:bg-secondary/50 transition-all text-sm font-medium text-left group"
                  >
                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Plus className="h-4 w-4 text-blue-600" />
                    </div>
                    <span>Nuevo producto</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-auto text-muted-foreground/50" />
                  </button>
                  <button
                    onClick={() => navigate("/dashboard/inventory")}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border/60 hover:border-primary/30 hover:bg-secondary/50 transition-all text-sm font-medium text-left group"
                  >
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <BoxIcon className="h-4 w-4 text-emerald-600" />
                    </div>
                    <span>Ajustar inventario</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-auto text-muted-foreground/50" />
                  </button>
                  <button
                    onClick={() => navigate("/dashboard/sales")}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border/60 hover:border-primary/30 hover:bg-secondary/50 transition-all text-sm font-medium text-left group"
                  >
                    <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <ShoppingBag className="h-4 w-4 text-amber-600" />
                    </div>
                    <span>Registrar venta</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-auto text-muted-foreground/50" />
                  </button>
                  <button
                    onClick={() => navigate("/dashboard/categories")}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border/60 hover:border-primary/30 hover:bg-secondary/50 transition-all text-sm font-medium text-left group"
                  >
                    <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <BarChart3 className="h-4 w-4 text-indigo-600" />
                    </div>
                    <span>Gestionar categorías</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-auto text-muted-foreground/50" />
                  </button>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
