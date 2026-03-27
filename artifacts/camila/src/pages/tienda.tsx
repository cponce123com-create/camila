import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { Helmet } from "react-helmet-async";
import { MapPin, Phone, MessageCircle, Instagram, Facebook, Star, ShoppingBag, X, ChevronLeft, ChevronRight, Send, CheckCircle2 } from "lucide-react";
import { StarRating, InteractiveStarRating } from "@/components/ui/star-rating";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface StoreData {
  id: string;
  slug: string;
  businessName: string;
  businessType: string;
  ownerName: string;
  district: string;
  address?: string | null;
  phone: string;
  description?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  primaryColor?: string | null;
  whatsapp?: string | null;
  socialInstagram?: string | null;
  socialFacebook?: string | null;
  reviewCount: number;
  avgRating: number | null;
}

interface Category {
  id: string;
  name: string;
  productCount: number;
}

interface Product {
  id: string;
  name: string;
  description?: string | null;
  price: string;
  imageUrl?: string | null;
  stock: number;
  categoryId?: string | null;
  categoryName?: string | null;
  avgRating: number | null;
  reviewCount: number;
}

interface Review {
  id: string;
  customerName: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  productName?: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPrice(price: string | number) {
  return `S/ ${Number(price).toFixed(2)}`;
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 30) return `Hace ${days} días`;
  const months = Math.floor(days / 30);
  if (months < 12) return `Hace ${months} ${months === 1 ? "mes" : "meses"}`;
  return `Hace ${Math.floor(months / 12)} año(s)`;
}

// ─── Review Modal ─────────────────────────────────────────────────────────────

interface ReviewModalProps {
  open: boolean;
  onClose: () => void;
  storeSlug: string;
  products: Product[];
  preselectedProductId?: string;
}

function ReviewModal({ open, onClose, storeSlug, products, preselectedProductId }: ReviewModalProps) {
  const [productId, setProductId] = useState(preselectedProductId || "");
  const [name, setName] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setProductId(preselectedProductId || "");
      setName("");
      setRating(0);
      setComment("");
      setSuccess(false);
      setError("");
    }
  }, [open, preselectedProductId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !name.trim() || rating === 0) {
      setError("Por favor completa todos los campos requeridos.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const resp = await fetch(`/api/public/stores/${storeSlug}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, customerName: name.trim(), rating, comment: comment.trim() || undefined }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || "Error al enviar la reseña");
      }
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Dejar una reseña</DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            Comparte tu experiencia con este producto. Tu reseña será publicada tras moderación.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-6 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="w-14 h-14 text-green-500" />
            <p className="font-semibold text-gray-900">¡Gracias por tu reseña!</p>
            <p className="text-sm text-gray-500">Será publicada una vez aprobada por la tienda.</p>
            <Button onClick={onClose} className="mt-2">Cerrar</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="rm-product">Producto *</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger id="rm-product">
                  <SelectValue placeholder="Selecciona un producto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Calificación *</Label>
              <InteractiveStarRating value={rating} onChange={setRating} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rm-name">Tu nombre *</Label>
              <Input
                id="rm-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: María García"
                maxLength={100}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rm-comment">Comentario (opcional)</Label>
              <Textarea
                id="rm-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Cuéntanos tu experiencia..."
                rows={3}
                maxLength={1000}
              />
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>}

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="flex-1">
                {submitting ? "Enviando…" : (
                  <><Send className="w-4 h-4 mr-1.5" /> Enviar reseña</>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────

interface ProductCardProps {
  product: Product;
  primaryColor: string;
  onReview: (productId: string) => void;
  whatsapp?: string | null;
  storeName: string;
}

function ProductCard({ product, primaryColor, onReview, whatsapp, storeName }: ProductCardProps) {
  const whatsappUrl = whatsapp
    ? `https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola! Estoy interesado/a en: ${product.name} (S/ ${Number(product.price).toFixed(2)}) de ${storeName}`)}`
    : null;

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100 flex flex-col">
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="w-12 h-12 text-gray-200" />
          </div>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Badge variant="secondary" className="text-xs font-medium">Agotado</Badge>
          </div>
        )}
      </div>

      <div className="p-3.5 flex flex-col gap-2 flex-1">
        {product.categoryName && (
          <span className="text-xs text-gray-400 uppercase tracking-wide">{product.categoryName}</span>
        )}
        <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">{product.name}</h3>

        {product.avgRating !== null && product.reviewCount > 0 && (
          <div className="flex items-center gap-1.5">
            <StarRating rating={product.avgRating} size={13} />
            <span className="text-xs text-gray-500">
              {product.avgRating.toFixed(1)} ({product.reviewCount})
            </span>
          </div>
        )}

        <div className="flex items-center justify-between mt-auto pt-1">
          <span
            className="font-bold text-base"
            style={{ color: primaryColor }}
          >
            {formatPrice(product.price)}
          </span>
        </div>

        <div className="flex gap-2 mt-1">
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium text-white"
              style={{ backgroundColor: "#25D366" }}
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </a>
          )}
          <button
            onClick={() => onReview(product.id)}
            className="flex-1 rounded-lg py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            Reseñar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TiendaPage() {
  const { slug } = useParams<{ slug: string }>();
  const [, navigate] = useLocation();

  const [store, setStore] = useState<StoreData | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewProductId, setReviewProductId] = useState<string | undefined>(undefined);

  const primaryColor = store?.primaryColor || "#1a5c2e";

  const fetchProducts = useCallback(
    async (catId: string | null, pg: number, storeSlug: string) => {
      const params = new URLSearchParams({ page: String(pg), limit: "24" });
      if (catId) params.set("categoryId", catId);
      const resp = await fetch(`/api/public/stores/${storeSlug}/products?${params}`);
      if (!resp.ok) return;
      const data = await resp.json();
      setProducts(data.data);
      setTotalPages(data.totalPages);
    },
    []
  );

  useEffect(() => {
    if (!slug) return;
    setLoading(true);

    Promise.all([
      fetch(`/api/public/stores/${slug}`),
      fetch(`/api/public/stores/${slug}/categories`),
      fetch(`/api/public/stores/${slug}/reviews?limit=6`),
    ])
      .then(async ([sResp, cResp, rResp]) => {
        if (sResp.status === 404) { setNotFound(true); setLoading(false); return; }
        const [s, c, r] = await Promise.all([sResp.json(), cResp.json(), rResp.json()]);
        setStore(s);
        setCategories(c);
        setReviews(r.data || []);
        await fetchProducts(null, 1, slug);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug, fetchProducts]);

  useEffect(() => {
    if (!slug || loading) return;
    fetchProducts(activeCategoryId, page, slug);
  }, [activeCategoryId, page, slug, loading, fetchProducts]);

  const handleCategoryChange = (catId: string | null) => {
    setActiveCategoryId(catId);
    setPage(1);
  };

  const openReviewModal = (productId?: string) => {
    setReviewProductId(productId);
    setReviewModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9f6f1]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-green-700 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Cargando tienda…</p>
        </div>
      </div>
    );
  }

  if (notFound || !store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9f6f1] px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🏪</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Tienda no encontrada</h1>
          <p className="text-gray-500 mb-6">
            La tienda <strong className="text-gray-700">/{slug}</strong> no existe o fue desactivada.
          </p>
          <Button onClick={() => navigate("/")} variant="outline">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{store.businessName} | Camila</title>
        <meta name="description" content={store.description || `Tienda de ${store.businessName} en ${store.district}`} />
        <meta property="og:title" content={store.businessName} />
        {store.logoUrl && <meta property="og:image" content={store.logoUrl} />}
      </Helmet>

      <div className="min-h-screen bg-[#f9f6f1]">
        {/* ── Banner + Header ─────────────────────────────────── */}
        <div className="relative">
          {store.bannerUrl ? (
            <div className="h-52 md:h-72 overflow-hidden">
              <img src={store.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
            </div>
          ) : (
            <div
              className="h-40 md:h-56"
              style={{
                background: `linear-gradient(135deg, rgba(${hexToRgb(primaryColor)},0.9) 0%, rgba(${hexToRgb(primaryColor)},0.6) 100%)`,
              }}
            />
          )}

          <div className="absolute bottom-0 left-0 right-0 px-4 md:px-8 pb-0 transform translate-y-1/2 flex items-end gap-4">
            <div
              className="w-20 h-20 md:w-28 md:h-28 rounded-2xl border-4 border-white shadow-lg overflow-hidden flex-shrink-0 flex items-center justify-center"
              style={{ backgroundColor: primaryColor }}
            >
              {store.logoUrl ? (
                <img src={store.logoUrl} alt={store.businessName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-2xl md:text-4xl font-bold">
                  {store.businessName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Store Info ───────────────────────────────────────── */}
        <div className="pt-14 md:pt-18 px-4 md:px-8 pb-4 max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 truncate">{store.businessName}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  {store.district}{store.address ? `, ${store.address}` : ""}
                </span>
                {store.avgRating !== null && (
                  <span className="flex items-center gap-1">
                    <StarRating rating={store.avgRating} size={14} />
                    <span className="font-medium text-gray-700">{store.avgRating}</span>
                    <span className="text-gray-400">({store.reviewCount} reseñas)</span>
                  </span>
                )}
              </div>
              {store.description && (
                <p className="mt-2 text-sm text-gray-600 max-w-lg">{store.description}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2 shrink-0">
              {store.whatsapp && (
                <a
                  href={`https://wa.me/${store.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: "#25D366" }}
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp
                </a>
              )}
              {store.socialInstagram && (
                <a
                  href={`https://instagram.com/${store.socialInstagram.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium text-white bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 hover:opacity-90 transition-opacity"
                >
                  <Instagram className="w-4 h-4" />
                  Instagram
                </a>
              )}
              {store.socialFacebook && (
                <a
                  href={`https://facebook.com/${store.socialFacebook}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium text-white bg-[#1877F2] hover:opacity-90 transition-opacity"
                >
                  <Facebook className="w-4 h-4" />
                  Facebook
                </a>
              )}
              <button
                onClick={() => openReviewModal()}
                className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: primaryColor }}
              >
                <Star className="w-4 h-4" />
                Dejar reseña
              </button>
            </div>
          </div>
        </div>

        {/* ── Main content ────────────────────────────────────── */}
        <div className="max-w-5xl mx-auto px-4 md:px-8 pb-16 mt-6 space-y-8">
          {/* Category tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => handleCategoryChange(null)}
              className={cn(
                "flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                activeCategoryId === null
                  ? "text-white shadow"
                  : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
              )}
              style={activeCategoryId === null ? { backgroundColor: primaryColor } : {}}
            >
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={cn(
                  "flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                  activeCategoryId === cat.id
                    ? "text-white shadow"
                    : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                )}
                style={activeCategoryId === cat.id ? { backgroundColor: primaryColor } : {}}
              >
                {cat.name}
                <span className="ml-1.5 text-xs opacity-70">({cat.productCount})</span>
              </button>
            ))}
          </div>

          {/* Products grid */}
          {products.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No hay productos en esta categoría.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    primaryColor={primaryColor}
                    onReview={openReviewModal}
                    whatsapp={store.whatsapp}
                    storeName={store.businessName}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-gray-500">
                    Página {page} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Reviews section */}
          {reviews.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Reseñas de clientes
                  {store.avgRating !== null && (
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      {store.avgRating} ★ · {store.reviewCount} reseñas
                    </span>
                  )}
                </h2>
                <button
                  onClick={() => openReviewModal()}
                  className="text-sm font-medium underline-offset-2 hover:underline"
                  style={{ color: primaryColor }}
                >
                  Escribir reseña
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {reviews.map((review) => (
                  <div key={review.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{review.customerName}</p>
                        {review.productName && (
                          <p className="text-xs text-gray-400">{review.productName}</p>
                        )}
                      </div>
                      <StarRating rating={review.rating} size={14} className="shrink-0 mt-0.5" />
                    </div>
                    {review.comment && (
                      <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">{timeAgo(review.createdAt)}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────── */}
        <footer className="border-t border-gray-200 bg-white py-6 px-4 text-center text-xs text-gray-400">
          <p>
            Tienda gestionada con{" "}
            <a href="/" className="font-medium text-gray-600 hover:underline">
              Camila
            </a>{" "}
            · San Ramón, Chanchamayo
          </p>
        </footer>
      </div>

      <ReviewModal
        open={reviewModal}
        onClose={() => setReviewModal(false)}
        storeSlug={slug || ""}
        products={products}
        preselectedProductId={reviewProductId}
      />
    </>
  );
}
