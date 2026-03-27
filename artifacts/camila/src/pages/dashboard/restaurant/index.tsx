import { useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  useGetRestaurantTables,
  useGetRestaurantStats,
  useUpdateRestaurantTable,
} from "@workspace/api-client-react";
import type { RestaurantTable } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, UtensilsCrossed, Settings, Plus, Users, TrendingUp, ClipboardList } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  free:     { label: "Libre",    color: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200" },
  occupied: { label: "Ocupada",  color: "text-blue-700",    bg: "bg-blue-50",     border: "border-blue-200" },
  to_pay:   { label: "Por Pagar", color: "text-amber-700",  bg: "bg-amber-50",    border: "border-amber-200" },
  closed:   { label: "Cerrada",  color: "text-slate-600",   bg: "bg-slate-100",   border: "border-slate-200" },
};

export default function RestaurantPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tables, isLoading } = useGetRestaurantTables({});
  const { data: stats } = useGetRestaurantStats();
  const updateTable = useUpdateRestaurantTable();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/restaurant/tables"] });
    queryClient.invalidateQueries({ queryKey: ["/api/restaurant/stats"] });
  };

  // Group by zone
  const zones: string[] = [];
  const byZone: Record<string, RestaurantTable[]> = {};

  (tables ?? []).forEach((t) => {
    const z = t.zone ?? "Sin zona";
    if (!byZone[z]) {
      byZone[z] = [];
      zones.push(z);
    }
    byZone[z].push(t);
  });

  const handleTableClick = (table: RestaurantTable) => {
    navigate(`/dashboard/restaurant/tables/${table.id}`);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  const totalTables = tables?.length ?? 0;

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <UtensilsCrossed className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold">Restaurante</h1>
            <p className="text-muted-foreground text-sm">Gestión de mesas y pedidos</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => navigate("/dashboard/restaurant/orders")}>
            <ClipboardList className="h-4 w-4 mr-2" /> Pedidos
          </Button>
          <Button variant="outline" className="rounded-xl" onClick={() => navigate("/dashboard/restaurant/daily-menu")}>
            <UtensilsCrossed className="h-4 w-4 mr-2" /> Menú del Día
          </Button>
          <Button variant="outline" className="rounded-xl" onClick={() => navigate("/dashboard/restaurant/setup")}>
            <Settings className="h-4 w-4 mr-2" /> Configurar
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard label="Mesas libres" value={stats.tablesFree} icon="🟢" />
          <StatCard label="Mesas ocupadas" value={stats.tablesOccupied} icon="🔵" />
          <StatCard label="Por cobrar" value={stats.tablesToPay} icon="🟡" />
          <StatCard label="Ventas hoy" value={`S/ ${Number(stats.revenueToday).toFixed(2)}`} icon="💰" />
        </div>
      )}

      {/* No tables state */}
      {totalTables === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-border/60 rounded-2xl">
          <UtensilsCrossed className="h-14 w-14 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Sin mesas configuradas</h3>
          <p className="text-muted-foreground mb-6">
            Configura las mesas de tu restaurante para empezar a gestionar pedidos.
          </p>
          <Button className="rounded-xl" onClick={() => navigate("/dashboard/restaurant/setup")}>
            <Settings className="mr-2 h-4 w-4" /> Configurar mesas
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {zones.map((zone) => (
            <div key={zone}>
              {zones.length > 1 && (
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  {zone}
                  <div className="h-px flex-1 bg-border" />
                </h2>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {byZone[zone].map((table) => {
                  const cfg = STATUS_CONFIG[table.status] ?? STATUS_CONFIG.free;
                  const isClickable = table.isActive;
                  return (
                    <button
                      key={table.id}
                      onClick={() => isClickable && handleTableClick(table)}
                      disabled={!isClickable}
                      className={`
                        relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all
                        min-h-[110px] text-center group
                        ${isClickable ? "cursor-pointer hover:scale-[1.03] hover:shadow-lg active:scale-[0.97]" : "opacity-40 cursor-not-allowed"}
                        ${cfg.bg} ${cfg.border}
                      `}
                    >
                      {table.activeOrderId && (
                        <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                      )}
                      <span className="text-2xl font-display font-bold text-slate-800">{table.name}</span>
                      {table.zone && zones.length === 1 && (
                        <span className="text-xs text-muted-foreground">{table.zone}</span>
                      )}
                      <div className="flex items-center gap-1 mt-1">
                        <Users className="h-3 w-3 text-slate-500" />
                        <span className="text-xs text-slate-500">{table.capacity}</span>
                      </div>
                      <Badge
                        className={`mt-2 text-xs py-0.5 font-medium border ${cfg.bg} ${cfg.color} ${cfg.border}`}
                      >
                        {cfg.label}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="bg-card rounded-2xl border border-border/50 p-4 flex items-center gap-3">
      <span className="text-2xl">{icon}</span>
      <div className="min-w-0">
        <div className="font-bold text-lg font-display truncate">{value}</div>
        <div className="text-xs text-muted-foreground truncate">{label}</div>
      </div>
    </div>
  );
}
