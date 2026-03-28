import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { Download } from "lucide-react";
import { Helmet } from "react-helmet-async";
import {
  MapPin, Phone, MessageCircle, Instagram, Facebook, Star, ShoppingBag,
  X, ChevronLeft, ChevronRight, Send, CheckCircle2, Search, Menu,
  Clock, Percent, Flame, Sparkles, QrCode, Tag,
} from "lucide-react";
import { StarRating, InteractiveStarRating } from "@/components/ui/star-rating";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StoreData {
  id: string; slug: string; businessName: string; businessType: string;
  ownerName: string; district: string; address?: string | null; phone: string;
  description?: string | null; logoUrl?: string | null; bannerUrl?: string | null;
  primaryColor?: string | null; whatsapp?: string | null;
  socialInstagram?: string | null; socialFacebook?: string | null;
  reviewCount: number; avgRating: number | null;
}

interface StoreConfig {
  showWhatsappButton: boolean; showYapeQr: boolean; yapeQrUrl: string | null;
  showComments: boolean; showOffers: boolean; catalogView: string;
  template: string; font: string; secondaryColor: string | null; businessHours: string | null;
}

interface StoreBanner {
  id: string; imageUrl: string; title?: string | null; subtitle?: string | null; linkUrl?: string | null;
}

interface Category { id: string; name: string; productCount: number; }

interface Product {
  id: string; name: string; description?: string | null;
  price: string; salePrice?: string | null; imageUrl?: string | null;
  stock: number; isFeatured: boolean; categoryId?: string | null; categoryName?: string | null;
  avgRating: number | null; reviewCount: number;
}

interface Review {
  id: string; customerName: string; rating: number;
  comment?: string | null; createdAt: string; productName?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(p: string | number) { return `S/ ${Number(p).toFixed(2)}`; }

function discount(price: string, salePrice: string) {
  const pct = Math.round((1 - Number(salePrice) / Number(price)) * 100);
  return pct > 0 ? pct : null;
}

function timeAgo(d: string) {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (days === 0) return "Hoy"; if (days === 1) return "Ayer";
  if (days < 30) return `Hace ${days} días`;
  const m = Math.floor(days / 30); if (m < 12) return `Hace ${m} ${m === 1 ? "mes" : "meses"}`;
  return `Hace ${Math.floor(m / 12)} año(s)`;
}

const WHATSAPP_SVG = (
  <svg viewBox="0 0 24 24" className="fill-current shrink-0">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

// ─── ReviewModal ──────────────────────────────────────────────────────────────

function ReviewModal({ open, onClose, storeSlug, products, preselectedProductId }: {
  open: boolean; onClose: () => void; storeSlug: string;
  products: Product[]; preselectedProductId?: string;
}) {
  const [productId, setProductId] = useState(preselectedProductId || "");
  const [name, setName] = useState(""); const [rating, setRating] = useState(0);
  const [comment, setComment] = useState(""); const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false); const [error, setError] = useState("");

  useEffect(() => {
    if (open) { setProductId(preselectedProductId || ""); setName(""); setRating(0); setComment(""); setSuccess(false); setError(""); }
  }, [open, preselectedProductId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !name.trim() || rating === 0) { setError("Completa todos los campos requeridos."); return; }
    setError(""); setSubmitting(true);
    try {
      const r = await fetch(`/api/public/stores/${storeSlug}/reviews`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, customerName: name.trim(), rating, comment: comment.trim() || undefined }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error((d as any).error || "Error"); }
      setSuccess(true);
    } catch (err: any) { setError(err.message || "Error inesperado"); }
    finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Dejar una reseña</DialogTitle>
          <DialogDescription>Comparte tu experiencia con un producto.</DialogDescription>
        </DialogHeader>
        {success ? (
          <div className="py-8 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="w-14 h-14 text-green-500" />
            <p className="font-semibold text-lg">¡Gracias por tu reseña!</p>
            <p className="text-sm text-gray-500">Será publicada una vez aprobada.</p>
            <Button onClick={onClose} className="mt-2 rounded-xl px-8">Cerrar</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label>Producto *</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecciona un producto" /></SelectTrigger>
                <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Calificación *</Label>
              <InteractiveStarRating value={rating} onChange={setRating} />
            </div>
            <div className="space-y-1.5">
              <Label>Tu nombre *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: María García" maxLength={100} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label>Comentario (opcional)</Label>
              <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Cuéntanos tu experiencia…" rows={3} maxLength={1000} className="rounded-xl" />
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancelar</Button>
              <Button type="submit" disabled={submitting} className="flex-1 rounded-xl">
                {submitting ? "Enviando…" : <><Send className="w-4 h-4 mr-1.5" /> Enviar</>}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── BannerCarousel ──────────────────────────────────────────────────────────

function BannerCarousel({ banners, store, primaryColor }: { banners: StoreBanner[]; store: StoreData; primaryColor: string }) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Slide 0 is always the default store hero; slides 1+ are user-created banners
  const total = 1 + banners.length;

  const next = useCallback(() => setCurrent((c) => (c + 1) % total), [total]);
  const prev = () => setCurrent((c) => (c - 1 + total) % total);

  useEffect(() => {
    if (total <= 1) return;
    timerRef.current = setInterval(next, 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [next, total]);

  const reset = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(next, 5000);
  };

  const activeBanner = current > 0 ? banners[current - 1] : null;

  return (
    <div className="relative w-full h-64 md:h-[420px] overflow-hidden bg-gray-900 group">

      {/* Slide 0 — Default store hero (always first) */}
      <div
        className={cn("absolute inset-0 transition-opacity duration-700", current === 0 ? "opacity-100" : "opacity-0")}
        style={{ background: `linear-gradient(145deg, ${primaryColor} 0%, ${primaryColor}bb 60%, ${primaryColor}88 100%)` }}
      >
        {/* Decorative background shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/5" />
          <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-white/5" />
          <div className="absolute top-1/3 right-1/3 w-40 h-40 rounded-full bg-white/5" />
          <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle, white 1.5px, transparent 1.5px)", backgroundSize: "28px 28px" }} />
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/20 to-transparent" />
        </div>

        {/* Content */}
        <div className="relative h-full flex flex-col items-center justify-center text-white px-6 py-8 gap-3">
          {/* Logo */}
          {store.logoUrl ? (
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden border-4 border-white/25 shadow-2xl ring-4 ring-white/10">
              <img src={store.logoUrl} alt={store.businessName} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl md:text-4xl font-extrabold border-4 border-white/25 shadow-2xl ring-4 ring-white/10">
              {store.businessName.charAt(0)}
            </div>
          )}

          {/* Welcome badge */}
          <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1">
            <Sparkles className="w-3 h-3" />
            <span className="text-xs font-semibold uppercase tracking-widest">Bienvenidos</span>
          </div>

          {/* Store name */}
          <h1 className="text-3xl md:text-5xl font-extrabold drop-shadow-lg text-center leading-tight">
            {store.businessName}
          </h1>

          {/* Description */}
          {store.description && (
            <p className="text-white/80 text-sm md:text-base max-w-md text-center leading-relaxed -mt-1">
              {store.description}
            </p>
          )}

          {/* Info badges */}
          <div className="flex items-center gap-2 flex-wrap justify-center mt-1">
            <span className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium">
              <MapPin className="w-3 h-3" /> {store.district}
            </span>
            {store.avgRating != null && store.reviewCount > 0 && (
              <span className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium">
                <Star className="w-3 h-3 fill-white" /> {Number(store.avgRating).toFixed(1)} · {store.reviewCount} reseñas
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Slides 1+ — User-created banners */}
      {banners.map((b, i) => (
        <div key={b.id} className={cn("absolute inset-0 transition-opacity duration-700", (i + 1) === current ? "opacity-100" : "opacity-0")}>
          <img src={b.imageUrl} alt={b.title || "Banner"} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />
        </div>
      ))}

      {/* Text overlay for active user banner */}
      {activeBanner && (activeBanner.title || activeBanner.subtitle) && (
        <div className="absolute bottom-0 left-0 p-6 md:p-12 text-white max-w-xl" style={{ zIndex: 10 }}>
          {activeBanner.title && <h2 className="text-2xl md:text-4xl font-extrabold drop-shadow-lg leading-tight">{activeBanner.title}</h2>}
          {activeBanner.subtitle && <p className="mt-2 text-white/85 text-sm md:text-lg drop-shadow">{activeBanner.subtitle}</p>}
          {activeBanner.linkUrl && (
            <a href={activeBanner.linkUrl} className="mt-4 inline-flex items-center px-5 py-2.5 rounded-xl bg-white text-gray-900 font-semibold text-sm hover:bg-gray-100 transition-colors">
              Ver más <ChevronRight className="w-4 h-4 ml-1" />
            </a>
          )}
        </div>
      )}

      {/* Nav arrows + dots — always shown since total >= 1 */}
      {total > 1 && (
        <>
          <button onClick={() => { prev(); reset(); }} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-all opacity-0 group-hover:opacity-100">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={() => { next(); reset(); }} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-all opacity-0 group-hover:opacity-100">
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {Array.from({ length: total }).map((_, i) => (
              <button key={i} onClick={() => { setCurrent(i); reset(); }}
                className={cn("rounded-full transition-all", i === current ? "w-6 h-2 bg-white" : "w-2 h-2 bg-white/50 hover:bg-white/80")} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── ProductDetailModal ───────────────────────────────────────────────────────

function ProductDetailModal({ product, primaryColor, onClose, onReview, whatsapp, storeName }: {
  product: Product | null; primaryColor: string;
  onClose: () => void; onReview: (id: string) => void;
  whatsapp?: string | null; storeName: string;
}) {
  const disc = product?.salePrice ? discount(product.price, product.salePrice) : null;
  const outOfStock = product?.stock === 0;
  const waUrl = (whatsapp && product)
    ? `https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola! Me interesa: ${product.name} (${fmt(product.salePrice || product.price)}) de ${storeName}`)}`
    : null;

  return (
    <Dialog open={!!product} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg rounded-2xl p-0 overflow-hidden gap-0">
        {product && (
          <>
            <div className="relative bg-gray-50">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="w-full max-h-72 object-cover" />
              ) : (
                <div className="w-full h-48 flex items-center justify-center">
                  <ShoppingBag className="w-20 h-20 text-gray-200" />
                </div>
              )}
              <div className="absolute top-3 left-3 flex gap-1.5">
                {disc && disc > 0 && (
                  <span className="inline-flex items-center gap-1 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow">
                    <Percent className="w-3 h-3" />-{disc}%
                  </span>
                )}
                {product.isFeatured && (
                  <span className="inline-flex items-center gap-1 bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full shadow">
                    <Flame className="w-3 h-3" />Destacado
                  </span>
                )}
              </div>
              {outOfStock && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="bg-white text-gray-800 text-sm font-bold px-4 py-2 rounded-full shadow">Agotado</span>
                </div>
              )}
            </div>

            <div className="p-5">
              {product.categoryName && (
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{product.categoryName}</span>
              )}
              <DialogTitle className="text-xl font-bold text-gray-900 mt-1 leading-snug">{product.name}</DialogTitle>

              {product.description && (
                <p className="text-sm text-gray-600 mt-2 leading-relaxed">{product.description}</p>
              )}

              {product.avgRating !== null && product.reviewCount > 0 && (
                <div className="flex items-center gap-2 mt-3">
                  <StarRating rating={product.avgRating} size={14} />
                  <span className="text-sm text-gray-500">{product.avgRating.toFixed(1)} · {product.reviewCount} reseña{product.reviewCount !== 1 ? "s" : ""}</span>
                </div>
              )}

              <div className="mt-4 flex items-center gap-3">
                {product.salePrice ? (
                  <>
                    <span className="text-2xl font-extrabold" style={{ color: primaryColor }}>{fmt(product.salePrice)}</span>
                    <span className="text-base text-gray-400 line-through">{fmt(product.price)}</span>
                    {disc && disc > 0 && <span className="text-sm font-bold text-red-500">-{disc}% off</span>}
                  </>
                ) : (
                  <span className="text-2xl font-extrabold" style={{ color: primaryColor }}>{fmt(product.price)}</span>
                )}
              </div>

              {product.stock !== null && product.stock > 0 && product.stock <= 10 && (
                <p className="text-xs text-amber-600 mt-1 font-medium">¡Solo quedan {product.stock} unidades!</p>
              )}

              <div className="flex gap-2 mt-5">
                {waUrl && !outOfStock && (
                  <a href={waUrl} target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white bg-[#25D366] hover:bg-[#20bd5a] transition-colors">
                    <span className="w-4 h-4">{WHATSAPP_SVG}</span> Pedir por WhatsApp
                  </a>
                )}
                <button onClick={() => { onClose(); setTimeout(() => onReview(product.id), 100); }}
                  className="flex-1 rounded-xl py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                  Dejar Reseña
                </button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── ProductCard ─────────────────────────────────────────────────────────────

function ProductCard({ product, primaryColor, onReview, onView, whatsapp, storeName, size = "normal" }: {
  product: Product; primaryColor: string; onReview: (id: string) => void;
  onView: (p: Product) => void;
  whatsapp?: string | null; storeName: string; size?: "normal" | "large";
}) {
  const waUrl = whatsapp
    ? `https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola! Me interesa: ${product.name} (${fmt(product.salePrice || product.price)}) de ${storeName}`)}`
    : null;
  const disc = product.salePrice ? discount(product.price, product.salePrice) : null;
  const outOfStock = product.stock === 0;

  return (
    <div className={cn(
      "group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer",
      size === "large" && "md:flex-row"
    )} onClick={() => onView(product)}>
      <div className={cn(
        "relative bg-gray-50 overflow-hidden",
        size === "large" ? "aspect-square md:w-64 md:aspect-auto md:shrink-0" : "aspect-square"
      )}>
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="w-14 h-14 text-gray-200" />
          </div>
        )}

        <div className="absolute top-2 left-2 flex flex-col gap-1.5">
          {disc && disc > 0 && (
            <span className="inline-flex items-center gap-1 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
              <Percent className="w-3 h-3" />-{disc}%
            </span>
          )}
          {product.isFeatured && (
            <span className="inline-flex items-center gap-1 bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
              <Flame className="w-3 h-3" />Destacado
            </span>
          )}
        </div>

        {outOfStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-white text-gray-800 text-xs font-bold px-3 py-1.5 rounded-full shadow">Agotado</span>
          </div>
        )}
      </div>

      <div className="flex-1 p-4 flex flex-col gap-2">
        {product.categoryName && (
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{product.categoryName}</span>
        )}
        <h3 className={cn("font-semibold text-gray-900 leading-snug line-clamp-2", size === "large" ? "text-base md:text-lg" : "text-sm")}>
          {product.name}
        </h3>

        {size === "large" && product.description && (
          <p className="text-sm text-gray-500 line-clamp-2">{product.description}</p>
        )}

        {product.avgRating !== null && product.reviewCount > 0 && (
          <div className="flex items-center gap-1.5">
            <StarRating rating={product.avgRating} size={12} />
            <span className="text-xs text-gray-500">{product.avgRating.toFixed(1)} ({product.reviewCount})</span>
          </div>
        )}

        <div className="mt-auto pt-2 flex items-end justify-between gap-2">
          <div>
            {product.salePrice ? (
              <>
                <span className="text-lg font-extrabold" style={{ color: primaryColor }}>{fmt(product.salePrice)}</span>
                <span className="text-xs text-gray-400 line-through ml-1.5">{fmt(product.price)}</span>
              </>
            ) : (
              <span className="text-lg font-extrabold" style={{ color: primaryColor }}>{fmt(product.price)}</span>
            )}
          </div>
        </div>

        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
          {waUrl && !outOfStock && (
            <a href={waUrl} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold text-white bg-[#25D366] hover:bg-[#20bd5a] transition-colors">
              <span className="w-3.5 h-3.5">{WHATSAPP_SVG}</span> Pedir
            </a>
          )}
          <button onClick={() => onReview(product.id)}
            className="flex-1 rounded-xl py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
            Reseñar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CategoryBar ─────────────────────────────────────────────────────────────

function CategoryBar({ categories, primaryColor, activeCategoryId, onCategoryChange, totalProducts }: {
  categories: Category[]; primaryColor: string;
  activeCategoryId: string | null; onCategoryChange: (id: string | null) => void;
  totalProducts: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", checkScroll); ro.disconnect(); };
  }, [categories, checkScroll]);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeCategoryId]);

  const scroll = (dir: "l" | "r") =>
    scrollRef.current?.scrollBy({ left: dir === "l" ? -220 : 220, behavior: "smooth" });

  if (!categories.length) return null;

  return (
    <div className="bg-white border-b border-gray-100 shadow-sm sticky top-[60px] z-40">
      <div className="max-w-6xl mx-auto flex items-center">
        {/* Left arrow */}
        <button
          onClick={() => scroll("l")}
          className={cn(
            "shrink-0 w-9 h-9 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-all",
            !canLeft && "opacity-0 pointer-events-none"
          )}>
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Scroll container */}
        <div className="relative flex-1 overflow-hidden">
          {canLeft && (
            <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
          )}
          {canRight && (
            <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
          )}

          <div ref={scrollRef} className="flex gap-1.5 overflow-x-auto scrollbar-none py-2.5 px-1">
            <button
              ref={!activeCategoryId ? (activeRef as any) : undefined}
              onClick={() => onCategoryChange(null)}
              className={cn(
                "shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-all whitespace-nowrap",
                !activeCategoryId
                  ? "text-white border-transparent shadow-sm"
                  : "border-gray-200 text-gray-600 bg-white hover:bg-gray-50"
              )}
              style={!activeCategoryId ? { backgroundColor: primaryColor } : {}}>
              Todos
              <span className="ml-1 opacity-70 text-xs">({totalProducts})</span>
            </button>

            {categories.map((c) => {
              const isActive = activeCategoryId === c.id;
              return (
                <button
                  key={c.id}
                  ref={isActive ? (activeRef as any) : undefined}
                  onClick={() => onCategoryChange(c.id)}
                  className={cn(
                    "shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-all whitespace-nowrap",
                    isActive
                      ? "text-white border-transparent shadow-sm"
                      : "border-gray-200 text-gray-600 bg-white hover:bg-gray-50"
                  )}
                  style={isActive ? { backgroundColor: primaryColor } : {}}>
                  {c.name}
                  {c.productCount > 0 && (
                    <span className="ml-1 opacity-70 text-xs">({c.productCount})</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right arrow */}
        <button
          onClick={() => scroll("r")}
          className={cn(
            "shrink-0 w-9 h-9 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-all",
            !canRight && "opacity-0 pointer-events-none"
          )}>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── HorizontalSection ───────────────────────────────────────────────────────

function HorizontalSection({ title, icon, products, primaryColor, onReview, onView, whatsapp, storeName, accentColor }: {
  title: string; icon: React.ReactNode; products: Product[];
  primaryColor: string; onReview: (id: string) => void; onView: (p: Product) => void;
  whatsapp?: string | null; storeName: string; accentColor?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: "l" | "r") => {
    scrollRef.current?.scrollBy({ left: dir === "l" ? -300 : 300, behavior: "smooth" });
  };

  if (!products.length) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-1 h-6 rounded-full" style={{ backgroundColor: accentColor || primaryColor }} />
          <span className="flex items-center gap-1.5 text-lg font-bold text-gray-900">
            {icon} {title}
          </span>
        </div>
        <div className="flex gap-1">
          <button onClick={() => scroll("l")} className="w-8 h-8 rounded-full border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center shadow-sm transition-colors">
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <button onClick={() => scroll("r")} className="w-8 h-8 rounded-full border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center shadow-sm transition-colors">
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>
      <div ref={scrollRef} className="flex gap-4 overflow-x-auto scrollbar-none pb-2 snap-x snap-mandatory">
        {products.map((p) => (
          <div key={p.id} className="shrink-0 w-44 md:w-52 snap-start">
            <ProductCard product={p} primaryColor={primaryColor} onReview={onReview} onView={onView} whatsapp={whatsapp} storeName={storeName} />
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── StoreNavbar ──────────────────────────────────────────────────────────────

function StoreNavbar({ store, categories, primaryColor, activeCategoryId, onCategoryChange, onSearch, onReview, config }: {
  store: StoreData; categories: Category[]; primaryColor: string;
  activeCategoryId: string | null; onCategoryChange: (id: string | null) => void;
  onSearch: (q: string) => void; onReview: () => void; config: StoreConfig;
}) {
  const [searchVal, setSearchVal] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (v: string) => {
    setSearchVal(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearch(v.trim()), 350);
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
        {/* Logo + Name */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl overflow-hidden border-2 flex items-center justify-center shrink-0"
            style={{ backgroundColor: primaryColor, borderColor: primaryColor + "33" }}>
            {store.logoUrl
              ? <img src={store.logoUrl} alt={store.businessName} className="w-full h-full object-cover" />
              : <span className="text-white text-sm font-bold">{store.businessName.charAt(0)}</span>}
          </div>
          <span className="font-bold text-gray-900 text-sm hidden sm:block max-w-[140px] truncate">{store.businessName}</span>
        </div>

        {/* Search bar */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text" value={searchVal} onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar productos…"
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-100 border border-transparent focus:border-gray-300 focus:bg-white text-sm outline-none transition-all"
          />
          {searchVal && (
            <button onClick={() => { setSearchVal(""); onSearch(""); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          {store.whatsapp && config.showWhatsappButton && (
            <a href={`https://wa.me/${store.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-sm font-medium transition-colors">
              <span className="w-4 h-4">{WHATSAPP_SVG}</span> WhatsApp
            </a>
          )}
          <button onClick={onReview}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-sm font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: primaryColor }}>
            <Star className="w-4 h-4" /> Reseña
          </button>
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
          <Menu className="w-4 h-4 text-gray-700" />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-2 animate-in slide-in-from-top-2 duration-150">
          {store.whatsapp && config.showWhatsappButton && (
            <a href={`https://wa.me/${store.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] text-white text-sm font-semibold w-full">
              <span className="w-4 h-4">{WHATSAPP_SVG}</span> Contactar por WhatsApp
            </a>
          )}
          <button onClick={() => { onReview(); setMenuOpen(false); }}
            className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-white text-sm font-semibold"
            style={{ backgroundColor: primaryColor }}>
            <Star className="w-4 h-4" /> Dejar reseña
          </button>
        </div>
      )}
    </header>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TiendaPage() {
  const { slug } = useParams<{ slug: string }>();
  const [, navigate] = useLocation();

  const [store, setStore] = useState<StoreData | null>(null);
  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [banners, setBanners] = useState<StoreBanner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [offerProducts, setOfferProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewProductId, setReviewProductId] = useState<string | undefined>(undefined);
  const [yapeOpen, setYapeOpen] = useState(false);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

  // ── PWA install banner ────────────────────────────────────────────────────
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("camila-pwa-dismissed");
    if (dismissed) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      // Only show on mobile-sized screens
      if (window.innerWidth < 768) setShowInstallBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    (installPrompt as any).prompt();
    const { outcome } = await (installPrompt as any).userChoice;
    if (outcome === "accepted") setShowInstallBanner(false);
    setInstallPrompt(null);
  };

  const handleDismissInstall = () => {
    setShowInstallBanner(false);
    localStorage.setItem("camila-pwa-dismissed", "1");
  };
  // ─────────────────────────────────────────────────────────────────────────

  const primaryColor = store?.primaryColor || "#1a5c2e";

  const fetchProducts = useCallback(async (catId: string | null, pg: number, q: string, storeSlug: string) => {
    const p = new URLSearchParams({ page: String(pg), limit: "24" });
    if (catId) p.set("categoryId", catId);
    if (q) p.set("search", q);
    const r = await fetch(`/api/public/stores/${storeSlug}/products?${p}`);
    if (!r.ok) return;
    const d = await r.json();
    setProducts(d.data); setTotalPages(d.totalPages); setTotalProducts(d.total);
  }, []);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);

    Promise.all([
      fetch(`/api/public/stores/${slug}`),
      fetch(`/api/public/stores/${slug}/categories`),
      fetch(`/api/public/stores/${slug}/reviews?limit=6`),
      fetch(`/api/public/stores/${slug}/banners`),
      fetch(`/api/public/stores/${slug}/config`),
    ]).then(async ([sR, cR, rR, bR, cfR]) => {
      if (sR.status === 404) { setNotFound(true); setLoading(false); return; }
      const [s, c, r, b, cf] = await Promise.all([sR.json(), cR.json(), rR.json(), bR.json(), cfR.json()]);
      setStore(s); setCategories((c as Category[]).filter(cat => cat.productCount > 0)); setReviews(r.data || []); setBanners(b); setConfig(cf);

      await Promise.all([
        fetchProducts(null, 1, "", slug),
        fetch(`/api/public/stores/${slug}/products?isFeatured=true&limit=12`)
          .then(r => r.json()).then(d => setFeaturedProducts(d.data || [])),
        fetch(`/api/public/stores/${slug}/products?hasOffer=true&limit=12`)
          .then(r => r.json()).then(d => setOfferProducts(d.data || [])),
      ]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [slug, fetchProducts]);

  useEffect(() => {
    if (!slug || loading) return;
    fetchProducts(activeCategoryId, page, search, slug);
  }, [activeCategoryId, page, search, slug, loading, fetchProducts]);

  const handleCategoryChange = (catId: string | null) => { setActiveCategoryId(catId); setPage(1); };
  const handleSearch = (q: string) => { setSearch(q); setPage(1); };
  const openReview = (productId?: string) => { setReviewProductId(productId); setReviewModal(true); };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-green-700 rounded-full animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Cargando tienda…</p>
        </div>
      </div>
    );
  }

  if (notFound || !store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🏪</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Tienda no encontrada</h1>
          <p className="text-gray-500 mb-6">La tienda <strong>/{slug}</strong> no existe o fue desactivada.</p>
          <Button onClick={() => navigate("/")} variant="outline" className="rounded-xl">
            <ChevronLeft className="w-4 h-4 mr-1" /> Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  const cfg = config ?? { showWhatsappButton: true, showYapeQr: false, yapeQrUrl: null, showComments: true, showOffers: true, catalogView: "grid" } as StoreConfig;
  const isSearching = !!search || !!activeCategoryId;

  return (
    <>
      <Helmet>
        <title>{store.businessName} | Camila</title>
        <meta name="description" content={store.description || `Tienda de ${store.businessName} en ${store.district}`} />
        {store.logoUrl && <meta property="og:image" content={store.logoUrl} />}
      </Helmet>

      {/* PWA install banner — mobile only, dismissed via localStorage */}
      {showInstallBanner && (
        <div className="fixed bottom-0 inset-x-0 z-50 flex items-center gap-3 bg-white border-t border-gray-200 shadow-lg px-4 py-3 md:hidden">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-green-50 shrink-0">
            <Download className="w-5 h-5 text-green-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 leading-tight">Instalar app</p>
            <p className="text-xs text-gray-500 truncate">Accede rápido sin abrir el navegador</p>
          </div>
          <button
            onClick={handleInstall}
            className="shrink-0 rounded-lg bg-green-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-800 active:scale-95 transition-transform"
          >
            Instalar
          </button>
          <button
            onClick={handleDismissInstall}
            aria-label="Cerrar"
            className="shrink-0 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="min-h-screen bg-gray-50 font-sans">
        <StoreNavbar
          store={store} categories={categories} primaryColor={primaryColor}
          activeCategoryId={activeCategoryId} onCategoryChange={handleCategoryChange}
          onSearch={handleSearch} onReview={() => openReview()} config={cfg}
        />

        {/* Banner carousel */}
        <BannerCarousel banners={banners} store={store} primaryColor={primaryColor} />

        {/* Store info strip */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-gray-600">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              {store.district}{store.address ? `, ${store.address}` : ""}
            </span>
            {store.avgRating !== null && store.reviewCount > 0 && (
              <span className="flex items-center gap-1.5">
                <StarRating rating={store.avgRating} size={13} />
                <span className="font-semibold text-gray-800">{store.avgRating}</span>
                <span className="text-gray-400">({store.reviewCount} reseñas)</span>
              </span>
            )}
            {store.phone && (
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-gray-400" /> {store.phone}
              </span>
            )}
            {cfg.businessHours && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs whitespace-pre-line line-clamp-1">{cfg.businessHours.split("\n")[0]}</span>
              </span>
            )}
            <div className="ml-auto flex items-center gap-2">
              {store.socialInstagram && (
                <a href={`https://instagram.com/${store.socialInstagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer"
                  className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 text-white hover:opacity-90 transition-opacity">
                  <Instagram className="w-3.5 h-3.5" />
                </a>
              )}
              {store.socialFacebook && (
                <a href={`https://facebook.com/${store.socialFacebook}`} target="_blank" rel="noopener noreferrer"
                  className="p-1.5 rounded-lg bg-[#1877F2] text-white hover:opacity-90 transition-opacity">
                  <Facebook className="w-3.5 h-3.5" />
                </a>
              )}
              {cfg.showYapeQr && cfg.yapeQrUrl && (
                <button onClick={() => setYapeOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white bg-[#742283] hover:opacity-90 transition-opacity">
                  <QrCode className="w-3.5 h-3.5" /> Yape
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable category bar */}
        <CategoryBar
          categories={categories}
          primaryColor={primaryColor}
          activeCategoryId={activeCategoryId}
          onCategoryChange={handleCategoryChange}
          totalProducts={totalProducts}
        />

        <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">

          {/* Featured section */}
          {!isSearching && featuredProducts.length > 0 && (
            <HorizontalSection
              title="Destacados" icon={<Flame className="w-5 h-5 text-amber-500" />}
              products={featuredProducts} primaryColor={primaryColor}
              onReview={openReview} onView={setDetailProduct} whatsapp={store.whatsapp} storeName={store.businessName}
              accentColor="#f59e0b"
            />
          )}

          {/* Offers section */}
          {!isSearching && cfg.showOffers && offerProducts.length > 0 && (
            <HorizontalSection
              title="Ofertas del día" icon={<Tag className="w-5 h-5 text-red-500" />}
              products={offerProducts} primaryColor={primaryColor}
              onReview={openReview} onView={setDetailProduct} whatsapp={store.whatsapp} storeName={store.businessName}
              accentColor="#ef4444"
            />
          )}

          {/* Catalog section header */}
          <div>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-1 h-6 rounded-full" style={{ backgroundColor: primaryColor }} />
              <span className="text-lg font-bold text-gray-900 flex items-center gap-2">
                {search ? (
                  <><Search className="w-5 h-5" /> Resultados para "{search}"</>
                ) : activeCategoryId ? (
                  <>{categories.find((c) => c.id === activeCategoryId)?.name || "Productos"}</>
                ) : (
                  <><ShoppingBag className="w-5 h-5" /> Catálogo completo</>
                )}
                {totalProducts > 0 && <span className="text-sm font-normal text-gray-400">({totalProducts} productos)</span>}
              </span>
            </div>

            {products.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                <ShoppingBag className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="font-semibold text-gray-600">No se encontraron productos</p>
                {search && <p className="text-sm text-gray-400 mt-1">Intenta con otro término de búsqueda</p>}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} primaryColor={primaryColor}
                    onReview={openReview} onView={setDetailProduct} whatsapp={store.whatsapp} storeName={store.businessName} />
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-8">
                <button onClick={() => setPage((p) => p - 1)} disabled={page <= 1}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors">
                  <ChevronLeft className="w-4 h-4" /> Anterior
                </button>
                <span className="text-sm text-gray-500 font-medium">Página {page} de {totalPages}</span>
                <button onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors">
                  Siguiente <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Reviews section */}
          {cfg.showComments && reviews.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-1 h-6 rounded-full" style={{ backgroundColor: primaryColor }} />
                  <span className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-400 fill-amber-400" /> Reseñas
                  </span>
                </div>
                <button onClick={() => openReview()}
                  className="text-sm font-medium hover:opacity-80 transition-opacity" style={{ color: primaryColor }}>
                  + Escribir reseña
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reviews.map((r) => (
                  <div key={r.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{r.customerName}</p>
                        {r.productName && <p className="text-xs text-gray-400 mt-0.5">{r.productName}</p>}
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">{timeAgo(r.createdAt)}</span>
                    </div>
                    <StarRating rating={r.rating} size={14} />
                    {r.comment && <p className="mt-2 text-sm text-gray-600 line-clamp-3">{r.comment}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Store footer */}
          <footer className="border-t border-gray-200 mt-4 pt-8 pb-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              {store.logoUrl && <img src={store.logoUrl} alt={store.businessName} className="w-7 h-7 rounded-xl object-cover shadow-sm" />}
              <span className="font-bold text-gray-700 text-sm">{store.businessName}</span>
            </div>
            {(store.district || store.address) && (
              <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
                <MapPin className="w-3 h-3" />
                {store.district}{store.address ? `, ${store.address}` : ""}
              </p>
            )}
            <p className="text-xs text-gray-300 mt-4">Tienda con <span className="font-medium text-gray-400">Camila</span></p>
          </footer>
        </div>

        {/* WhatsApp float */}
        {store.whatsapp && cfg.showWhatsappButton && (
          <a
            href={`https://wa.me/${store.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola, me contacto desde tu tienda ${store.businessName}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-6 right-4 z-50 flex items-center gap-2 bg-[#25D366] text-white rounded-full pl-3 pr-4 py-3 shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-150"
            aria-label="Escribir por WhatsApp"
          >
            <span className="w-5 h-5 shrink-0">{WHATSAPP_SVG}</span>
            <span className="text-sm font-semibold whitespace-nowrap">Escribir por WhatsApp</span>
          </a>
        )}

        {/* Yape QR dialog */}
        {cfg.showYapeQr && cfg.yapeQrUrl && (
          <Dialog open={yapeOpen} onOpenChange={setYapeOpen}>
            <DialogContent className="max-w-sm rounded-2xl text-center">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-[#742283]">Pagar con Yape</DialogTitle>
                <DialogDescription>Escanea el código QR para realizar tu pago</DialogDescription>
              </DialogHeader>
              <img src={cfg.yapeQrUrl} alt="QR Yape" className="w-full rounded-xl border border-gray-100 mt-2" />
              <p className="text-xs text-gray-400 mt-2">{store.businessName}</p>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <ProductDetailModal
        product={detailProduct}
        primaryColor={primaryColor}
        onClose={() => setDetailProduct(null)}
        onReview={(id) => { setDetailProduct(null); openReview(id); }}
        whatsapp={store.whatsapp}
        storeName={store.businessName}
      />

      <ReviewModal open={reviewModal} onClose={() => setReviewModal(false)}
        storeSlug={slug!} products={products} preselectedProductId={reviewProductId} />
    </>
  );
}
