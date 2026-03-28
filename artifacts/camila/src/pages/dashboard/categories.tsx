import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  useGetCategories, useCreateCategory, useDeleteCategory, useUpdateCategory,
} from "@workspace/api-client-react";
import type { Category } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Trash2, Edit, Tags, Loader2, ChevronRight, FolderOpen, Folder,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ImageUpload } from "@/components/ui/image-upload";

const EMPTY_FORM = { name: "", description: "", parentId: "" as string | undefined, imageUrl: "" };

export default function CategoriesPage() {
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: categories, isLoading } = useGetCategories();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/categories"] });

  const openCreate = (parentId?: string) => {
    setEditing(null);
    setFormData({ ...EMPTY_FORM, parentId: parentId || "" });
    setDialogMode("create");
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setFormData({
      name: cat.name,
      description: cat.description || "",
      parentId: cat.parentId || "",
      imageUrl: cat.imageUrl || "",
    });
    setDialogMode("edit");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      description: formData.description || undefined,
      parentId: formData.parentId || undefined,
      imageUrl: formData.imageUrl || undefined,
    };

    try {
      if (dialogMode === "edit" && editing) {
        await updateMutation.mutateAsync({ categoryId: editing.id, data: payload });
        toast({ title: "Categoría actualizada" });
      } else {
        await createMutation.mutateAsync({ data: payload });
        toast({ title: "Categoría creada" });
      }
      invalidate();
      setDialogMode(null);
    } catch {
      toast({ title: "Error al guardar", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar la categoría "${name}"? Las subcategorías pasarán al nivel raíz.`)) return;
    try {
      await deleteMutation.mutateAsync({ categoryId: id });
      invalidate();
      toast({ title: "Categoría eliminada" });
    } catch {
      toast({ title: "Error al eliminar", variant: "destructive" });
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const rootCategories = categories?.filter((c) => !c.parentId) ?? [];
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Categorías</h1>
          <p className="text-muted-foreground">Organiza tus productos con categorías y subcategorías.</p>
        </div>
        <Button
          onClick={() => openCreate()}
          className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg shadow-primary/20"
        >
          <Plus className="mr-2 h-4 w-4" /> Nueva Categoría
        </Button>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="animate-spin h-8 w-8 mx-auto text-muted-foreground" />
          </div>
        ) : !rootCategories.length ? (
          <div className="p-16 text-center flex flex-col items-center">
            <div className="h-16 w-16 bg-secondary rounded-full flex items-center justify-center mb-4">
              <Tags className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-1">No hay categorías</h3>
            <p className="text-muted-foreground mb-4">Crea tu primera categoría para organizar tus productos.</p>
            <Button onClick={() => openCreate()} variant="outline" className="rounded-xl">
              <Plus className="mr-2 h-4 w-4" /> Crear categoría
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {rootCategories.map((cat) => {
              const subs = cat.subcategories || [];
              const isExpanded = expandedIds.has(cat.id);
              return (
                <div key={cat.id}>
                  <div className="flex items-center gap-3 px-5 py-4 hover:bg-secondary/10 group">
                    <button
                      onClick={() => subs.length > 0 && toggleExpand(cat.id)}
                      className={cn(
                        "p-1 rounded-lg transition-colors",
                        subs.length > 0 ? "text-muted-foreground hover:text-foreground hover:bg-secondary" : "invisible"
                      )}
                    >
                      {isExpanded ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
                    </button>

                    {cat.imageUrl ? (
                      <img src={cat.imageUrl} alt={cat.name} className="h-9 w-9 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Tags className="h-4 w-4 text-primary" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{cat.name}</span>
                        {subs.length > 0 && (
                          <Badge variant="secondary" className="text-xs">{subs.length} sub</Badge>
                        )}
                      </div>
                      {cat.description && (
                        <p className="text-sm text-muted-foreground truncate">{cat.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openCreate(cat.id)}
                        className="h-8 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Plus className="h-3 w-3 mr-1" /> Sub
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(cat)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDelete(cat.id, cat.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {isExpanded && subs.length > 0 && (
                    <div className="bg-secondary/5 border-t border-border/30">
                      {subs.map((sub) => (
                        <div key={sub.id} className="flex items-center gap-3 px-5 py-3 pl-14 hover:bg-secondary/10 group border-b border-border/20 last:border-0">
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                          {sub.imageUrl ? (
                            <img src={sub.imageUrl} alt={sub.name} className="h-7 w-7 rounded-md object-cover shrink-0" />
                          ) : (
                            <div className="h-7 w-7 rounded-md bg-primary/5 flex items-center justify-center shrink-0">
                              <Tags className="h-3 w-3 text-primary/60" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-sm text-foreground">{sub.name}</span>
                            {sub.description && (
                              <p className="text-xs text-muted-foreground truncate">{sub.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => openEdit(sub)}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => handleDelete(sub.id, sub.name)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={dialogMode !== null} onOpenChange={(o) => !o && setDialogMode(null)}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {dialogMode === "edit" ? "Editar Categoría" : "Nueva Categoría"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Nombre <span className="text-destructive">*</span></Label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="rounded-xl"
                placeholder="Ej: Ropa de mujer"
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="rounded-xl resize-none"
                rows={2}
                placeholder="Opcional"
              />
            </div>

            {categories && categories.filter((c) => !c.parentId).length > 0 && (
              <div className="space-y-2">
                <Label>Categoría Padre (subcategoría)</Label>
                <Select
                  value={formData.parentId || "__none__"}
                  onValueChange={(v) => setFormData({ ...formData, parentId: v === "__none__" ? "" : v })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Sin categoría padre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin categoría padre</SelectItem>
                    {categories
                      .filter((c) => !c.parentId && (!editing || c.id !== editing.id))
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <ImageUpload
                label="Imagen de categoría (opcional)"
                hint="JPG o PNG · máx. 2MB"
                folder="category"
                value={formData.imageUrl}
                onChange={(url) => setFormData({ ...formData, imageUrl: url })}
              />
            </div>

            <Button type="submit" disabled={isPending} className="w-full h-12 rounded-xl mt-2">
              {isPending ? <Loader2 className="animate-spin" /> : dialogMode === "edit" ? "Guardar Cambios" : "Crear Categoría"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
