import { useAuth } from "@/hooks/use-auth";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Users, Activity, ShoppingCart } from "lucide-react";
import { useGetProducts, useGetStoreUsers } from "@workspace/api-client-react";

export default function DashboardPage() {
  const { store } = useAuth();
  
  const { data: productsData } = useGetProducts({ limit: 1 });
  const { data: usersData } = useGetStoreUsers();

  const stats = [
    { title: "Total Productos", value: productsData?.total || 0, icon: Package, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Usuarios del equipo", value: usersData?.length || 1, icon: Users, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { title: "Ventas (Hoy)", value: "S/ 0.00", icon: ShoppingCart, color: "text-accent", bg: "bg-accent/10" },
    { title: "Estado de Tienda", value: store?.isActive ? "Activa" : "Inactiva", icon: Activity, color: "text-purple-500", bg: "bg-purple-500/10" },
  ];

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Hola, {store?.businessName} 👋</h1>
        <p className="text-muted-foreground mt-1">Aquí está el resumen de tu negocio hoy.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="border-border/50 shadow-sm hover:shadow-md transition-shadow rounded-2xl">
              <CardContent className="p-6 flex items-center gap-4">
                <div className={`p-4 rounded-xl ${stat.bg}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <h3 className="text-2xl font-bold text-foreground mt-1">{stat.value}</h3>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/50 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="font-display">Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border-2 border-dashed border-border/60 rounded-xl bg-secondary/20">
              <Activity className="h-10 w-10 mb-3 text-muted-foreground/50" />
              <p>Aún no hay suficiente actividad para mostrar gráficos.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="font-display">Atajos Rápidos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <button className="w-full text-left px-4 py-3 rounded-xl border border-border/50 hover:bg-secondary hover:border-primary/30 transition-colors font-medium">
              + Agregar nuevo producto
            </button>
            <button className="w-full text-left px-4 py-3 rounded-xl border border-border/50 hover:bg-secondary hover:border-primary/30 transition-colors font-medium">
              📄 Ajustar inventario
            </button>
            <button className="w-full text-left px-4 py-3 rounded-xl border border-border/50 hover:bg-secondary hover:border-primary/30 transition-colors font-medium">
              👤 Invitar personal
            </button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
