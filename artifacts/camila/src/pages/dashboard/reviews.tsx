import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  useGetAllReviews,
  useModerateProductReview,
  useDeleteProductReview,
} from "@workspace/api-client-react";
import type { ProductReview } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare, CheckCircle2, XCircle, Trash2, Loader2, Star,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-3.5 w-3.5 ${s <= rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const [filterApproved, setFilterApproved] = useState<"" | "true" | "false">("");
  const [page, setPage] = useState(1);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useGetAllReviews({
    isApproved: filterApproved ? filterApproved === "true" : undefined,
    page,
    limit: 20,
  });

  const moderateMutation = useModerateProductReview();
  const deleteMutation = useDeleteProductReview();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
  };

  const handleModerate = async (review: ProductReview, approve: boolean) => {
    try {
      await moderateMutation.mutateAsync({
        productId: review.productId,
        reviewId: review.id,
        data: { isApproved: approve },
      });
      toast({ title: approve ? "Reseña aprobada" : "Reseña rechazada" });
      invalidate();
    } catch {
      toast({ title: "Error al moderar la reseña", variant: "destructive" });
    }
  };

  const handleDelete = async (review: ProductReview) => {
    if (!confirm(`¿Eliminar la reseña de "${review.customerName}"?`)) return;
    try {
      await deleteMutation.mutateAsync({
        productId: review.productId,
        reviewId: review.id,
      });
      toast({ title: "Reseña eliminada" });
      invalidate();
    } catch {
      toast({ title: "Error al eliminar la reseña", variant: "destructive" });
    }
  };

  const reviews = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Reseñas</h1>
          <p className="text-muted-foreground">
            {data?.total ?? 0} reseñas en total
          </p>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-border/50 mb-4 p-4">
        <div className="flex gap-3 flex-wrap">
          <Select
            value={filterApproved || "__all__"}
            onValueChange={(v) => {
              setFilterApproved(v === "__all__" ? "" : v as any);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-48 rounded-xl">
              <SelectValue placeholder="Estado de moderación" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas las reseñas</SelectItem>
              <SelectItem value="false">Pendientes</SelectItem>
              <SelectItem value="true">Aprobadas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="animate-spin h-8 w-8 mx-auto text-muted-foreground" />
          </div>
        ) : !reviews.length ? (
          <div className="p-16 text-center flex flex-col items-center">
            <div className="h-16 w-16 bg-secondary rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-1">Sin reseñas</h3>
            <p className="text-muted-foreground">
              {filterApproved ? "No hay reseñas con este filtro." : "Aún no se han recibido reseñas."}
            </p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader className="bg-secondary/30">
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Valoración</TableHead>
                  <TableHead>Comentario</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((r) => (
                  <TableRow key={r.id} className="hover:bg-secondary/10">
                    <TableCell>
                      <div>
                        <div className="font-semibold text-sm">{r.customerName}</div>
                        {r.customerEmail && (
                          <div className="text-xs text-muted-foreground">{r.customerEmail}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm font-medium">{r.productName || "—"}</div>
                        {r.variantLabel && (
                          <div className="text-xs text-muted-foreground">{r.variantLabel}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StarRating rating={r.rating} />
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground max-w-xs truncate">
                        {r.comment || <span className="italic text-muted-foreground/50">Sin comentario</span>}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {format(parseISO(r.createdAt), "d MMM yyyy", { locale: es })}
                      </span>
                    </TableCell>
                    <TableCell>
                      {r.isApproved ? (
                        <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-200">
                          Aprobada
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50">
                          Pendiente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        {!r.isApproved ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-emerald-600 hover:text-emerald-700"
                            title="Aprobar"
                            onClick={() => handleModerate(r, true)}
                            disabled={moderateMutation.isPending}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-amber-600 hover:text-amber-700"
                            title="Rechazar"
                            onClick={() => handleModerate(r, false)}
                            disabled={moderateMutation.isPending}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          title="Eliminar"
                          onClick={() => handleDelete(r)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="p-4 flex items-center justify-between border-t border-border/40">
                <span className="text-sm text-muted-foreground">
                  Página {page} de {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="rounded-xl"
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-xl"
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
