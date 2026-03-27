import { useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  useCreateSale,
  useGetProducts,
  useGetCategories,
  useGetClients,
  useCreateClient,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Plus, Minus, Trash2, Search, UserPlus, Loader2, ShoppingBag,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface CartItem {
  productId?: string;
  productName: string;
  productSku?: string;
  unitPrice: number;
  quantity: number;
  discount: number;
}

export default function NewSalePage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);

  // Client
  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [newClientForm, setNewClientForm] = useState({ name: "", phone: "", email: "", notes: "" });

  // Sale details
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [discountPct, setDiscountPct] = useState(0);
  const [discountAmt, setDiscountAmt] = useState(0);
  const [notes, setNotes] = useState("");

  // Products
  const [productSearch, setProductSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showProducts, setShowProducts] = useState(true);

  const { data: productsData } = useGetProducts({
    search: productSearch || undefined,
    categoryId: categoryFilter || undefined,
    isActive: true,
    limit: 100,
  });
  const { data: categories } = useGetCategories();
  const { data: clientsData } = useGetClients({ search: clientSearch || undefined, limit: 20 });
  const createSale = useCreateSale();
  const createClient = useCreateClient();

  const products = productsData?.data ?? [];
  const clients = clientsData?.data ?? [];

  // — Cart operations —
  const addToCart = (productId: string, productName: string, sku: string | undefined, price: number) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.productId === productId);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + 1 };
        return updated;
      }
      return [...prev, { productId, productName, productSku: sku, unitPrice: price, quantity: 1, discount: 0 }];
    });
  };

  const updateQty = (idx: number, delta: number) => {
    setCart((prev) => {
      const updated = [...prev];
      const newQty = updated[idx].quantity + delta;
      if (newQty <= 0) return prev.filter((_, i) => i !== idx);
      updated[idx] = { ...updated[idx], quantity: newQty };
      return updated;
    });
  };

  const removeItem = (idx: number) => {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  };

  // — Totals —
  const lineSubtotal = cart.reduce((s, i) => s + (i.unitPrice * i.quantity - i.discount), 0);
  const discountValue = discountPct > 0
    ? lineSubtotal * (discountPct / 100)
    : discountAmt;
  const total = Math.max(0, lineSubtotal - discountValue);

  // — Client selection —
  const selectClient = (client: any) => {
    setClientId(client.id);
    setClientName(client.name);
    setClientPhone(client.phone ?? "");
    setClientSearch("");
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await createClient.mutateAsync({ data: { name: newClientForm.name, phone: newClientForm.phone || undefined, email: newClientForm.email || undefined, notes: newClientForm.notes || undefined } });
      selectClient(created);
      toast({ title: "Cliente creado" });
      setNewClientOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    } catch {
      toast({ title: "Error al crear cliente", variant: "destructive" });
    }
  };

  // — Submit —
  const handleSubmit = async () => {
    if (cart.length === 0) {
      toast({ title: "Agrega al menos un producto", variant: "destructive" });
      return;
    }
    try {
      const result = await createSale.mutateAsync({
        data: {
          clientId: clientId || undefined,
          clientName: clientName || undefined,
          clientPhone: clientPhone || undefined,
          notes: notes || undefined,
          discount: discountAmt,
          discountPercent: discountPct,
          paymentMethod: paymentMethod as any,
          items: cart.map((i) => ({
            productId: i.productId,
            productName: i.productName,
            productSku: i.productSku || undefined,
            unitPrice: i.unitPrice,
            quantity: i.quantity,
            discount: i.discount,
          })),
        },
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      toast({ title: "Venta registrada" });
      navigate(`/dashboard/sales/${(result as any).id}`);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || "Error al registrar venta";
      toast({ title: "Error al registrar venta", description: typeof msg === "string" ? msg : JSON.stringify(msg), variant: "destructive" });
    }
  };

  return (
    <DashboardLayout>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/sales")} className="rounded-xl">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-display font-bold">Nueva Venta</h1>
          <p className="text-muted-foreground text-sm">{cart.length} producto{cart.length !== 1 ? "s" : ""} en el carrito</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Left: products */}
        <div className="lg:col-span-3 space-y-4">
          {/* Search */}
          <div className="bg-card rounded-2xl border border-border/50 p-4">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar producto..."
                className="pl-9 rounded-xl"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
            </div>
            {/* Categories */}
            {categories && categories.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button onClick={() => setCategoryFilter("")} className={`shrink-0 px-3 py-1 rounded-xl text-xs font-medium border transition-all ${!categoryFilter ? "bg-primary text-primary-foreground border-primary" : "bg-secondary/50 border-border/50 text-muted-foreground"}`}>Todos</button>
                {categories.map((c: any) => (
                  <button key={c.id} onClick={() => setCategoryFilter(c.id)} className={`shrink-0 px-3 py-1 rounded-xl text-xs font-medium border transition-all ${categoryFilter === c.id ? "bg-primary text-primary-foreground border-primary" : "bg-secondary/50 border-border/50 text-muted-foreground"}`}>{c.name}</button>
                ))}
              </div>
            )}
          </div>

          {/* Product grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {products.map((p) => {
              const price = parseFloat(String(p.salePrice || p.price));
              const inCart = cart.find((i) => i.productId === p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => addToCart(p.id, p.name, (p as any).sku, price)}
                  className="relative flex flex-col text-left rounded-2xl border border-border/50 bg-card p-3 hover:shadow-md hover:border-primary/30 transition-all active:scale-[0.97]"
                >
                  {inCart && (
                    <div className="absolute top-2 right-2 h-5 w-5 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold">
                      {inCart.quantity}
                    </div>
                  )}
                  {p.imageUrl && (
                    <img src={p.imageUrl} alt={p.name} className="w-full h-16 object-cover rounded-xl mb-2" />
                  )}
                  <span className="font-semibold text-sm leading-tight line-clamp-2">{p.name}</span>
                  {p.stock !== undefined && p.stock <= 0 && (
                    <span className="text-xs text-destructive mt-0.5">Sin stock</span>
                  )}
                  <span className="font-bold text-primary text-sm mt-1">S/ {price.toFixed(2)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Cart + details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Cart */}
          <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
            <div className="p-4 border-b border-border/40 font-semibold flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-primary" /> Carrito
            </div>
            {cart.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Sin productos — selecciona de la izquierda
              </div>
            ) : (
              <div className="divide-y divide-border/40 max-h-64 overflow-y-auto">
                {cart.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{item.productName}</div>
                      <div className="text-xs text-primary font-bold">S/ {(item.unitPrice * item.quantity - item.discount).toFixed(2)}</div>
                    </div>
                    <div className="flex items-center gap-1 bg-secondary/50 rounded-xl p-0.5 shrink-0">
                      <Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg" onClick={() => updateQty(idx, -1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-5 text-center text-sm font-bold">{item.quantity}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg" onClick={() => updateQty(idx, 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeItem(idx)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Client section */}
          <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Cliente (opcional)</Label>
              <Button variant="ghost" size="sm" className="h-7 rounded-xl text-xs" onClick={() => setNewClientOpen(true)}>
                <UserPlus className="h-3 w-3 mr-1" /> Nuevo
              </Button>
            </div>
            {clientId ? (
              <div className="flex items-center justify-between bg-primary/5 rounded-xl p-2.5">
                <div>
                  <div className="font-medium text-sm">{clientName}</div>
                  {clientPhone && <div className="text-xs text-muted-foreground">{clientPhone}</div>}
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => { setClientId(""); setClientName(""); setClientPhone(""); }}>
                  Quitar
                </Button>
              </div>
            ) : (
              <>
                <Input
                  placeholder="Buscar cliente..."
                  className="rounded-xl"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                />
                {clientSearch && clients.length > 0 && (
                  <div className="bg-background rounded-xl border border-border/50 shadow-lg max-h-36 overflow-y-auto">
                    {clients.map((cl) => (
                      <button
                        key={cl.id}
                        onClick={() => selectClient(cl)}
                        className="w-full text-left px-3 py-2 hover:bg-secondary/50 transition-colors"
                      >
                        <div className="text-sm font-medium">{cl.name}</div>
                        {cl.phone && <div className="text-xs text-muted-foreground">{cl.phone}</div>}
                      </button>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Nombre del cliente"
                    className="rounded-xl"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                  />
                  <Input
                    placeholder="Celular"
                    className="rounded-xl"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          {/* Payment + discount */}
          <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-3">
            <Label className="font-semibold">Pago y Descuento</Label>
            <div className="grid grid-cols-3 gap-2">
              {["cash", "card", "transfer"].map((m) => (
                <button
                  key={m}
                  onClick={() => setPaymentMethod(m)}
                  className={`py-2 rounded-xl border text-xs font-medium transition-all ${paymentMethod === m ? "bg-primary text-primary-foreground border-primary" : "bg-secondary/40 border-border/50 hover:bg-secondary"}`}
                >
                  {m === "cash" ? "💵 Efectivo" : m === "card" ? "💳 Tarjeta" : "📲 Transfer."}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Descuento (S/)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={discountAmt || ""}
                  onChange={(e) => { setDiscountAmt(parseFloat(e.target.value) || 0); setDiscountPct(0); }}
                  className="rounded-xl mt-1"
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Descuento (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={discountPct || ""}
                  onChange={(e) => { setDiscountPct(parseFloat(e.target.value) || 0); setDiscountAmt(0); }}
                  className="rounded-xl mt-1"
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Observaciones</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="rounded-xl mt-1 resize-none"
                rows={2}
                placeholder="Opcional..."
              />
            </div>
          </div>

          {/* Total + submit */}
          <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span>S/ {lineSubtotal.toFixed(2)}</span>
            </div>
            {discountValue > 0 && (
              <div className="flex justify-between text-sm text-amber-600">
                <span>Descuento</span>
                <span>-S/ {discountValue.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg border-t border-border/40 pt-2">
              <span>TOTAL</span>
              <span className="text-primary text-xl">S/ {total.toFixed(2)}</span>
            </div>
            <Button
              className="w-full h-12 rounded-xl text-base mt-1"
              onClick={handleSubmit}
              disabled={createSale.isPending || cart.length === 0}
            >
              {createSale.isPending ? <Loader2 className="animate-spin" /> : "Registrar Venta"}
            </Button>
          </div>
        </div>
      </div>

      {/* New client dialog */}
      <Dialog open={newClientOpen} onOpenChange={setNewClientOpen}>
        <DialogContent className="rounded-2xl sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Nuevo Cliente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateClient} className="space-y-3 mt-2">
            <div>
              <Label>Nombre <span className="text-destructive">*</span></Label>
              <Input required className="rounded-xl mt-1" value={newClientForm.name} onChange={(e) => setNewClientForm({ ...newClientForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Celular</Label>
                <Input className="rounded-xl mt-1" value={newClientForm.phone} onChange={(e) => setNewClientForm({ ...newClientForm, phone: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" className="rounded-xl mt-1" value={newClientForm.email} onChange={(e) => setNewClientForm({ ...newClientForm, email: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea className="rounded-xl mt-1 resize-none" rows={2} value={newClientForm.notes} onChange={(e) => setNewClientForm({ ...newClientForm, notes: e.target.value })} />
            </div>
            <Button type="submit" className="w-full h-11 rounded-xl" disabled={createClient.isPending}>
              {createClient.isPending ? <Loader2 className="animate-spin" /> : "Crear Cliente"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
