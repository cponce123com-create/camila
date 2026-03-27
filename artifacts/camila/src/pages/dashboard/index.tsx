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
  Star, DollarSign,
} from "lucide-react";
import { useGetStoreStats, useGetStoreUsers } from "@workspace/api-client-react";
import { StatCardGridSkeleton, CardListSkeleton } from "@/components/ui/skeletons";

function StatCard({ title, value, icon: Icon, color, bg, sub }: {
  title: string; value: string | number; icon: any; color: string; bg: string; sub?: string;
}) {
  return (
    <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow rounded-2xl">
      <CardContent className="p-6 flex items-center gap-4">
        <div className={`p-4 rounded-xl ${bg} shrink-0`}>
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
          <h3 className="text-2xl font-bold text-foreground mt-0.5">{value}</h3>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { store } = useAuth();
  const [, navigate] = useLocation();
  const [period, setPeriod] = useState<"today" | "week" | "month">("month");

  const { data: stats, isLoading } = useGetStoreStats({ period });
  const { data: users } = useGetStoreUsers();

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(v);

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Hola, {store?.businessName}
          </h1>
          <p className="text-muted-foreground mt-1">Resumen de tu negocio.</p>
        </div>
        <div className="flex gap-2">
          {(["today", "week", "month"] as const).map((p) => (
            <Button
              key={p}
              variant={period === p ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(p)}
              className="rounded-xl"
            >
              {p === "today" ? "Hoy" : p === "week" ? "Semana" : "Mes"}
            </Button>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Productos"
              value={stats?.totalProducts ?? 0}
              icon={Package}
              color="text-blue-500"
              bg="bg-blue-500/10"
              sub={`${stats?.activeProducts ?? 0} activos`}
            />
            <StatCard
              title="Valor del Inventario"
              value={formatCurrency(stats?.stockValue ?? 0)}
              icon={DollarSign}
              color="text-emerald-500"
              bg="bg-emerald-500/10"
              sub="Basado en costo"
            />
            <StatCard
              title="Stock Bajo"
              value={stats?.lowStockCount ?? 0}
              icon={AlertTriangle}
              color="text-amber-500"
              bg="bg-amber-500/10"
              sub={`${stats?.outOfStockCount ?? 0} sin stock`}
            />
            <StatCard
              title="Equipo"
              value={users?.length ?? 1}
              icon={Users}
              color="text-purple-500"
              bg="bg-purple-500/10"
              sub="miembros activos"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Entradas (periodo)"
              value={stats?.inventoryIn ?? 0}
              icon={TrendingUp}
              color="text-emerald-600"
              bg="bg-emerald-500/10"
              sub="unidades ingresadas"
            />
            <StatCard
              title="Salidas (periodo)"
              value={stats?.inventoryOut ?? 0}
              icon={TrendingDown}
              color="text-red-500"
              bg="bg-red-500/10"
              sub="unidades salidas"
            />
            <StatCard
              title="Destacados"
              value={stats?.featuredProducts ?? 0}
              icon={Star}
              color="text-yellow-500"
              bg="bg-yellow-500/10"
              sub="productos destacados"
            />
            <StatCard
              title="Categorías"
              value={stats?.totalCategories ?? 0}
              icon={BarChart3}
              color="text-indigo-500"
              bg="bg-indigo-500/10"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-border/50 shadow-sm rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="font-display">Productos por Categoría</CardTitle>
              </CardHeader>
              <CardContent>
                {!stats?.productsByCategory?.length ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground border-2 border-dashed border-border/60 rounded-xl bg-secondary/20">
                    <Activity className="h-8 w-8 mb-2 text-muted-foreground/40" />
                    <p className="text-sm">Aún no hay categorías con productos.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stats.productsByCategory
                      .sort((a, b) => b.productCount - a.productCount)
                      .slice(0, 8)
                      .map((cat) => {
                        const pct = stats.totalProducts > 0
                          ? Math.round((cat.productCount / stats.totalProducts) * 100)
                          : 0;
                        return (
                          <div key={cat.categoryId} className="flex items-center gap-4">
                            <div className="w-32 shrink-0 truncate text-sm font-medium">{cat.categoryName}</div>
                            <div className="flex-1 bg-secondary rounded-full h-2.5">
                              <div
                                className="bg-primary rounded-full h-2.5 transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="text-sm text-muted-foreground w-12 text-right">
                              {cat.productCount} prod.
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-border/50 shadow-sm rounded-2xl">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-display text-base">Stock Bajo</CardTitle>
                    {(stats?.lowStockCount ?? 0) > 0 && (
                      <Badge variant="destructive" className="text-xs">{stats!.lowStockCount}</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {!stats?.lowStockProducts?.length ? (
                    <p className="text-sm text-muted-foreground text-center py-4">¡Todo bien! Sin alertas.</p>
                  ) : (
                    <div className="space-y-2">
                      {stats.lowStockProducts.slice(0, 5).map((p) => (
                        <div key={p.id} className="flex items-center justify-between text-sm">
                          <span className="truncate font-medium">{p.name}</span>
                          <Badge variant="outline" className="text-amber-600 border-amber-300 shrink-0 ml-2">
                            {p.stock} uds.
                          </Badge>
                        </div>
                      ))}
                      {stats.lowStockProducts.length > 5 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full rounded-xl text-xs"
                          onClick={() => navigate("/dashboard/inventory")}
                        >
                          Ver todos <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/50 shadow-sm rounded-2xl">
                <CardHeader className="pb-3">
                  <CardTitle className="font-display text-base">Accesos Rápidos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start rounded-xl border-border/50 hover:border-primary/40 text-sm"
                    onClick={() => navigate("/dashboard/products")}
                  >
                    <Plus className="mr-2 h-4 w-4 text-primary" /> Nuevo producto
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start rounded-xl border-border/50 hover:border-primary/40 text-sm"
                    onClick={() => navigate("/dashboard/inventory")}
                  >
                    <BoxIcon className="mr-2 h-4 w-4 text-emerald-500" /> Ajustar inventario
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start rounded-xl border-border/50 hover:border-primary/40 text-sm"
                    onClick={() => navigate("/dashboard/categories")}
                  >
                    <BarChart3 className="mr-2 h-4 w-4 text-indigo-500" /> Gestionar categorías
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
