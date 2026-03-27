import { AdminLayout } from "@/components/layout/admin-layout";
import {
  useAdminGetSupportTickets,
  useAdminUpdateSupportTicket,
} from "@workspace/api-client-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-gray-500/10 text-gray-600",
  medium: "bg-blue-500/10 text-blue-700",
  high: "bg-amber-500/10 text-amber-700",
  urgent: "bg-red-500/10 text-red-700",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Bajo",
  medium: "Medio",
  high: "Alto",
  urgent: "Urgente",
};

const STATUS_STYLES: Record<string, string> = {
  open: "bg-emerald-500/10 text-emerald-700",
  in_progress: "bg-blue-500/10 text-blue-700",
  resolved: "bg-gray-500/10 text-gray-600",
  closed: "bg-gray-500/10 text-gray-500 line-through",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Abierto",
  in_progress: "En progreso",
  resolved: "Resuelto",
  closed: "Cerrado",
};

export default function AdminSupportPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<any | null>(null);
  const [responseText, setResponseText] = useState("");
  const [newStatus, setNewStatus] = useState<string>("");
  const updateMutation = useAdminUpdateSupportTicket();

  const { data, isLoading } = useAdminGetSupportTickets({
    status: statusFilter !== "all" ? (statusFilter as any) : undefined,
    page,
    limit: 20,
  });

  const openTicket = (ticket: any) => {
    setSelected(ticket);
    setResponseText("");
    setNewStatus(ticket.status);
  };

  const handleSave = async () => {
    if (!selected) return;
    try {
      await updateMutation.mutateAsync({
        ticketId: selected.id,
        data: {
          status: newStatus as any,
          response: responseText || undefined,
        },
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support-tickets"] });
      toast({ title: "Ticket actualizado" });
      setSelected(null);
    } catch {
      toast({ title: "Error al actualizar", variant: "destructive" });
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Soporte</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Tickets enviados por las tiendas.</p>
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44 rounded-xl">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="open">Abierto</SelectItem>
            <SelectItem value="in_progress">En progreso</SelectItem>
            <SelectItem value="resolved">Resuelto</SelectItem>
            <SelectItem value="closed">Cerrado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">Cargando...</div>
        ) : (
          <>
            <Table>
              <TableHeader className="bg-secondary/30">
                <TableRow>
                  <TableHead>Tienda</TableHead>
                  <TableHead>Asunto</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.data ?? []).map((t) => (
                  <TableRow key={t.id} className="hover:bg-secondary/10 text-sm">
                    <TableCell>
                      <div className="font-semibold text-sm">{t.storeName ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{t.requesterEmail ?? ""}</div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{t.subject}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded-md font-semibold ${PRIORITY_STYLES[t.priority] ?? "bg-muted text-muted-foreground"}`}>
                        {PRIORITY_LABELS[t.priority] ?? t.priority}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded-md font-semibold ${STATUS_STYLES[t.status] ?? "bg-muted text-muted-foreground"}`}>
                        {STATUS_LABELS[t.status] ?? t.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {t.createdAt ? format(new Date(t.createdAt), "dd MMM yy", { locale: es }) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" className="rounded-lg text-xs gap-1.5" onClick={() => openTicket(t)}>
                        <MessageSquare className="h-3.5 w-3.5" /> Responder
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(data?.data ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                      No hay tickets de soporte.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-border/50">
                <p className="text-sm text-muted-foreground">Página {data.page} de {data.totalPages}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="rounded-lg" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-lg" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Ticket Dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">{selected?.subject}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-secondary/50 rounded-xl p-4 text-sm">
              <p className="text-muted-foreground text-xs mb-1">{selected?.storeName} • {selected?.requesterEmail}</p>
              <p className="whitespace-pre-wrap">{selected?.body}</p>
            </div>

            {/* Existing responses */}
            {(selected?.responses ?? []).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Respuestas previas</p>
                {(selected?.responses ?? []).map((r: any, i: number) => (
                  <div key={i} className="bg-primary/5 rounded-xl p-3 text-sm">
                    <p className="text-xs text-muted-foreground mb-1">{r.author} — {r.createdAt ? format(new Date(r.createdAt), "dd MMM yy HH:mm", { locale: es }) : ""}</p>
                    <p className="whitespace-pre-wrap">{r.body}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Cambiar estado</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Abierto</SelectItem>
                  <SelectItem value="in_progress">En progreso</SelectItem>
                  <SelectItem value="resolved">Resuelto</SelectItem>
                  <SelectItem value="closed">Cerrado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Añadir respuesta (opcional)</label>
              <Textarea
                placeholder="Escribe tu respuesta..."
                className="rounded-xl resize-none"
                rows={4}
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setSelected(null)}>Cancelar</Button>
            <Button className="rounded-xl" onClick={handleSave} disabled={updateMutation.isPending}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
