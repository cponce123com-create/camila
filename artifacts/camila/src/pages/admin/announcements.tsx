import { AdminLayout } from "@/components/layout/admin-layout";
import {
  useAdminGetAnnouncements,
  useAdminCreateAnnouncement,
  useAdminUpdateAnnouncement,
  useAdminDeleteAnnouncement,
} from "@workspace/api-client-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit2, Trash2, Megaphone, Info, AlertTriangle, CheckCircle, Wrench } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  info: { label: "Información", color: "bg-blue-500/10 text-blue-700", icon: Info },
  warning: { label: "Advertencia", color: "bg-amber-500/10 text-amber-700", icon: AlertTriangle },
  success: { label: "Éxito", color: "bg-emerald-500/10 text-emerald-700", icon: CheckCircle },
  maintenance: { label: "Mantenimiento", color: "bg-gray-500/10 text-gray-700", icon: Wrench },
};

const EMPTY_FORM = { title: "", body: "", type: "info", isActive: true, expiresAt: "" };

export default function AdminAnnouncementsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: announcements, isLoading } = useAdminGetAnnouncements();
  const createMutation = useAdminCreateAnnouncement();
  const updateMutation = useAdminUpdateAnnouncement();
  const deleteMutation = useAdminDeleteAnnouncement();

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (a: any) => {
    setEditTarget(a);
    setForm({
      title: a.title,
      body: a.body,
      type: a.type,
      isActive: a.isActive,
      expiresAt: a.expiresAt ? a.expiresAt.slice(0, 16) : "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast({ title: "Título y cuerpo son requeridos", variant: "destructive" });
      return;
    }
    try {
      const payload: any = {
        title: form.title,
        body: form.body,
        type: form.type as any,
        isActive: form.isActive,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
      };
      if (editTarget) {
        await updateMutation.mutateAsync({ announcementId: editTarget.id, data: payload });
        toast({ title: "Anuncio actualizado" });
      } else {
        await createMutation.mutateAsync({ data: payload });
        toast({ title: "Anuncio creado" });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/announcements"] });
      setDialogOpen(false);
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync({ announcementId: deleteTarget.id });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/announcements"] });
      toast({ title: "Anuncio eliminado" });
      setDeleteTarget(null);
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Anuncios</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Comunicados visibles para todas las tiendas.</p>
        </div>
        <Button className="rounded-xl gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nuevo anuncio
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-20">Cargando...</div>
      ) : (announcements ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="h-16 w-16 bg-secondary rounded-2xl flex items-center justify-center">
            <Megaphone className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">No hay anuncios creados.</p>
          <Button className="rounded-xl gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" />Crear primer anuncio
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(announcements ?? []).map((a) => {
            const cfg = TYPE_CONFIG[a.type] ?? TYPE_CONFIG.info;
            const Icon = cfg.icon;
            return (
              <div key={a.id} className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-xs px-2 py-1 rounded-md font-semibold flex items-center gap-1.5 flex-shrink-0 ${cfg.color}`}>
                      <Icon className="h-3 w-3" />
                      {cfg.label}
                    </span>
                    {!a.isActive && (
                      <span className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground font-semibold flex-shrink-0">Inactivo</span>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => openEdit(a)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget(a)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">{a.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{a.body}</p>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-2 border-t border-border/50">
                  <span>{a.createdAt ? format(new Date(a.createdAt), "dd MMM yyyy", { locale: es }) : "—"}</span>
                  {a.expiresAt && (
                    <span>Expira: {format(new Date(a.expiresAt), "dd MMM yyyy", { locale: es })}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">{editTarget ? "Editar anuncio" : "Nuevo anuncio"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Título</label>
              <Input
                placeholder="Ej: Mantenimiento programado"
                className="mt-1.5 rounded-xl"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Mensaje</label>
              <Textarea
                placeholder="Escribe el contenido del anuncio..."
                className="mt-1.5 rounded-xl resize-none"
                rows={4}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Tipo</label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger className="mt-1.5 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Información</SelectItem>
                    <SelectItem value="warning">Advertencia</SelectItem>
                    <SelectItem value="success">Éxito</SelectItem>
                    <SelectItem value="maintenance">Mantenimiento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Expira el</label>
                <Input
                  type="datetime-local"
                  className="mt-1.5 rounded-xl text-sm"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
              <label className="text-sm font-medium">Activo (visible para las tiendas)</label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button className="rounded-xl" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Guardando..." : editTarget ? "Actualizar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar anuncio?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción es permanente. El anuncio "{deleteTarget?.title}" será eliminado.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete} disabled={deleteMutation.isPending}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
