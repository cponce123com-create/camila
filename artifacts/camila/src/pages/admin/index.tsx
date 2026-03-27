import { AdminLayout } from "@/components/layout/admin-layout";
import { useAdminGetStats, useAdminGetAllStores } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, CheckCircle, Clock, ShieldAlert, DollarSign, TrendingUp, ShoppingBag, Plus } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const LICENSE_STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  trial: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  expired: "bg-red-500/10 text-red-700 dark:text-red-400",
  suspended: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
};

const LICENSE_STATUS_LABELS: Record<string, string> = {
  active: "Activa",
  trial: "Trial",
  expired: "Vencida",
  suspended: "Suspendida",
};

export default function AdminDashboardPage() {
  const { data: stats } = useAdminGetStats();
  const { data: storesData } = useAdminGetAllStores({ limit: 5 });

  const kpis = [
    {
      title: "Tiendas Totales",
      value: stats?.totalStores ?? 0,
      icon: Store,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Activas",
      value: stats?.activeStores ?? 0,
      icon: CheckCircle,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      title: "En Trial",
      value: stats?.trialStores ?? 0,
      icon: Clock,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      title: "Vencidas / Suspendidas",
      value: (stats?.expiredStores ?? 0) + (stats?.suspendedStores ?? 0),
      icon: ShieldAlert,
      color: "text-red-500",
      bg: "bg-red-500/10",
    },
    {
      title: "Ventas Totales (S/)",
      value: `S/ ${Number(stats?.totalSalesAmount ?? 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: "text-violet-500",
      bg: "bg-violet-500/10",
    },
    {
      title: "N° de Ventas",
      value: stats?.totalSalesCount ?? 0,
      icon: ShoppingBag,
      color: "text-indigo-500",
      bg: "bg-indigo-500/10",
    },
    {
      title: "Nuevas este mes",
      value: stats?.newThisMonth ?? 0,
      icon: TrendingUp,
      color: "text-teal-500",
      bg: "bg-teal-500/10",
    },
  ];

  const chartData = (stats?.monthlyGrowth ?? []).map((row) => {
    const [year, month] = row.month.split("-");
    const label = format(new Date(Number(year), Number(month) - 1), "MMM yy", { locale: es });
    return { month: label, stores: row.stores };
  });

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Panel Global</h1>
        <p className="text-muted-foreground mt-1">Visión completa de la plataforma Camila.</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <Card key={i} className="border-border/50 shadow-sm rounded-2xl">
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`p-3 rounded-xl ${k.bg} flex-shrink-0`}>
                  <Icon className={`h-5 w-5 ${k.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground truncate">{k.title}</p>
                  <p className="text-2xl font-bold text-foreground mt-0.5">{k.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Growth Chart + Recent Stores */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <Card className="lg:col-span-2 border-border/50 shadow-sm rounded-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="font-display text-lg">Crecimiento mensual de tiendas</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                Aún no hay datos suficientes.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="storeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.75rem",
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="stores"
                    name="Tiendas"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#storeGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent Stores */}
        <Card className="border-border/50 shadow-sm rounded-2xl">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="font-display text-base">Tiendas Recientes</CardTitle>
            <Link href="/admin/stores">
              <Button variant="ghost" size="sm" className="text-xs h-7 px-2">Ver todas</Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0">
            {(storesData?.data ?? []).map((store) => (
              <Link key={store.id} href={`/admin/stores/${store.id}`}>
                <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-secondary/50 transition-colors cursor-pointer">
                  <div className="h-9 w-9 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Store className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{store.businessName}</p>
                    <p className="text-xs text-muted-foreground truncate">{store.district}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-md font-semibold flex-shrink-0 ${LICENSE_STATUS_STYLES[(store as any).license?.status ?? ""] ?? "bg-muted text-muted-foreground"}`}>
                    {LICENSE_STATUS_LABELS[(store as any).license?.status ?? ""] ?? "—"}
                  </span>
                </div>
              </Link>
            ))}
            {(storesData?.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Sin tiendas registradas.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
