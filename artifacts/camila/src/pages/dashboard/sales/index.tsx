import { useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useGetSales, useGetStoreUsers } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, ShoppingBag, Plus, Eye, TrendingUp } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Efectivo", card: "Tarjeta", transfer: "Transfer.", other: "Otro",
};

const STATUS_CONF: Record<string, { label: string; class: string }> = {
  paid:      { label: "Pagado",     class: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  open:      { label: "Abierto",    class: "bg-blue-50 text-blue-700 border-blue-200" },
  cancelled: { label: "Anulado",    class: "bg-red-50 text-red-700 border-red-200" },
  refunded:  { label: "Devuelto",   class: "bg-amber-50 text-amber-700 border-amber-200" },
};

export default function SalesPage() {
  const [, navigate] = useLocation();
  const today = new Date();
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(today), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(endOfMonth(today), "yyyy-MM-dd"));
  const [staffFilter, setStaffFilter] = useState("");
  const [payFilter, setPayFilter] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useGetSales({
    dateFrom,
    dateTo,
    staffUserId: staffFilter || undefined,
    paymentMethod: payFilter || undefined,
    status: "paid",
    page,
    limit: 20,
  });

  const { data: team } = useGetStoreUsers();

  const sales = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;
  const todayTotal = (data as any)?.todayTotal ?? 0;
  const todayCount = (data as any)?.todayCount ?? 0;

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <ShoppingBag className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold">Ventas</h1>
            <p className="text-muted-foreground text-sm">Historial y registro de ventas</p>
          </div>
        </div>
        <Button className="rounded-xl h-11" onClick={() => navigate("/dashboard/sales/new")}>
          <Plus className="h-4 w-4 mr-2" /> Nueva Venta
        </Button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        <div className="bg-card rounded-2xl border border-border/50 p-4">
          <div className="text-2xl font-bold font-display text-primary">S/ {Number(todayTotal).toFixed(2)}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Ventas de hoy</div>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 p-4">
          <div className="text-2xl font-bold font-display">{todayCount}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Transacciones hoy</div>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 p-4 col-span-2 sm:col-span-1">
          <div className="text-2xl font-bold font-display">{data?.total ?? 0}</div>
          <div className="text-xs text-muted-foreground mt-0.5">En el período</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-2xl border border-border/50 p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground shrink-0">Desde:</label>
            <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="rounded-xl w-36 h-9" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground shrink-0">Hasta:</label>
            <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="rounded-xl w-36 h-9" />
          </div>
          <Select value={payFilter || "__all__"} onValueChange={(v) => { setPayFilter(v === "__all__" ? "" : v); setPage(1); }}>
            <SelectTrigger className="w-36 rounded-xl h-9">
              <SelectValue placeholder="Pago" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todo</SelectItem>
              <SelectItem value="cash">Efectivo</SelectItem>
              <SelectItem value="card">Tarjeta</SelectItem>
              <SelectItem value="transfer">Transferencia</SelectItem>
            </SelectContent>
          </Select>
          {team && team.length > 0 && (
            <Select value={staffFilter || "__all__"} onValueChange={(v) => { setStaffFilter(v === "__all__" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-40 rounded-xl h-9">
                <SelectValue placeholder="Vendedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {team.map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="animate-spin h-8 w-8 mx-auto text-muted-foreground" />
          </div>
        ) : !sales.length ? (
          <div className="p-16 text-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No hay ventas en este período.</p>
            <Button variant="outline" className="mt-4 rounded-xl" onClick={() => navigate("/dashboard/sales/new")}>
              <Plus className="h-4 w-4 mr-2" /> Registrar primera venta
            </Button>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader className="bg-secondary/30">
                <TableRow>
                  <TableHead>Recibo</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((s) => {
                  const cfg = STATUS_CONF[s.status] ?? { label: s.status, class: "" };
                  return (
                    <TableRow key={s.id} className="hover:bg-secondary/10">
                      <TableCell className="font-mono text-xs font-semibold text-primary">
                        {s.receiptCode}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(parseISO(s.soldAt), "d MMM HH:mm", { locale: es })}
                      </TableCell>
                      <TableCell>
                        {s.clientName
                          ? <div>
                              <div className="text-sm font-medium">{s.clientName}</div>
                              {s.clientPhone && <div className="text-xs text-muted-foreground">{s.clientPhone}</div>}
                            </div>
                          : <span className="text-muted-foreground/50 text-sm">—</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {(s as any).staffName ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {(s as any).items?.length ?? "—"}
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-primary">S/ {parseFloat(String(s.total)).toFixed(2)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{PAYMENT_LABELS[s.paymentMethod] ?? s.paymentMethod}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={`border text-xs ${cfg.class}`}>{cfg.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => navigate(`/dashboard/sales/${s.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
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
