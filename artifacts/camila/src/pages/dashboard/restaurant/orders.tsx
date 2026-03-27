import { useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useGetRestaurantOrders } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowLeft, ClipboardList } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const STATUS_CONF: Record<string, { label: string; class: string }> = {
  open:      { label: "Abierto",    class: "bg-blue-50 text-blue-700 border-blue-200" },
  completed: { label: "Completado", class: "bg-slate-50 text-slate-700 border-slate-200" },
  paid:      { label: "Pagado",     class: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled: { label: "Cancelado",  class: "bg-red-50 text-red-700 border-red-200" },
};

const PAYMENT_CONF: Record<string, string> = {
  cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia", other: "Otro",
};

export default function RestaurantOrdersPage() {
  const [, navigate] = useLocation();
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useGetRestaurantOrders({
    status: filterStatus || undefined,
    page,
    limit: 20,
  });

  const orders = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <DashboardLayout>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/restaurant")} className="rounded-xl">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-display font-bold">Historial de Pedidos</h1>
          <p className="text-muted-foreground">{data?.total ?? 0} pedidos en total</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border/50 p-4 mb-4">
        <div className="flex gap-3 flex-wrap">
          <Select
            value={filterStatus || "__all__"}
            onValueChange={(v) => { setFilterStatus(v === "__all__" ? "" : v); setPage(1); }}
          >
            <SelectTrigger className="w-44 rounded-xl">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos los estados</SelectItem>
              <SelectItem value="open">Abiertos</SelectItem>
              <SelectItem value="completed">Completados</SelectItem>
              <SelectItem value="paid">Pagados</SelectItem>
              <SelectItem value="cancelled">Cancelados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="animate-spin h-8 w-8 mx-auto text-muted-foreground" />
          </div>
        ) : !orders.length ? (
          <div className="p-16 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No hay pedidos.</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader className="bg-secondary/30">
                <TableRow>
                  <TableHead>Mesa</TableHead>
                  <TableHead>Apertura</TableHead>
                  <TableHead>Mesero</TableHead>
                  <TableHead>Subtotal</TableHead>
                  <TableHead>Descuento</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => {
                  const cfg = STATUS_CONF[o.status] ?? { label: o.status, class: "" };
                  return (
                    <TableRow
                      key={o.id}
                      className="hover:bg-secondary/10 cursor-pointer"
                      onClick={() => navigate(`/dashboard/restaurant/tables/${o.tableId}`)}
                    >
                      <TableCell>
                        <div>
                          <div className="font-semibold">{o.tableName}</div>
                          {o.tableZone && <div className="text-xs text-muted-foreground">{o.tableZone}</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {format(parseISO(o.openedAt), "d MMM HH:mm", { locale: es })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{o.staffName ?? "—"}</span>
                      </TableCell>
                      <TableCell>S/ {parseFloat(String(o.subtotal)).toFixed(2)}</TableCell>
                      <TableCell className="text-amber-600">
                        {parseFloat(String(o.discount)) > 0 ? `-S/ ${parseFloat(String(o.discount)).toFixed(2)}` : "—"}
                      </TableCell>
                      <TableCell>
                        <span className="font-bold">S/ {parseFloat(String(o.total)).toFixed(2)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {o.paymentMethod ? PAYMENT_CONF[o.paymentMethod] ?? o.paymentMethod : "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={`border text-xs ${cfg.class}`}>{cfg.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {totalPages > 1 && (
              <div className="p-4 flex items-center justify-between border-t border-border/40">
                <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-xl">Anterior</Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-xl">Siguiente</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
