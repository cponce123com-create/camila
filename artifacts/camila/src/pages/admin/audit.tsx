import { AdminLayout } from "@/components/layout/admin-layout";
import { useAdminGetAuditLogs } from "@workspace/api-client-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const ACTION_STYLES: Record<string, string> = {
  "store.update": "bg-blue-500/10 text-blue-700",
  "license.update": "bg-violet-500/10 text-violet-700",
  "user.update": "bg-amber-500/10 text-amber-700",
  "announcement.create": "bg-emerald-500/10 text-emerald-700",
  "ticket.update": "bg-teal-500/10 text-teal-700",
};

export default function AdminAuditPage() {
  const [page, setPage] = useState(1);
  const limit = 50;

  const { data, isLoading } = useAdminGetAuditLogs({ page, limit });

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold">Auditoría</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Registro de todas las acciones administrativas.</p>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">Cargando...</div>
        ) : (
          <>
            <Table>
              <TableHeader className="bg-secondary/30">
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Objetivo</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.data ?? []).map((log) => (
                  <TableRow key={log.id} className="hover:bg-secondary/10 text-sm">
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {log.createdAt ? format(new Date(log.createdAt), "dd MMM yy HH:mm", { locale: es }) : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm truncate max-w-[160px]">{log.actorEmail ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{log.actorRole ?? ""}</div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded-md font-semibold ${ACTION_STYLES[log.action] ?? "bg-muted text-muted-foreground"}`}>
                        {log.action}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{log.targetType ?? "—"}</TableCell>
                    <TableCell className="text-xs max-w-[180px] truncate">{log.targetLabel ?? log.targetId ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">{log.ipAddress ?? "—"}</TableCell>
                  </TableRow>
                ))}
                {(data?.data ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                      No hay registros de auditoría aún.
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
    </AdminLayout>
  );
}
