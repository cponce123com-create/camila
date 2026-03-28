import { useState, useEffect } from "react";
import { Check, Copy, Share2, Store, Package, ChevronRight, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/ui/image-upload";
import { useToast } from "@/hooks/use-toast";
import {
  useUpdateMyStore,
  useCreateProduct,
  useGetProducts,
  getGetProductsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import type { CurrentUserResponse } from "@workspace/api-client-react";

interface OnboardingWizardProps {
  store: NonNullable<CurrentUserResponse["store"]>;
}

const STORAGE_KEY_PREFIX = "camila_onboarding_done_";

function getDismissedKey(storeId: string | number) {
  return `${STORAGE_KEY_PREFIX}${storeId}`;
}

const STEPS = [
  { id: "logo", label: "Logo", icon: Store },
  { id: "product", label: "Producto", icon: Package },
  { id: "share", label: "Compartir", icon: Share2 },
] as const;

export function OnboardingWizard({ store }: OnboardingWizardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateStoreMutation = useUpdateMyStore();
  const createProductMutation = useCreateProduct();

  const { data: productsData } = useGetProducts({ limit: 1 });
  const hasProducts = (productsData?.items?.length ?? 0) > 0;
  const hasLogo = Boolean((store as any).logoUrl);
  const hasSlug = Boolean((store as any).slug);

  const needsOnboarding = !hasLogo || !hasSlug || !hasProducts;
  const dismissed = Boolean(
    typeof window !== "undefined" &&
      localStorage.getItem(getDismissedKey(store.id))
  );

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  // Logo step state
  const [logoUrl, setLogoUrl] = useState((store as any).logoUrl || "");
  const [logoSaved, setLogoSaved] = useState(false);

  // Product step state
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productImage, setProductImage] = useState("");
  const [productSaved, setProductSaved] = useState(false);

  // Share step
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (needsOnboarding && !dismissed) {
      setOpen(true);
    }
  }, [needsOnboarding, dismissed]);

  function dismiss() {
    localStorage.setItem(getDismissedKey(store.id), "1");
    setOpen(false);
  }

  function nextStep() {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      dismiss();
    }
  }

  async function saveLogo() {
    if (!logoUrl) {
      nextStep();
      return;
    }
    try {
      await updateStoreMutation.mutateAsync({ data: { logoUrl } });
      setLogoSaved(true);
      toast({ title: "Logo guardado" });
      setTimeout(nextStep, 600);
    } catch {
      toast({ title: "Error al guardar el logo", variant: "destructive" });
    }
  }

  async function saveProduct() {
    const name = productName.trim();
    const price = parseFloat(productPrice);
    if (!name || isNaN(price) || price <= 0) {
      toast({ title: "Completa nombre y precio válido", variant: "destructive" });
      return;
    }
    try {
      await createProductMutation.mutateAsync({
        data: {
          name,
          price,
          imageUrl: productImage || undefined,
        },
      });
      await queryClient.invalidateQueries({ queryKey: getGetProductsQueryKey({}) });
      setProductSaved(true);
      toast({ title: "¡Producto creado!" });
      setTimeout(nextStep, 600);
    } catch {
      toast({ title: "Error al crear el producto", variant: "destructive" });
    }
  }

  const publicUrl = `camila.pe/tienda/${(store as any).slug || "tu-tienda"}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`https://${publicUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "No se pudo copiar", variant: "destructive" });
    }
  }

  function shareWhatsApp() {
    const text = encodeURIComponent(
      `¡Visita mi tienda en línea! 🛍️ https://${publicUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-md w-full p-0 overflow-hidden gap-0"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        hideCloseButton
      >
        {/* Header gradient bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-green-400 to-teal-500" />

        {/* Step indicators */}
        <div className="px-6 pt-5 pb-2">
          <div className="flex items-center gap-1.5 mb-4">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === step;
              const isDone = i < step;
              return (
                <div key={s.id} className="flex items-center gap-1.5">
                  <div
                    className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-semibold transition-colors ${
                      isDone
                        ? "bg-emerald-500 text-white"
                        : isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isDone ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Icon className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      isActive ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {s.label}
                  </span>
                  {i < STEPS.length - 1 && (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 mx-0.5" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {/* ── Step 0: Logo ── */}
          {step === 0 && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                    Paso 1 de 3
                  </span>
                </div>
                <DialogTitle className="text-xl">Sube el logo de tu tienda</DialogTitle>
                <DialogDescription>
                  Tu logo aparece en la tienda pública y en los recibos. Puedes cambiarlo después.
                </DialogDescription>
              </DialogHeader>

              <ImageUpload
                value={logoUrl}
                onChange={setLogoUrl}
                folder="logo"
                aspectRatio="square"
                hint="JPG, PNG o SVG · máx. 10 MB"
                disabled={updateStoreMutation.isPending || logoSaved}
              />

              <div className="flex gap-2 pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => {
                    dismiss();
                  }}
                >
                  Saltar por ahora
                </Button>
                <Button
                  className="flex-1"
                  onClick={saveLogo}
                  disabled={updateStoreMutation.isPending || logoSaved}
                >
                  {updateStoreMutation.isPending
                    ? "Guardando..."
                    : logoUrl
                    ? "Guardar y continuar"
                    : "Continuar sin logo"}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </>
          )}

          {/* ── Step 1: First product ── */}
          {step === 1 && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                    Paso 2 de 3
                  </span>
                </div>
                <DialogTitle className="text-xl">Crea tu primer producto</DialogTitle>
                <DialogDescription>
                  Agrega al menos un producto para que tu tienda tenga contenido.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="ob-name">Nombre del producto *</Label>
                  <Input
                    id="ob-name"
                    placeholder="Ej: Pan de yema"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="mt-1.5"
                    disabled={createProductMutation.isPending || productSaved}
                  />
                </div>
                <div>
                  <Label htmlFor="ob-price">Precio (S/) *</Label>
                  <Input
                    id="ob-price"
                    placeholder="0.00"
                    type="number"
                    min="0"
                    step="0.01"
                    value={productPrice}
                    onChange={(e) => setProductPrice(e.target.value)}
                    className="mt-1.5"
                    disabled={createProductMutation.isPending || productSaved}
                  />
                </div>
                <ImageUpload
                  value={productImage}
                  onChange={setProductImage}
                  folder="product"
                  label="Foto (opcional)"
                  aspectRatio="square"
                  hint="Arrastra o haz clic para subir"
                  disabled={createProductMutation.isPending || productSaved}
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => {
                    dismiss();
                  }}
                >
                  Saltar por ahora
                </Button>
                <Button
                  className="flex-1"
                  onClick={saveProduct}
                  disabled={createProductMutation.isPending || productSaved}
                >
                  {createProductMutation.isPending ? "Creando..." : "Crear y continuar"}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </>
          )}

          {/* ── Step 2: Share ── */}
          {step === 2 && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                    Paso 3 de 3
                  </span>
                </div>
                <DialogTitle className="text-xl">¡Tu tienda ya está lista!</DialogTitle>
                <DialogDescription>
                  Comparte el link con tus clientes para que puedan ver y pedir tus productos.
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-xl border bg-muted/40 p-4 space-y-3">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Link de tu tienda
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm bg-background border rounded-lg px-3 py-2 font-mono truncate">
                    {publicUrl}
                  </code>
                  <Button variant="outline" size="icon" onClick={copyLink} className="shrink-0">
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full gap-2 border-green-200 text-green-700 hover:bg-green-50"
                onClick={shareWhatsApp}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-green-600">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Compartir por WhatsApp
              </Button>

              <div className="flex gap-2 pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={dismiss}
                >
                  Saltar por ahora
                </Button>
                <Button className="flex-1" onClick={dismiss}>
                  ¡Listo, ir al panel!
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
