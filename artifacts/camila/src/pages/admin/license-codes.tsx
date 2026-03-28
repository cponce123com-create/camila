import { useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Copy, Check, Trash2, Ticket, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const PLAN_LABELS: Record<string, string> = {
  trial: "Trial", monthly: "Mensual", quarterly: "Trimestral",
  semi_annual: "Semestral", annual: "Anual", free: "Gratuito",
};

interface LicenseCode {
  id: string;
  code: string;
  plan: string;
  durationDays: number;
  maxUses: number;
  usedCount: number;
  usedByStoreId: string | null;
  usedAt: string | null;
  notes: string | null;
  expiresAt: string | null;
  createdAt: string;
}

function codeStatus(code: LicenseCode): { label: string; className: string } {
  const now = new Date();
  if (code.expiresAt && new Date(code.expiresAt) < now)
    return { label: "Vencido", className: "bg-red-50 text-red-700 border border-red-200" };
  if (code.usedCount >= code.maxUses)
    return { label: "Agotado", className: "bg-gray-100 text-gray-600 border border-gray-200" };
  return { label: "Disponible", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
}

function fmt(d: string) {
  return format(new Date(d), "d MMM yyyy", { locale: es });
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useListCodes(page: number, used?: string) {
  return useQuery<{ data: LicenseCode[]; total: number; totalPages: number }>({
    queryKey: ["/api/admin/license-codes", page, used],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (used) params.set("used", used);
      const r = await fetch(`/api/admin/license-codes?${params}`, { credentials: "include" });
      if (!r.ok) throw new Error("Error al cargar códigos");
      return r.json();
    },
  });
}

function useCreateCode() {
  return useMutation<LicenseCode, Error, {
    plan: string; durationDays: number; maxUses: number; notes?: string; expiresAt?: string;
  }>({
    mutationFn: async (body) => {
      const r = await fetch("/api/admin/license-codes", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Error al crear código");
      return data;
    },
  });
}

function useDeleteCode() {
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const r = await fetch(`/api/admin/license-codes/${id}`, { method: "DELETE", credentials: "include" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Error al eliminar");
    },
  });
}

// ─── Create Dialog ─────────────────────────────────────────────────────────────

function CreateDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const createMutation = useCreateCode();
  const [plan, setPlan] = useState("monthly");
  const [days, setDays] = useState("30");
  const [maxUses, setMaxUses] = useState("1");
  const [notes, setNotes] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [created, setCreated] = useState<LicenseCode | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleCreate() {
    const d = parseInt(days);
    const m = parseInt(maxUses);
    if (isNaN(d) || d < 1) { toast({ title: "Ingresa un número de días válido", variant: "destructive" }); return; }
    if (isNaN(m) || m < 1) { toast({ title: "Ingresa un número de usos válido", variant: "destructive" }); return; }
    try {
      const result = await createMutation.mutateAsync({
        plan, durationDays: d, maxUses: m,
        notes: notes || undefined,
        expiresAt: expiresAt || undefined,
      });
      setCreated(result);
      qc.invalidateQueries({ queryKey: ["/api/admin/license-codes"] });
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    }
  }

  async function copyCode() {
    if (!created) return;
    await navigator.clipboard.writeText(created.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (created) {
    return (
      <div className="space-y-5">
        <DialogHeader>
          <DialogTitle>¡Código generado!</DialogTitle>
        </DialogHeader>
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-5 space-y-3">
          <p className="text-xs text-emerald-700 font-semibold uppercase tracking-wider">Tu código de licencia</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xl font-bold font-mono text-emerald-800 tracking-widest">
              {created.code}
            </code>
            <Button variant="outline" size="icon" onClick={copyCode} className="shrink-0 border-emerald-300">
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <div className="text-xs text-emerald-700 space-y-0.5">
            <p>Plan: <span className="font-semibold">{PLAN_LABELS[created.plan]}</span></p>
            <p>Duración: <span className="font-semibold">{created.durationDays} días</span></p>
            <p>Usos máximos: <span className="font-semibold">{created.maxUses}</span></p>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose} className="w-full">Cerrar</Button>
        </DialogFooter>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>Nuevo código de licencia</DialogTitle>
      </DialogHeader>

      <div className="space-y-3">
        <div>
          <Label>Plan</Label>
          <Select value={plan} onValueChange={setPlan}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PLAN_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="lc-days">Días de acceso</Label>
            <Input id="lc-days" type="number" min="1" value={days} onChange={e => setDays(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="lc-uses">Máx. usos</Label>
            <Input id="lc-uses" type="number" min="1" value={maxUses} onChange={e => setMaxUses(e.target.value)} className="mt-1.5" />
          </div>
        </div>

        <div>
          <Label htmlFor="lc-notes">Notas (opcional)</Label>
          <Input id="lc-notes" placeholder="Ej: Campaña Black Friday" value={notes} onChange={e => setNotes(e.target.value)} className="mt-1.5" />
        </div>

        <div>
          <Label htmlFor="lc-exp">Vencimiento del código (opcional)</Label>
          <Input id="lc-exp" type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className="mt-1.5" />
        </div>
      </div>

      <DialogFooter className="gap-2 pt-2">
        <Button variant="outline" onClick={onClose} disabled={createMutation.isPending}>Cancelar</Button>
        <Button onClick={handleCreate} disabled={createMutation.isPending}>
          {createMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creando…</> : "Crear código"}
        </Button>
      </DialogFooter>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminLicenseCodesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<string | undefined>(undefined);
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading } = useListCodes(page, filter);
  const deleteMutation = useDeleteCode();

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: "Código eliminado" });
      qc.invalidateQueries({ queryKey: ["/api/admin/license-codes"] });
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Códigos de licencia</h1>
          <p className="text-sm text-muted-foreground">Genera y gestiona códigos canjeables para activar licencias.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Nuevo código
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-4">
        {[
          { label: "Todos", value: undefined },
          { label: "Disponibles", value: "false" },
          { label: "Agotados/Usados", value: "true" },
        ].map(opt => (
          <Button
            key={String(opt.value)}
            variant={filter === opt.value ? "default" : "outline"}
            size="sm"
            onClick={() => { setFilter(opt.value); setPage(1); }}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Días</TableHead>
              <TableHead>Usos</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Notas</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : (data?.data ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  <Ticket className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No hay códigos todavía</p>
                </TableCell>
              </TableRow>
            ) : (
              (data?.data ?? []).map((code) => {
                const status = codeStatus(code);
                return (
                  <TableRow key={code.id}>
                    <TableCell>
                      <code className="font-mono text-sm font-semibold tracking-wider">{code.code}</code>
                    </TableCell>
                    <TableCell>{PLAN_LABELS[code.plan] ?? code.plan}</TableCell>
                    <TableCell>{code.durationDays}d</TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {code.usedCount} / {code.maxUses}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {code.expiresAt ? fmt(code.expiresAt) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={status.className}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">
                      {code.notes ?? "—"}
                    </TableCell>
                    <TableCell>
                      {code.usedCount === 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(code.id)}
                          disabled={deletingId === code.id}
                        >
                          {deletingId === code.id
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Trash2 className="h-4 w-4" />}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {(data?.totalPages ?? 1) > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button variant="outline" size="icon" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page} de {data?.totalPages}
          </span>
          <Button variant="outline" size="icon" onClick={() => setPage(p => p + 1)} disabled={page >= (data?.totalPages ?? 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <CreateDialog onClose={() => setShowCreate(false)} />
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
