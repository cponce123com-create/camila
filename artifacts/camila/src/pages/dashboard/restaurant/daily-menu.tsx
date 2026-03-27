import { useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  useGetDailyMenu,
  useCreateOrUpdateDailyMenu,
  useAddDailyMenuItem,
  useUpdateDailyMenuItem,
  useDeleteDailyMenuItem,
  usePublishDailyMenu,
  useGetProducts,
} from "@workspace/api-client-react";
import type { DailyMenuItem } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, ArrowLeft, Plus, Trash2, Edit, Globe, EyeOff, UtensilsCrossed } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function DailyMenuPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const today = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(today);

  const { data: menu, isLoading } = useGetDailyMenu({ date: selectedDate });
  const createMenu = useCreateOrUpdateDailyMenu();
  const addItem = useAddDailyMenuItem();
  const updateItem = useUpdateDailyMenuItem();
  const deleteItem = useDeleteDailyMenuItem();
  const publishMenu = usePublishDailyMenu();
  const { data: products } = useGetProducts({ isActive: true, limit: 200 });

  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState({
    productId: "", name: "", description: "", specialPrice: "", notes: "",
  });

  const menuId = (menu as any)?.id;
  const items: DailyMenuItem[] = (menu as any)?.items ?? [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/restaurant/daily-menu"] });
  };

  const ensureMenu = async (): Promise<string | null> => {
    if (menuId) return menuId;
    try {
      const created = await createMenu.mutateAsync({ data: { date: selectedDate } });
      invalidate();
      return (created as any).id;
    } catch {
      return null;
    }
  };

  const openAddItem = () => {
    setEditingItemId(null);
    setItemForm({ productId: "", name: "", description: "", specialPrice: "", notes: "" });
    setItemDialogOpen(true);
  };

  const openEditItem = (item: DailyMenuItem) => {
    setEditingItemId(item.id);
    setItemForm({
      productId: item.productId ?? "",
      name: item.name,
      description: item.description ?? "",
      specialPrice: item.specialPrice ? String(item.specialPrice) : "",
      notes: item.notes ?? "",
    });
    setItemDialogOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      productId: itemForm.productId || undefined,
      name: itemForm.name,
      description: itemForm.description || undefined,
      specialPrice: itemForm.specialPrice ? parseFloat(itemForm.specialPrice) : undefined,
      notes: itemForm.notes || undefined,
    };

    try {
      if (editingItemId && menuId) {
        await updateItem.mutateAsync({ menuId, itemId: editingItemId, data: payload });
        toast({ title: "Plato actualizado" });
      } else {
        const mid = await ensureMenu();
        if (!mid) { toast({ title: "Error al crear menú", variant: "destructive" }); return; }
        await addItem.mutateAsync({ menuId: mid, data: payload });
        toast({ title: "Plato agregado" });
      }
      invalidate();
      setItemDialogOpen(false);
    } catch {
      toast({ title: "Error al guardar", variant: "destructive" });
    }
  };

  const handleDeleteItem = async (item: DailyMenuItem) => {
    if (!menuId || !confirm(`¿Eliminar "${item.name}"?`)) return;
    await deleteItem.mutateAsync({ menuId, itemId: item.id });
    toast({ title: "Plato eliminado" });
    invalidate();
  };

  const handleTogglePublish = async () => {
    if (!menuId) {
      const mid = await ensureMenu();
      if (!mid) return;
      await publishMenu.mutateAsync({ menuId: mid, data: { isPublished: true } });
    } else {
      await publishMenu.mutateAsync({ menuId, data: { isPublished: !(menu as any)?.isPublished } });
    }
    toast({ title: (menu as any)?.isPublished ? "Menú despublicado" : "Menú publicado" });
    invalidate();
  };

  const handleProductSelect = (productId: string) => {
    const p = products?.data?.find((p) => p.id === productId);
    if (p) {
      setItemForm({
        ...itemForm,
        productId,
        name: p.name,
        specialPrice: itemForm.specialPrice,
        description: p.description ?? "",
      });
    }
  };

  const isPublished = (menu as any)?.isPublished ?? false;
  const dateLabel = selectedDate === today ? "Hoy" : format(new Date(selectedDate + "T12:00:00"), "d MMM yyyy", { locale: es });

  return (
    <DashboardLayout>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/restaurant")} className="rounded-xl">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-display font-bold">Menú del Día</h1>
          <p className="text-muted-foreground">{dateLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-xl w-40"
          />
          <Button
            variant={isPublished ? "outline" : "default"}
            className="rounded-xl"
            onClick={handleTogglePublish}
            disabled={publishMenu.isPending || createMenu.isPending}
          >
            {publishMenu.isPending || createMenu.isPending ? (
              <Loader2 className="animate-spin h-4 w-4 mr-2" />
            ) : isPublished ? (
              <><EyeOff className="h-4 w-4 mr-2" /> Despublicar</>
            ) : (
              <><Globe className="h-4 w-4 mr-2" /> Publicar</>
            )}
          </Button>
        </div>
      </div>

      {/* Status banner */}
      {isPublished && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 mb-4 flex items-center gap-2 text-emerald-700">
          <Globe className="h-4 w-4" />
          <span className="text-sm font-medium">Menú publicado y visible para los clientes</span>
        </div>
      )}

      {/* Menu notes */}
      {menuId && (
        <div className="bg-card rounded-2xl border border-border/50 p-4 mb-4">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Nota del menú (opcional)</Label>
          <p className="text-sm text-muted-foreground mt-1">
            {(menu as any)?.notes ?? "Sin notas"}
          </p>
        </div>
      )}

      {/* Items list */}
      <div className="bg-card rounded-2xl border border-border/50 overflow-hidden mb-4">
        <div className="flex items-center justify-between p-4 border-b border-border/40">
          <h2 className="font-semibold">Platos del día <span className="text-muted-foreground font-normal">({items.length})</span></h2>
          <Button size="sm" className="rounded-xl" onClick={openAddItem}>
            <Plus className="h-4 w-4 mr-1.5" /> Agregar plato
          </Button>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="animate-spin h-6 w-6 mx-auto text-muted-foreground" />
          </div>
        ) : !items.length ? (
          <div className="p-12 text-center">
            <UtensilsCrossed className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Sin platos en el menú</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Agrega los platos del día</p>
            <Button variant="outline" size="sm" className="mt-4 rounded-xl" onClick={openAddItem}>
              <Plus className="h-4 w-4 mr-1.5" /> Agregar primer plato
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {items.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-4 p-4 hover:bg-secondary/5">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.name}</span>
                    {!item.isActive && (
                      <Badge variant="secondary" className="text-xs py-0">Inactivo</Badge>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                  )}
                  {item.notes && (
                    <p className="text-xs text-muted-foreground/70 italic">{item.notes}</p>
                  )}
                </div>
                {item.specialPrice && (
                  <div className="text-right shrink-0">
                    <div className="font-bold text-primary">S/ {parseFloat(String(item.specialPrice)).toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">precio especial</div>
                  </div>
                )}
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditItem(item)}>
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteItem(item)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Item dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {editingItemId ? "Editar Plato" : "Agregar Plato"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveItem} className="space-y-4 mt-2">
            {/* Product selector */}
            {products?.data && products.data.length > 0 && !editingItemId && (
              <div className="space-y-2">
                <Label>Importar desde catálogo (opcional)</Label>
                <select
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  value={itemForm.productId}
                  onChange={(e) => handleProductSelect(e.target.value)}
                >
                  <option value="">— Seleccionar producto —</option>
                  {products.data.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} (S/ {parseFloat(String(p.price)).toFixed(2)})</option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Nombre <span className="text-destructive">*</span></Label>
              <Input
                required
                value={itemForm.name}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                className="rounded-xl"
                placeholder="Lomo saltado, Arroz con leche..."
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={itemForm.description}
                onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                className="rounded-xl resize-none"
                rows={2}
                placeholder="Incluye arroz y ensalada..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Precio especial (S/)</Label>
                <Input
                  type="number"
                  step="0.50"
                  min="0"
                  value={itemForm.specialPrice}
                  onChange={(e) => setItemForm({ ...itemForm, specialPrice: e.target.value })}
                  className="rounded-xl"
                  placeholder="Opcional"
                />
              </div>
              <div className="space-y-2">
                <Label>Notas</Label>
                <Input
                  value={itemForm.notes}
                  onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })}
                  className="rounded-xl"
                  placeholder="Sin gluten..."
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={addItem.isPending || updateItem.isPending}
              className="w-full h-12 rounded-xl"
            >
              {addItem.isPending || updateItem.isPending
                ? <Loader2 className="animate-spin" />
                : editingItemId ? "Guardar Cambios" : "Agregar al Menú"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
