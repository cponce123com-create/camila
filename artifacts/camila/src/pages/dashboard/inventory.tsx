import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  useGetInventoryMovements, useAdjustInventory, useGetProducts,
  useGetLowStockProducts, useGetProductKardex,
} from "@workspace/api-client-react";
import type { Product } from "@workspace/api-client-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowDownRight, ArrowUpRight, MinusSquare, Loader2, AlertTriangle,
  Package, BarChart2, Plus, Search, Filter, BookOpen,
} from "lucide-react";
import { TableSkeleton } from "@/components/ui/skeletons";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

type TabType = "movimientos" | "bajo-stock" | "kardex";

export default function InventoryPage() {
  const [tab, setTab] = useState<TabType>("movimientos");
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [kardexProductId, setKardexProductId] = useState<string | null>(null);

  const [filterProductId, setFilterProductId] = useState("");
  const [filterType, setFilterType] = useState<"" | "in" | "out" | "adjustment">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const [kardexFrom, setKardexFrom] = useState("");
  const [kardexTo, setKardexTo] = useState("");

  const [adjustForm, setAdjustForm] = useState({
    productId: "", type: "in" as "in" | "out" | "adjustment",
    quantity: "1", reason: "", notes: "",
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const movementsQuery = useGetInventoryMovements({
    productId: filterProductId || undefined,
    type: filterType || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
    limit: 20,
  });

  const lowStockQuery = useGetLowStockProducts();
  const { data: productsData } = useGetProducts({ limit: 200 });
  const adjustMutation = useAdjustInventory();

  const kardexQuery = useGetProductKardex(
    kardexProductId ?? "",
    {
      dateFrom: kardexFrom || undefined,
      dateTo: kardexTo || undefined,
    },
    { query: { enabled: !!kardexProductId } }
  );

  const movements = movementsQuery.data;
  const totalPages = movements?.totalPages ?? 1;
  const products = productsData?.data ?? [];
  const lowStock = lowStockQuery.data ?? [];

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustForm.productId) {
      toast({ title: "Selecciona un producto", variant: "destructive" });
      return;
    }
    try {
      await adjustMutation.mutateAsync({
        data: {
          productId: adjustForm.productId,
          type: adjustForm.type,
          quantity: parseInt(adjustForm.quantity),
          reason: adjustForm.reason || undefined,
          notes: adjustForm.notes || undefined,
        },
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Inventario ajustado correctamente" });
      setAdjustDialogOpen(false);
      setAdjustForm({ productId: "", type: "in", quantity: "1", reason: "", notes: "" });
    } catch (err: any) {
      toast({ title: err?.message || "Error al ajustar", variant: "destructive" });
    }
  };

  const typeConfig = {
    in: { label: "Entrada", icon: ArrowUpRight, className: "bg-emerald-500/10 text-emerald-700" },
    out: { label: "Salida", icon: ArrowDownRight, className: "bg-destructive/10 text-destructive" },
    adjustment: { label: "Ajuste", icon: MinusSquare, className: "bg-accent/10 text-accent-foreground" },
  };

  const tabs: { id: TabType; label: string; icon: any; badge?: number }[] = [
    { id: "movimientos", label: "Movimientos", icon: BarChart2 },
    { id: "bajo-stock", label: "Stock Bajo", icon: AlertTriangle, badge: lowStock.length },
    { id: "kardex", label: "Kárdex", icon: BookOpen },
  ];

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Inventario</h1>
          <p className="text-muted-foreground">Control de stock y movimientos.</p>
        </div>
        <Button
          onClick={() => setAdjustDialogOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg shadow-primary/20"
        >
          <Plus className="mr-2 h-4 w-4" /> Ajustar Stock
        </Button>
      </div>

      <div className="flex gap-2 mb-6 border-b border-border/40 pb-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-xl transition-colors border-b-2 -mb-1",
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
              {t.badge ? (
                <Badge variant="destructive" className="text-xs h-5 px-1.5">{t.badge}</Badge>
              ) : null}
            </button>
          );
        })}
      </div>

      {tab === "movimientos" && (
        <>
          <div className="bg-card rounded-2xl shadow-sm border border-border/50 mb-4 p-4">
            <div className="flex flex-wrap gap-3">
              <Select
                value={filterProductId || "__all__"}
                onValueChange={(v) => { setFilterProductId(v === "__all__" ? "" : v); setPage(1); }}
              >
                <SelectTrigger className="w-52 rounded-xl">
                  <SelectValue placeholder="Todos los productos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos los productos</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterType || "__all__"} onValueChange={(v) => { setFilterType(v === "__all__" ? "" : v as any); setPage(1); }}>
                <SelectTrigger className="w-36 rounded-xl">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos los tipos</SelectItem>
                  <SelectItem value="in">Entradas</SelectItem>
                  <SelectItem value="out">Salidas</SelectItem>
                  <SelectItem value="adjustment">Ajustes</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                  className="rounded-xl w-40"
                />
                <span className="text-muted-foreground text-sm">—</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                  className="rounded-xl w-40"
                />
              </div>

              {(filterProductId || filterType || dateFrom || dateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-xl text-muted-foreground"
                  onClick={() => { setFilterProductId(""); setFilterType(""); setDateFrom(""); setDateTo(""); setPage(1); }}
                >
                  Limpiar filtros
                </Button>
              )}
            </div>
          </div>

          <div className="bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden">
            {movementsQuery.isLoading ? (
              <div className="p-4">
                <TableSkeleton rows={8} cols={6} headers={["Fecha", "Producto", "Tipo", "Cantidad", "Razón", "Usuario"]} />
              </div>
            ) : !movements?.data?.length ? (
              <div className="p-16 text-center flex flex-col items-center">
                <div className="h-16 w-16 bg-secondary rounded-full flex items-center justify-center mb-4">
                  <BarChart2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-1">Sin movimientos</h3>
                <p className="text-muted-foreground">
                  {filterProductId || filterType || dateFrom || dateTo
                    ? "No hay resultados con esos filtros."
                    : "Realiza ajustes de stock para ver el historial."}
                </p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader className="bg-secondary/30">
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Stock Anterior</TableHead>
                      <TableHead>Nuevo Stock</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.data.map((m: any) => {
                      const cfg = typeConfig[m.type as keyof typeof typeConfig];
                      const Icon = cfg.icon;
                      const isOut = m.type === "out";
                      return (
                        <TableRow key={m.id} className="hover:bg-secondary/10">
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {format(new Date(m.createdAt), "dd/MM/yy HH:mm", { locale: es })}
                          </TableCell>
                          <TableCell className="font-medium">
                            {m.productName || "-"}
                            {m.productSku && <span className="text-xs text-muted-foreground ml-1">({m.productSku})</span>}
                          </TableCell>
                          <TableCell>
                            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold w-max ${cfg.className}`}>
                              <Icon className="h-3.5 w-3.5" />
                              {cfg.label}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`font-bold ${isOut ? "text-destructive" : "text-emerald-600"}`}>
                              {isOut ? "-" : "+"}{Math.abs(m.quantity)}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{m.previousStock}</TableCell>
                          <TableCell className="font-bold">{m.newStock}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{m.reason || "-"}</TableCell>
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
        </>
      )}

      {tab === "bajo-stock" && (
        <div className="bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden">
          {lowStockQuery.isLoading ? (
            <div className="p-4">
              <TableSkeleton rows={6} cols={5} headers={["Producto", "Stock Actual", "Stock Mínimo", "Unidad", "Estado"]} />
            </div>
          ) : !lowStock.length ? (
            <div className="p-16 text-center flex flex-col items-center">
              <div className="h-16 w-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                <Package className="h-8 w-8 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold mb-1">¡Todo bien!</h3>
              <p className="text-muted-foreground">No hay productos con stock bajo.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-secondary/30">
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Stock Actual</TableHead>
                  <TableHead>Stock Mínimo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStock.map((p) => {
                  const isOut = p.stock === 0;
                  return (
                    <TableRow key={p.id} className="hover:bg-secondary/10">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.name} className="h-9 w-9 rounded-lg object-cover" />
                          ) : (
                            <div className="h-9 w-9 bg-secondary rounded-lg flex items-center justify-center">
                              <Package className="h-4 w-4 text-muted-foreground/40" />
                            </div>
                          )}
                          <div>
                            <span className="font-semibold">{p.name}</span>
                            {p.sku && <p className="text-xs text-muted-foreground">SKU: {p.sku}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.category?.name || "-"}</TableCell>
                      <TableCell>
                        <span className={`font-bold ${isOut ? "text-destructive" : "text-amber-600"}`}>
                          {p.stock} {p.unit || "uds"}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.minStock}</TableCell>
                      <TableCell>
                        <Badge className={isOut ? "bg-destructive/15 text-destructive border-destructive/30" : "bg-amber-500/15 text-amber-700 border-amber-300"}>
                          {isOut ? "Sin stock" : "Stock bajo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => {
                            setAdjustForm({ ...adjustForm, productId: p.id, type: "in" });
                            setAdjustDialogOpen(true);
                          }}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" /> Reponer
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {tab === "kardex" && (
        <div className="space-y-4">
          <div className="bg-card rounded-2xl shadow-sm border border-border/50 p-4">
            <div className="flex flex-wrap gap-3">
              <Select
                value={kardexProductId || "__none__"}
                onValueChange={(v) => setKardexProductId(v === "__none__" ? null : v)}
              >
                <SelectTrigger className="w-64 rounded-xl">
                  <SelectValue placeholder="Selecciona un producto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Selecciona un producto</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="date" value={kardexFrom} onChange={(e) => setKardexFrom(e.target.value)} className="rounded-xl w-40" placeholder="Desde" />
              <Input type="date" value={kardexTo} onChange={(e) => setKardexTo(e.target.value)} className="rounded-xl w-40" placeholder="Hasta" />
            </div>
          </div>

          {!kardexProductId ? (
            <div className="bg-card rounded-2xl border border-border/50 p-16 text-center flex flex-col items-center">
              <BookOpen className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">Selecciona un producto para ver su kárdex.</p>
            </div>
          ) : kardexQuery.isLoading ? (
            <div className="bg-card rounded-2xl border border-border/50 p-4">
              <TableSkeleton rows={8} cols={6} headers={["Fecha", "Tipo", "Cantidad", "Costo", "Stock Final", "Razón"]} />
            </div>
          ) : kardexQuery.data ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Stock inicial", value: kardexQuery.data.openingStock, color: "text-foreground" },
                  { label: "Entradas", value: kardexQuery.data.totalIn, color: "text-emerald-600" },
                  { label: "Salidas", value: kardexQuery.data.totalOut, color: "text-destructive" },
                  { label: "Stock final", value: kardexQuery.data.closingStock, color: "text-primary" },
                ].map((s) => (
                  <div key={s.label} className="bg-card rounded-2xl border border-border/50 p-5 text-center">
                    <p className="text-sm text-muted-foreground">{s.label}</p>
                    <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden">
                {!kardexQuery.data.movements.length ? (
                  <div className="p-10 text-center text-muted-foreground">Sin movimientos en el período.</div>
                ) : (
                  <Table>
                    <TableHeader className="bg-secondary/30">
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Cantidad</TableHead>
                        <TableHead>Stock Ant.</TableHead>
                        <TableHead>Stock Nuevo</TableHead>
                        <TableHead>Motivo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {kardexQuery.data.movements.map((m) => {
                        const cfg = typeConfig[m.type as keyof typeof typeConfig];
                        const Icon = cfg.icon;
                        const isOut = m.type === "out";
                        return (
                          <TableRow key={m.id} className="hover:bg-secondary/10">
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(m.createdAt), "dd/MM/yy HH:mm", { locale: es })}
                            </TableCell>
                            <TableCell>
                              <span className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold w-max ${cfg.className}`}>
                                <Icon className="h-3.5 w-3.5" />
                                {cfg.label}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className={`font-bold ${isOut ? "text-destructive" : "text-emerald-600"}`}>
                                {isOut ? "-" : "+"}{Math.abs(m.quantity)}
                              </span>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{m.previousStock}</TableCell>
                            <TableCell className="font-bold">{m.newStock}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{m.reason || "-"}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </>
          ) : null}
        </div>
      )}

      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent className="sm:max-w-[440px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Ajustar Inventario</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdjust} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Producto <span className="text-destructive">*</span></Label>
              <Select value={adjustForm.productId || "__none__"} onValueChange={(v) => setAdjustForm({ ...adjustForm, productId: v === "__none__" ? "" : v })}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Seleccionar producto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Seleccionar producto</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — Stock: {p.stock}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={adjustForm.type} onValueChange={(v) => setAdjustForm({ ...adjustForm, type: v as any })}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">Entrada (+)</SelectItem>
                    <SelectItem value="out">Salida (-)</SelectItem>
                    <SelectItem value="adjustment">Ajuste</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Cantidad</Label>
                <Input
                  required
                  type="number"
                  min="1"
                  value={adjustForm.quantity}
                  onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Motivo</Label>
              <Input
                value={adjustForm.reason}
                onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                className="rounded-xl"
                placeholder="Ej: Compra proveedor, venta, etc."
              />
            </div>

            <div className="space-y-2">
              <Label>Notas adicionales</Label>
              <Textarea
                value={adjustForm.notes}
                onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                className="rounded-xl resize-none"
                rows={2}
              />
            </div>

            <Button type="submit" disabled={adjustMutation.isPending} className="w-full h-12 rounded-xl">
              {adjustMutation.isPending ? <Loader2 className="animate-spin" /> : "Confirmar Ajuste"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
