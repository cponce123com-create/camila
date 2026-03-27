import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAdminGetAllStores, useAdminGetStats } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Store, ShieldAlert, CheckCircle, Clock } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function AdminPage() {
  const { data: stats } = useAdminGetStats();
  const { data: stores, isLoading } = useAdminGetAllStores();

  const statCards = [
    { title: "Tiendas Totales", value: stats?.totalStores || 0, icon: Store, color: "text-blue-500" },
    { title: "Activas", value: stats?.activeStores || 0, icon: CheckCircle, color: "text-emerald-500" },
    { title: "En Prueba", value: stats?.trialStores || 0, icon: Clock, color: "text-accent" },
    { title: "Vencidas/Suspendidas", value: (stats?.expiredStores || 0) + (stats?.suspendedStores || 0), icon: ShieldAlert, color: "text-destructive" },
  ];

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Panel Global (Camila)</h1>
        <p className="text-muted-foreground">Gestión de todos los clientes (Solo Superadmin).</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="border-border/50 shadow-sm rounded-2xl">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <h3 className="text-3xl font-bold text-foreground mt-1">{stat.value}</h3>
                </div>
                <div className={`p-4 rounded-xl bg-secondary/50`}>
                  <Icon className={`h-8 w-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden">
        <div className="p-6 border-b border-border/50 flex justify-between items-center">
          <h2 className="text-xl font-display font-bold">Listado de Tiendas</h2>
        </div>
        
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">Cargando...</div>
        ) : (
          <Table>
            <TableHeader className="bg-secondary/30">
              <TableRow>
                <TableHead>Negocio</TableHead>
                <TableHead>Titular</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Distrito</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Ver</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stores?.data.map((store) => (
                <TableRow key={store.id} className="hover:bg-secondary/10">
                  <TableCell className="font-bold">{store.businessName}</TableCell>
                  <TableCell>{store.ownerName}</TableCell>
                  <TableCell>
                    <div className="text-sm">{store.phone}</div>
                    <div className="text-xs text-muted-foreground">{store.email}</div>
                  </TableCell>
                  <TableCell>{store.district}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                      store.license?.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' :
                      store.license?.status === 'trial' ? 'bg-accent/10 text-accent-foreground' :
                      'bg-destructive/10 text-destructive'
                    }`}>
                      {store.license?.status?.toUpperCase() || 'SIN LICENCIA'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/admin/stores/${store.id}`}>
                      <Button variant="outline" size="sm" className="rounded-lg">Gestionar</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </DashboardLayout>
  );
}
