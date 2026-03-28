import { useParams, useLocation } from "wouter";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useGetSale, useUpdateSale, useDeleteSale, useGetStoreSettings } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Download, MessageCircle, Printer, Trash2, RotateCcw,
  CheckCircle2, XCircle, Loader2, Receipt,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { generateReceiptPDF } from "@/lib/receipt-pdf";
import { useAuth } from "@/hooks/use-auth";

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia", other: "Otro",
};

const STATUS_CONF: Record<string, { label: string; icon: React.ReactNode; badgeClass: string }> = {
  paid:      { label: "Pagado",   icon: <CheckCircle2 className="h-4 w-4" />, badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  open:      { label: "Abierto",  icon: <Receipt className="h-4 w-4" />,      badgeClass: "bg-blue-50 text-blue-700 border-blue-200" },
  cancelled: { label: "Anulado",  icon: <XCircle className="h-4 w-4" />,      badgeClass: "bg-red-50 text-red-700 border-red-200" },
  refunded:  { label: "Devuelto", icon: <RotateCcw className="h-4 w-4" />,    badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
};

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { store } = useAuth();

  const { data: sale, isLoading } = useGetSale(id);
  const { data: settings } = useGetStoreSettings();
  const updateSale = useUpdateSale();
  const deleteSale = useDeleteSale();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!sale) {
    return (
      <DashboardLayout>
        <div className="text-center py-16">
          <p className="text-muted-foreground">Venta no encontrada.</p>
          <Button variant="outline" className="mt-4 rounded-xl" onClick={() => navigate("/dashboard/sales")}>
            Volver
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const cfg = STATUS_CONF[sale.status] ?? { label: sale.status, icon: null, badgeClass: "" };
  const subtotal = parseFloat(String(sale.subtotal));
  const discount = parseFloat(String(sale.discount));
  const discountPct = parseFloat(String(sale.discountPercent));
  const tax = parseFloat(String(sale.tax));
  const total = parseFloat(String(sale.total));
  const items: any[] = (sale as any).items ?? [];

  // PDF
  const handleDownloadPDF = () => {
    const doc = generateReceiptPDF({
      receiptCode: sale.receiptCode,
      store: {
        name: store?.name ?? "Mi Tienda",
        address: (store as any)?.address ?? undefined,
        phone: (store as any)?.phone ?? undefined,
        ruc: (store as any)?.ruc ?? undefined,
        email: (store as any)?.email ?? undefined,
      },
      clientName: sale.clientName,
      clientPhone: sale.clientPhone,
      staffName: (sale as any).staffName,
      items: items.map((i) => ({
        productName: i.productName,
        quantity: i.quantity,
        unitPrice: parseFloat(String(i.unitPrice)),
        discount: parseFloat(String(i.discount ?? 0)),
        subtotal: parseFloat(String(i.subtotal)),
      })),
      subtotal,
      discount,
      discountPercent: discountPct,
      tax,
      total,
      paymentMethod: sale.paymentMethod,
      notes: sale.notes,
      soldAt: sale.soldAt,
      thankYouMessage: (settings as any)?.thankYouMessage ?? null,
    });
    doc.save(`Recibo-${sale.receiptCode}.pdf`);
    toast({ title: "PDF descargado" });
  };

  // WhatsApp
  const handleWhatsApp = () => {
    const itemLines = items
      .map((i) => `• ${i.productName} x${i.quantity} — S/ ${parseFloat(String(i.subtotal)).toFixed(2)}`)
      .join("\n");
    const date = format(parseISO(sale.soldAt), "d 'de' MMMM yyyy, HH:mm", { locale: es });
    const tyMsg = ((settings as any)?.thankYouMessage?.trim()) || "¡Gracias por tu compra!";
    const text = `🧾 *RECIBO ${sale.receiptCode}*\n*${store?.name ?? "Mi Tienda"}*\n\n📅 ${date}\n\n${itemLines}\n\n─────────────\nSubtotal: S/ ${subtotal.toFixed(2)}${discount > 0 ? `\nDescuento: -S/ ${discount.toFixed(2)}` : ""}\n*TOTAL: S/ ${total.toFixed(2)}*\n\nPago: ${PAYMENT_LABELS[sale.paymentMethod] ?? sale.paymentMethod}\n\n${tyMsg} 🌿`;
    const number = sale.clientPhone?.replace(/\D/g, "") ?? "";
    const url = `https://wa.me/${number ? `51${number}` : ""}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const handleDelete = async () => {
    try {
      await deleteSale.mutateAsync({ saleId: id });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      toast({ title: "Venta eliminada" });
      navigate("/dashboard/sales");
    } catch {
      toast({ title: "Error al eliminar venta", variant: "destructive" });
    }
  };

  const handleMarkCancelled = async () => {
    try {
      await updateSale.mutateAsync({ saleId: id, data: { status: "cancelled" } });
      queryClient.invalidateQueries({ queryKey: [`/api/sales/${id}`] });
      toast({ title: "Venta anulada" });
    } catch {
      toast({ title: "Error al anular venta", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/sales")} className="rounded-xl">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-display font-bold font-mono">{sale.receiptCode}</h1>
              <Badge className={`border ${cfg.badgeClass} flex items-center gap-1`}>
                {cfg.icon} {cfg.label}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">
              {format(parseISO(sale.soldAt), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" className="rounded-xl h-9 gap-2" onClick={handleDownloadPDF}>
            <Download className="h-4 w-4" /> PDF
          </Button>
          <Button variant="outline" className="rounded-xl h-9 gap-2 text-green-600 border-green-200 hover:bg-green-50" onClick={handleWhatsApp}>
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </Button>
          {sale.status !== "cancelled" && sale.status !== "refunded" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="rounded-xl h-9 gap-2 text-destructive border-destructive/30 hover:bg-destructive/5">
                  <XCircle className="h-4 w-4" /> Anular
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Anular esta venta?</AlertDialogTitle>
                  <AlertDialogDescription>Esta acción marcará la venta como anulada. No se puede deshacer.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                  <AlertDialogAction className="rounded-xl bg-destructive" onClick={handleMarkCancelled}>Anular Venta</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar esta venta?</AlertDialogTitle>
                <AlertDialogDescription>Se eliminará permanentemente del historial.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                <AlertDialogAction className="rounded-xl bg-destructive" onClick={handleDelete}>Eliminar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Receipt visual */}
        <div className="lg:col-span-2">
          {/* Receipt card */}
          <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
            {/* Receipt header band */}
            <div className="bg-primary px-6 py-5 text-primary-foreground">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xl font-display font-bold">{store?.name ?? "Mi Tienda"}</div>
                  {(store as any)?.address && <div className="text-primary-foreground/70 text-sm mt-0.5">{(store as any).address}</div>}
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-sm">{sale.receiptCode}</div>
                  <div className="text-primary-foreground/70 text-xs mt-0.5">
                    {format(parseISO(sale.soldAt), "d MMM yyyy HH:mm", { locale: es })}
                  </div>
                </div>
              </div>
            </div>

            {/* Client / staff row */}
            {(sale.clientName || (sale as any).staffName) && (
              <div className="px-6 py-3 bg-secondary/20 border-b border-border/30 flex flex-wrap gap-4 text-sm">
                {sale.clientName && (
                  <div>
                    <span className="text-muted-foreground font-medium">Cliente:</span>{" "}
                    <span className="font-medium">{sale.clientName}</span>
                    {sale.clientPhone && <span className="text-muted-foreground ml-2">· {sale.clientPhone}</span>}
                  </div>
                )}
                {(sale as any).staffName && (
                  <div>
                    <span className="text-muted-foreground font-medium">Vendedor:</span>{" "}
                    <span className="font-medium">{(sale as any).staffName}</span>
                  </div>
                )}
              </div>
            )}

            {/* Items */}
            <div className="p-6">
              <div className="border border-border/40 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/40">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Producto</th>
                      <th className="text-center px-3 py-2 font-semibold text-muted-foreground w-14">Cant.</th>
                      <th className="text-right px-3 py-2 font-semibold text-muted-foreground w-24">P. Unit.</th>
                      <th className="text-right px-3 py-2 font-semibold text-muted-foreground w-24">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {items.map((item, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-background" : "bg-secondary/10"}>
                        <td className="px-3 py-2.5 font-medium">
                          {item.productName}
                          {item.discount > 0 && (
                            <span className="ml-2 text-xs text-amber-600">-S/ {parseFloat(String(item.discount)).toFixed(2)}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center text-muted-foreground">{item.quantity}</td>
                        <td className="px-3 py-2.5 text-right text-muted-foreground">S/ {parseFloat(String(item.unitPrice)).toFixed(2)}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-primary">S/ {parseFloat(String(item.subtotal)).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="mt-4 space-y-1.5 text-sm max-w-xs ml-auto">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>S/ {subtotal.toFixed(2)}</span>
                </div>
                {(discount > 0 || discountPct > 0) && (
                  <div className="flex justify-between text-amber-600">
                    <span>Descuento{discountPct > 0 ? ` (${discountPct}%)` : ""}</span>
                    <span>-S/ {discount.toFixed(2)}</span>
                  </div>
                )}
                {tax > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>IGV</span>
                    <span>S/ {tax.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t border-border/40 pt-2">
                  <span>TOTAL</span>
                  <span className="text-primary text-xl">S/ {total.toFixed(2)}</span>
                </div>
              </div>

              {/* Notes */}
              {sale.notes && (
                <div className="mt-4 p-3 rounded-xl bg-secondary/20 text-sm text-muted-foreground italic">
                  Nota: {sale.notes}
                </div>
              )}

              {/* Footer */}
              <div className="mt-6 text-center border-t border-dashed border-border/40 pt-4 space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  {(settings as any)?.thankYouMessage?.trim() || "¡Gracias por tu compra! Vuelve pronto."}
                </p>
                <p className="text-xs text-muted-foreground/40">Generado con Camila · camila.pe</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Summary info */}
        <div className="space-y-4">
          {/* Total card */}
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
            <div className="text-sm text-muted-foreground font-medium mb-1">Total cobrado</div>
            <div className="text-4xl font-display font-bold text-primary">S/ {total.toFixed(2)}</div>
            <div className="mt-3 text-sm flex items-center gap-2 text-muted-foreground">
              <span className="font-medium">Pago:</span>
              <span>{PAYMENT_LABELS[sale.paymentMethod] ?? sale.paymentMethod}</span>
            </div>
          </div>

          {/* Details */}
          <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-3">
            <h3 className="font-semibold text-sm">Detalles</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recibo</span>
                <span className="font-mono font-bold text-primary">{sale.receiptCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estado</span>
                <Badge className={`border text-xs ${cfg.badgeClass}`}>{cfg.label}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Productos</span>
                <span className="font-medium">{items.length} ítems</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fecha</span>
                <span className="font-medium">{format(parseISO(sale.soldAt), "dd/MM/yyyy HH:mm")}</span>
              </div>
              {sale.clientName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cliente</span>
                  <span className="font-medium">{sale.clientName}</span>
                </div>
              )}
              {(sale as any).staffName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vendedor</span>
                  <span className="font-medium">{(sale as any).staffName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="space-y-2">
            <Button variant="outline" className="w-full rounded-xl h-11 gap-2 justify-start" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 text-primary" />
              Descargar PDF
            </Button>
            <Button variant="outline" className="w-full rounded-xl h-11 gap-2 justify-start text-green-700 border-green-200 hover:bg-green-50" onClick={handleWhatsApp}>
              <MessageCircle className="h-4 w-4" />
              Enviar por WhatsApp
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
