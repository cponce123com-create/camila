import { AdminLayout } from "@/components/layout/admin-layout";
import { useAdminGetAllStores } from "@workspace/api-client-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Store as StoreIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { TableSkeleton } from "@/components/ui/skeletons";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-700",
  trial: "bg-amber-500/10 text-amber-700",
  expired: "bg-red-500/10 text-red-700",
  suspended: "bg-gray-500/10 text-gray-700",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Activa",
  trial: "Trial",
  expired: "Vencida",
  suspended: "Suspendida",
};

const PLAN_LABELS: Record<string, string> = {
  trial: "Trial",
  monthly: "Mensual",
  quarterly: "Trimestral",
  semi_annual: "Semestral",
  annual: "Anual",
  free: "Gratis",
};

export default function AdminStoresPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useAdminGetAllStores({
    search: debouncedSearch || undefined,
    status: status !== "all" ? (status as any) : undefined,
    page,
    limit: 20,
  });

  const handleSearch = (v: string) => {
    setSearch(v);
    setPage(1);
    clearTimeout((window as any)._searchTimeout);
    (window as any)._searchTimeout = setTimeout(() => setDebouncedSearch(v), 400);
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Tiendas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data ? `${data.total} tienda${data.total !== 1 ? "s" : ""} registrada${data.total !== 1 ? "s" : ""}` : "Cargando..."}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, teléfono o correo..."
            className="pl-9 rounded-xl"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-44 rounded-xl">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="active">Activa</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="expired">Vencida</SelectItem>
            <SelectItem value="suspended">Suspendida</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden">
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton
              rows={8}
              cols={8}
              headers={["Negocio", "Titular", "Contacto", "Distrito", "Licencia", "Plan", "Creada", ""]}
            />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader className="bg-secondary/30">
                <TableRow>
                  <TableHead>Negocio</TableHead>
                  <TableHead>Titular</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Distrito</TableHead>
                  <TableHead>Licencia</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Creada</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.data ?? []).map((store) => {
                  const lic = (store as any).license;
                  return (
                    <TableRow key={store.id} className="hover:bg-secondary/10">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <StoreIcon className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-semibold text-sm">{store.businessName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{store.ownerName}</TableCell>
                      <TableCell>
                        <div className="text-sm">{store.phone}</div>
                        <div className="text-xs text-muted-foreground">{store.email}</div>
                      </TableCell>
                      <TableCell className="text-sm">{store.district}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-md font-bold ${STATUS_STYLES[lic?.status ?? ""] ?? "bg-muted text-muted-foreground"}`}>
                          {STATUS_LABELS[lic?.status ?? ""] ?? "Sin licencia"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {PLAN_LABELS[lic?.plan ?? ""] ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {store.createdAt ? format(new Date(store.createdAt), "dd MMM yyyy", { locale: es }) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/admin/stores/${store.id}`}>
                          <Button variant="outline" size="sm" className="rounded-lg text-xs">Gestionar</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(data?.data ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                      No se encontraron tiendas.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-border/50">
                <p className="text-sm text-muted-foreground">
                  Página {data.page} de {data.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg"
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg"
                    disabled={page >= data.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
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
