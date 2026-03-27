import { useState } from "react";
import { useLocation, useParams } from "wouter";
import {
  useGetRestaurantTables,
  useGetRestaurantOrders,
  useGetRestaurantOrder,
  useCreateRestaurantOrder,
  useUpdateRestaurantOrder,
  useAddOrderItem,
  useUpdateOrderItem,
  useDeleteOrderItem,
  useGetProducts,
  useGetCategories,
} from "@workspace/api-client-react";
import type { OrderItem } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Plus, Minus, Trash2, ChefHat, CheckCircle2,
  CreditCard, Loader2, ShoppingCart, Search, AlertCircle,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:   { label: "Pendiente", color: "text-amber-600" },
  preparing: { label: "Preparando", color: "text-blue-600" },
  served:    { label: "Servido",    color: "text-emerald-600" },
  cancelled: { label: "Cancelado", color: "text-red-500" },
};

export default function TableOrderPage() {
  const params = useParams<{ tableId: string }>();
  const tableId = params.tableId;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Tabs: "order" (current order) | "products" (add items)
  const [tab, setTab] = useState<"order" | "products">("order");
  const [productSearch, setProductSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payForm, setPayForm] = useState({ method: "cash", discount: "0", discountPct: "0" });
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteItem, setNoteItem] = useState<OrderItem | null>(null);
  const [noteText, setNoteText] = useState("");

  // Fetch all tables (to find this one)
  const { data: tablesData } = useGetRestaurantTables({});
  const table = (tablesData ?? []).find((t) => t.id === tableId);

  // Fetch open order for this table
  const { data: ordersData, isLoading: ordersLoading } = useGetRestaurantOrders({
    tableId,
    status: "open",
    limit: 1,
  });
  const openOrderSummary = ordersData?.data?.[0];
  const orderId = openOrderSummary?.id;

  // Fetch full order with items
  const { data: order, isLoading: orderLoading } = useGetRestaurantOrder(
    orderId ?? "",
    { query: { enabled: !!orderId } }
  );

  // Products
  const { data: productsData } = useGetProducts({
    search: productSearch || undefined,
    categoryId: categoryFilter || undefined,
    isActive: true,
    limit: 100,
  });
  const { data: categories } = useGetCategories();

  // Mutations
  const createOrder = useCreateRestaurantOrder();
  const updateOrder = useUpdateRestaurantOrder();
  const addItems = useAddOrderItem();
  const updateItem = useUpdateOrderItem();
  const deleteItem = useDeleteOrderItem();

  const invalidateOrder = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/restaurant/orders"] });
    queryClient.invalidateQueries({ queryKey: ["/api/restaurant/tables"] });
    if (orderId) {
      queryClient.invalidateQueries({ queryKey: [`/api/restaurant/orders/${orderId}`] });
    }
  };

  const handleOpenOrder = async () => {
    if (!tableId) return;
    try {
      await createOrder.mutateAsync({ data: { tableId } });
      invalidateOrder();
      setTab("products");
      toast({ title: "Mesa abierta — agrega los pedidos" });
    } catch {
      toast({ title: "Error al abrir mesa", variant: "destructive" });
    }
  };

  const handleAddProduct = async (productId: string, productName: string, price: number) => {
    if (!orderId) {
      // Create order first
      const newOrder = await createOrder.mutateAsync({ data: { tableId } });
      invalidateOrder();
      const newOrderId = (newOrder as any).id;
      if (!newOrderId) return;
      await addItems.mutateAsync({
        orderId: newOrderId,
        data: { items: [{ productId, productName, unitPrice: price, quantity: 1 }] },
      });
    } else {
      // Check if already in order
      const existing = order?.items?.find((i) => i.productId === productId && i.status !== "cancelled");
      if (existing) {
        // Increment quantity
        await updateItem.mutateAsync({
          orderId,
          itemId: existing.id,
          data: { quantity: existing.quantity + 1 },
        });
      } else {
        await addItems.mutateAsync({
          orderId,
          data: { items: [{ productId, productName, unitPrice: price, quantity: 1 }] },
        });
      }
    }
    invalidateOrder();
  };

  const handleQtyChange = async (item: OrderItem, delta: number) => {
    if (!orderId) return;
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      if (!confirm(`¿Quitar "${item.productName}" del pedido?`)) return;
      await deleteItem.mutateAsync({ orderId, itemId: item.id });
    } else {
      await updateItem.mutateAsync({ orderId, itemId: item.id, data: { quantity: newQty } });
    }
    invalidateOrder();
  };

  const handleRemoveItem = async (item: OrderItem) => {
    if (!orderId || !confirm(`¿Quitar "${item.productName}"?`)) return;
    await deleteItem.mutateAsync({ orderId, itemId: item.id });
    invalidateOrder();
  };

  const handleItemStatus = async (item: OrderItem, status: string) => {
    if (!orderId) return;
    await updateItem.mutateAsync({ orderId, itemId: item.id, data: { status: status as any } });
    invalidateOrder();
  };

  const handleOpenNote = (item: OrderItem) => {
    setNoteItem(item);
    setNoteText(item.notes ?? "");
    setNoteDialogOpen(true);
  };

  const handleSaveNote = async () => {
    if (!orderId || !noteItem) return;
    await updateItem.mutateAsync({ orderId, itemId: noteItem.id, data: { notes: noteText } });
    invalidateOrder();
    setNoteDialogOpen(false);
    toast({ title: "Nota guardada" });
  };

  const handlePay = async () => {
    if (!orderId) return;
    const discountAmt = parseFloat(payForm.discount) || 0;
    const discountPct = parseFloat(payForm.discountPct) || 0;
    try {
      await updateOrder.mutateAsync({
        orderId,
        data: {
          status: "paid",
          paymentMethod: payForm.method as any,
          discount: discountAmt,
          discountPercent: discountPct,
        },
      });
      // Table is set to free by backend
      invalidateOrder();
      toast({ title: "¡Cuenta cerrada! Mesa liberada." });
      setPayDialogOpen(false);
      navigate("/dashboard/restaurant");
    } catch {
      toast({ title: "Error al cerrar cuenta", variant: "destructive" });
    }
  };

  const handleCancelOrder = async () => {
    if (!orderId || !confirm("¿Cancelar este pedido y liberar la mesa?")) return;
    await updateOrder.mutateAsync({ orderId, data: { status: "cancelled" } });
    invalidateOrder();
    toast({ title: "Pedido cancelado" });
    navigate("/dashboard/restaurant");
  };

  const isLoading = ordersLoading;
  const hasOrder = !!orderId;
  const activeItems = order?.items?.filter((i) => i.status !== "cancelled") ?? [];
  const subtotal = parseFloat(String(order?.subtotal ?? 0));
  const total = parseFloat(String(order?.total ?? 0));
  const products = productsData?.data ?? [];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  if (!table) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-muted-foreground">Mesa no encontrada.</p>
        <Button onClick={() => navigate("/dashboard/restaurant")} className="rounded-xl">
          <ArrowLeft className="h-4 w-4 mr-2" /> Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/restaurant")} className="rounded-xl shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-display font-bold truncate">{table.name}</h1>
            {table.zone && <p className="text-xs text-muted-foreground">{table.zone}</p>}
          </div>
          {hasOrder && (
            <Badge className="bg-blue-50 text-blue-700 border-blue-200 border shrink-0">
              S/ {total.toFixed(2)}
            </Badge>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mt-2 bg-secondary/40 rounded-xl p-1">
          <button
            onClick={() => setTab("order")}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === "order" ? "bg-background shadow text-foreground" : "text-muted-foreground"
            }`}
          >
            <ShoppingCart className="inline h-3.5 w-3.5 mr-1.5" />
            Pedido {activeItems.length > 0 && `(${activeItems.length})`}
          </button>
          <button
            onClick={() => setTab("products")}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === "products" ? "bg-background shadow text-foreground" : "text-muted-foreground"
            }`}
          >
            <Plus className="inline h-3.5 w-3.5 mr-1.5" />
            Agregar
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-36">
        {/* ORDER TAB */}
        {tab === "order" && (
          <div className="px-4 py-4 space-y-3">
            {!hasOrder ? (
              <div className="text-center py-16">
                <ShoppingCart className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-lg font-semibold mb-1">Mesa libre</p>
                <p className="text-muted-foreground text-sm mb-6">Toca "Abrir Mesa" para comenzar un pedido</p>
                <Button className="rounded-2xl h-12 px-8 text-base" onClick={handleOpenOrder} disabled={createOrder.isPending}>
                  {createOrder.isPending ? <Loader2 className="animate-spin" /> : "Abrir Mesa"}
                </Button>
              </div>
            ) : activeItems.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Mesa abierta — agrega productos</p>
                <Button variant="outline" className="mt-4 rounded-xl" onClick={() => setTab("products")}>
                  <Plus className="h-4 w-4 mr-2" /> Agregar productos
                </Button>
              </div>
            ) : (
              activeItems.map((item) => {
                const sc = STATUS_LABELS[item.status] ?? { label: item.status, color: "" };
                return (
                  <div key={item.id} className="bg-card rounded-2xl border border-border/50 p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{item.productName}</span>
                          <button
                            onClick={() => handleItemStatus(
                              item,
                              item.status === "pending" ? "preparing"
                              : item.status === "preparing" ? "served"
                              : "pending"
                            )}
                            className={`text-xs font-medium px-2 py-0.5 rounded-full border transition-colors ${
                              item.status === "pending"
                                ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                                : item.status === "preparing"
                                ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}
                          >
                            {sc.label}
                          </button>
                        </div>
                        {item.notes && (
                          <p className="text-xs text-muted-foreground mt-0.5 italic">"{item.notes}"</p>
                        )}
                        <button
                          onClick={() => handleOpenNote(item)}
                          className="text-xs text-primary/70 hover:text-primary mt-0.5"
                        >
                          {item.notes ? "Editar nota" : "+ nota"}
                        </button>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="font-bold text-sm">S/ {parseFloat(String(item.subtotal)).toFixed(2)}</span>
                        <div className="flex items-center gap-1 bg-secondary/50 rounded-xl p-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg"
                            onClick={() => handleQtyChange(item, -1)}
                            disabled={updateItem.isPending || deleteItem.isPending}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg"
                            onClick={() => handleQtyChange(item, 1)}
                            disabled={updateItem.isPending}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* PRODUCTS TAB */}
        {tab === "products" && (
          <div className="px-4 py-4">
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar plato o bebida..."
                className="pl-9 rounded-xl"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
            </div>

            {/* Category filter */}
            {categories && categories.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-none">
                <button
                  onClick={() => setCategoryFilter("")}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                    !categoryFilter
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary/50 text-muted-foreground border-border/50 hover:bg-secondary"
                  }`}
                >
                  Todos
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCategoryFilter(c.id)}
                    className={`shrink-0 px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                      categoryFilter === c.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary/50 text-muted-foreground border-border/50 hover:bg-secondary"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}

            {/* Products grid */}
            {products.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No hay productos disponibles.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {products.map((p) => {
                  const price = parseFloat(String(p.salePrice || p.price));
                  const inOrder = order?.items?.find((i) => i.productId === p.id && i.status !== "cancelled");
                  const soldOut = !!(p as any).soldOut;
                  return (
                    <button
                      key={p.id}
                      onClick={() => !soldOut && handleAddProduct(p.id, p.name, price)}
                      disabled={soldOut || addItems.isPending || createOrder.isPending}
                      className={`relative flex flex-col text-left rounded-2xl border p-3 transition-all active:scale-[0.97] ${
                        soldOut
                          ? "opacity-50 cursor-not-allowed bg-secondary/30 border-border/30"
                          : "bg-card border-border/50 hover:shadow-md hover:border-primary/30 hover:bg-primary/5"
                      }`}
                    >
                      {inOrder && (
                        <div className="absolute top-2 right-2 h-5 w-5 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold">
                          {inOrder.quantity}
                        </div>
                      )}
                      {p.imageUrl && (
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="w-full h-20 object-cover rounded-xl mb-2"
                        />
                      )}
                      <span className="font-semibold text-sm leading-tight line-clamp-2">{p.name}</span>
                      {soldOut && <span className="text-xs text-destructive mt-1">Agotado</span>}
                      {p.description && !soldOut && (
                        <span className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{p.description}</span>
                      )}
                      <div className="flex items-baseline gap-1.5 mt-2">
                        <span className="font-bold text-primary">S/ {price.toFixed(2)}</span>
                        {p.salePrice && (
                          <span className="text-xs text-muted-foreground line-through">S/ {parseFloat(String(p.price)).toFixed(2)}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      {hasOrder && tab === "order" && activeItems.length > 0 && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-background/95 backdrop-blur border-t border-border/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-muted-foreground text-sm">Total ({activeItems.length} items)</span>
              <div className="text-2xl font-bold font-display text-primary">S/ {subtotal.toFixed(2)}</div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="rounded-xl text-destructive border-destructive/30 hover:bg-destructive/5"
                onClick={handleCancelOrder}
                disabled={updateOrder.isPending}
              >
                Cancelar
              </Button>
              <Button
                className="rounded-xl bg-primary h-12 px-6 text-base"
                onClick={() => setPayDialogOpen(true)}
              >
                <CreditCard className="h-4 w-4 mr-2" /> Cobrar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Note dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent className="rounded-2xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Nota para {noteItem?.productName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="rounded-xl resize-none"
              rows={3}
              placeholder="Sin cebolla, extra salsa, bien cocido..."
            />
            <Button onClick={handleSaveNote} className="w-full h-11 rounded-xl" disabled={updateItem.isPending}>
              {updateItem.isPending ? <Loader2 className="animate-spin" /> : "Guardar Nota"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pay dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="rounded-2xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Cerrar Cuenta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Summary */}
            <div className="bg-secondary/30 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>S/ {subtotal.toFixed(2)}</span>
              </div>
              {(parseFloat(payForm.discountPct) > 0 || parseFloat(payForm.discount) > 0) && (
                <div className="flex justify-between text-sm text-amber-600">
                  <span>Descuento</span>
                  <span>-S/ {(parseFloat(payForm.discountPct) > 0
                    ? subtotal * parseFloat(payForm.discountPct) / 100
                    : parseFloat(payForm.discount)).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t border-border/40 pt-2">
                <span>Total</span>
                <span className="text-primary">S/ {(
                  parseFloat(payForm.discountPct) > 0
                    ? Math.max(0, subtotal - subtotal * parseFloat(payForm.discountPct) / 100)
                    : Math.max(0, subtotal - parseFloat(payForm.discount))
                ).toFixed(2)}</span>
              </div>
            </div>

            {/* Discount */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Descuento (S/)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={payForm.discount}
                  onChange={(e) => setPayForm({ ...payForm, discount: e.target.value, discountPct: "0" })}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Descuento (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={payForm.discountPct}
                  onChange={(e) => setPayForm({ ...payForm, discountPct: e.target.value, discount: "0" })}
                  className="rounded-xl"
                />
              </div>
            </div>

            {/* Payment method */}
            <div className="grid grid-cols-3 gap-2">
              {["cash", "card", "transfer"].map((m) => (
                <button
                  key={m}
                  onClick={() => setPayForm({ ...payForm, method: m })}
                  className={`py-3 rounded-xl border text-sm font-medium transition-all ${
                    payForm.method === m
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary/40 border-border/50 hover:bg-secondary"
                  }`}
                >
                  {m === "cash" ? "Efectivo" : m === "card" ? "Tarjeta" : "Transfer."}
                </button>
              ))}
            </div>

            <Button
              className="w-full h-12 rounded-xl text-base"
              onClick={handlePay}
              disabled={updateOrder.isPending}
            >
              {updateOrder.isPending ? <Loader2 className="animate-spin" /> : (
                <><CheckCircle2 className="h-4 w-4 mr-2" /> Cobrar y Liberar Mesa</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
