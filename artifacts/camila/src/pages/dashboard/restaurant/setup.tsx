import { useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  useGetRestaurantTables,
  useCreateRestaurantTable,
  useBulkCreateTables,
  useUpdateRestaurantTable,
  useDeleteRestaurantTable,
} from "@workspace/api-client-react";
import type { RestaurantTable } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, Plus, Edit, Trash2, ArrowLeft, Layers } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  free:     { label: "Libre",     variant: "outline" },
  occupied: { label: "Ocupada",   variant: "default" },
  to_pay:   { label: "Por Pagar", variant: "secondary" },
  closed:   { label: "Cerrada",   variant: "secondary" },
};

export default function RestaurantSetupPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tables, isLoading } = useGetRestaurantTables({});
  const createMutation = useCreateRestaurantTable();
  const bulkMutation = useBulkCreateTables();
  const updateMutation = useUpdateRestaurantTable();
  const deleteMutation = useDeleteRestaurantTable();

  // Single table form
  const [singleOpen, setSingleOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [singleForm, setSingleForm] = useState({
    name: "", zone: "", capacity: "4", sortOrder: "0", notes: "",
  });

  // Bulk form
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    count: "5", prefix: "Mesa", zone: "", capacity: "4",
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/restaurant/tables"] });
  };

  const openCreate = () => {
    setEditingId(null);
    setSingleForm({ name: "", zone: "", capacity: "4", sortOrder: "0", notes: "" });
    setSingleOpen(true);
  };

  const openEdit = (t: RestaurantTable) => {
    setEditingId(t.id);
    setSingleForm({
      name: t.name,
      zone: t.zone ?? "",
      capacity: String(t.capacity ?? 4),
      sortOrder: String(t.sortOrder),
      notes: t.notes ?? "",
    });
    setSingleOpen(true);
  };

  const handleSaveSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: singleForm.name,
      zone: singleForm.zone || undefined,
      capacity: parseInt(singleForm.capacity),
      sortOrder: parseInt(singleForm.sortOrder),
      notes: singleForm.notes || undefined,
    };
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ tableId: editingId, data: payload });
        toast({ title: "Mesa actualizada" });
      } else {
        await createMutation.mutateAsync({ data: payload });
        toast({ title: "Mesa creada" });
      }
      invalidate();
      setSingleOpen(false);
    } catch {
      toast({ title: "Error al guardar", variant: "destructive" });
    }
  };

  const handleBulkCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await bulkMutation.mutateAsync({
        data: {
          count: parseInt(bulkForm.count),
          prefix: bulkForm.prefix,
          zone: bulkForm.zone || undefined,
          capacity: parseInt(bulkForm.capacity),
        },
      });
      toast({ title: `${created.length} mesas creadas` });
      invalidate();
      setBulkOpen(false);
    } catch {
      toast({ title: "Error al crear mesas", variant: "destructive" });
    }
  };

  const handleToggleActive = async (t: RestaurantTable) => {
    await updateMutation.mutateAsync({ tableId: t.id, data: { isActive: !t.isActive } });
    invalidate();
  };

  const handleDelete = async (t: RestaurantTable) => {
    if (!confirm(`¿Eliminar ${t.name}?`)) return;
    try {
      await deleteMutation.mutateAsync({ tableId: t.id });
      toast({ title: "Mesa eliminada" });
      invalidate();
    } catch {
      toast({ title: "No se puede eliminar esta mesa (puede tener pedidos)", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/restaurant")} className="rounded-xl">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-display font-bold">Configuración de Mesas</h1>
          <p className="text-muted-foreground">{tables?.length ?? 0} mesas configuradas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => setBulkOpen(true)}>
            <Layers className="mr-2 h-4 w-4" /> Crear varias
          </Button>
          <Button className="rounded-xl" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Nueva Mesa
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="animate-spin h-8 w-8 mx-auto text-muted-foreground" />
          </div>
        ) : !tables?.length ? (
          <div className="p-16 text-center">
            <p className="text-muted-foreground mb-4">No hay mesas configuradas aún.</p>
            <Button className="rounded-xl" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Agregar primera mesa
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-secondary/30">
              <TableRow>
                <TableHead>Mesa</TableHead>
                <TableHead>Zona</TableHead>
                <TableHead>Capacidad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Activa</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(tables ?? []).map((t) => {
                const cfg = STATUS_CONFIG[t.status] ?? { label: t.status, variant: "outline" as const };
                return (
                  <TableRow key={t.id} className="hover:bg-secondary/10">
                    <TableCell className="font-semibold">{t.name}</TableCell>
                    <TableCell className="text-muted-foreground">{t.zone || "—"}</TableCell>
                    <TableCell>{t.capacity} pers.</TableCell>
                    <TableCell>
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={t.isActive}
                        onCheckedChange={() => handleToggleActive(t)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(t)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Single table dialog */}
      <Dialog open={singleOpen} onOpenChange={setSingleOpen}>
        <DialogContent className="sm:max-w-[440px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {editingId ? "Editar Mesa" : "Nueva Mesa"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveSingle} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Nombre <span className="text-destructive">*</span></Label>
              <Input
                required
                value={singleForm.name}
                onChange={(e) => setSingleForm({ ...singleForm, name: e.target.value })}
                className="rounded-xl"
                placeholder="Mesa 1, VIP, Terraza A..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Zona</Label>
                <Input
                  value={singleForm.zone}
                  onChange={(e) => setSingleForm({ ...singleForm, zone: e.target.value })}
                  className="rounded-xl"
                  placeholder="Salón, Terraza..."
                />
              </div>
              <div className="space-y-2">
                <Label>Capacidad (pers.)</Label>
                <Input
                  type="number"
                  min="1"
                  value={singleForm.capacity}
                  onChange={(e) => setSingleForm({ ...singleForm, capacity: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Input
                value={singleForm.notes}
                onChange={(e) => setSingleForm({ ...singleForm, notes: e.target.value })}
                className="rounded-xl"
                placeholder="Opcional"
              />
            </div>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="w-full h-12 rounded-xl"
            >
              {createMutation.isPending || updateMutation.isPending
                ? <Loader2 className="animate-spin" />
                : editingId ? "Guardar Cambios" : "Crear Mesa"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk create dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="sm:max-w-[440px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Crear Varias Mesas</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBulkCreate} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cantidad <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={bulkForm.count}
                  onChange={(e) => setBulkForm({ ...bulkForm, count: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Prefijo <span className="text-destructive">*</span></Label>
                <Input
                  required
                  value={bulkForm.prefix}
                  onChange={(e) => setBulkForm({ ...bulkForm, prefix: e.target.value })}
                  className="rounded-xl"
                  placeholder="Mesa"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground bg-secondary/50 rounded-xl px-3 py-2">
              Se crearán: <strong>{bulkForm.prefix} 1</strong>, <strong>{bulkForm.prefix} 2</strong>... hasta <strong>{bulkForm.prefix} {bulkForm.count}</strong>
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Zona</Label>
                <Input
                  value={bulkForm.zone}
                  onChange={(e) => setBulkForm({ ...bulkForm, zone: e.target.value })}
                  className="rounded-xl"
                  placeholder="Salón..."
                />
              </div>
              <div className="space-y-2">
                <Label>Capacidad (pers.)</Label>
                <Input
                  type="number"
                  min="1"
                  value={bulkForm.capacity}
                  onChange={(e) => setBulkForm({ ...bulkForm, capacity: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={bulkMutation.isPending}
              className="w-full h-12 rounded-xl"
            >
              {bulkMutation.isPending ? <Loader2 className="animate-spin" /> : `Crear ${bulkForm.count} mesas`}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
