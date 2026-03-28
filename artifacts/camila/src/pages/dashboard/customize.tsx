import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { 
  useGetStoreSettings, 
  useUpdateStoreSettings,
  useGetStoreBanners,
  useCreateStoreBanner,
  useDeleteStoreBanner,
  useReorderStoreBanners,
  type StoreSettingsTemplate,
  type StoreSettingsFont,
  type StoreSettingsCatalogView
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Check, LayoutGrid, List, Star, Image as ImageIcon, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ImageUpload } from "@/components/ui/image-upload";

export default function CustomizePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading: isLoadingSettings } = useGetStoreSettings();
  const { data: banners, isLoading: isLoadingBanners } = useGetStoreBanners();
  
  const updateSettingsMutation = useUpdateStoreSettings();
  const createBannerMutation = useCreateStoreBanner();
  const deleteBannerMutation = useDeleteStoreBanner();
  const reorderBannersMutation = useReorderStoreBanners();

  const [isBannerDialogOpen, setIsBannerDialogOpen] = useState(false);
  const [bannerForm, setBannerForm] = useState({
    imageUrl: "",
    title: "",
    subtitle: "",
    linkUrl: "",
    isActive: true
  });

  const handleUpdateSettings = async (updates: any) => {
    try {
      await updateSettingsMutation.mutateAsync({ data: updates });
      queryClient.invalidateQueries({ queryKey: ["/api/stores/me/settings"] });
      toast({ title: "Configuración guardada" });
    } catch (err) {
      toast({ title: "Error al guardar", variant: "destructive" });
    }
  };

  const handleCreateBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerForm.imageUrl) {
      toast({ title: "Debes subir una imagen para el banner", variant: "destructive" });
      return;
    }
    try {
      await createBannerMutation.mutateAsync({ data: bannerForm });
      queryClient.invalidateQueries({ queryKey: ["/api/stores/me/banners"] });
      setIsBannerDialogOpen(false);
      setBannerForm({ imageUrl: "", title: "", subtitle: "", linkUrl: "", isActive: true });
      toast({ title: "Banner creado exitosamente" });
    } catch (err) {
      toast({ title: "Error al crear banner", variant: "destructive" });
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (confirm("¿Eliminar este banner?")) {
      try {
        await deleteBannerMutation.mutateAsync({ bannerId: id });
        queryClient.invalidateQueries({ queryKey: ["/api/stores/me/banners"] });
        toast({ title: "Banner eliminado" });
      } catch (err) {
        toast({ title: "Error al eliminar", variant: "destructive" });
      }
    }
  };

  const handleReorderBanner = async (index: number, direction: 'up' | 'down') => {
    if (!banners) return;
    const newBanners = [...banners];
    if (direction === 'up' && index > 0) {
      const temp = newBanners[index];
      newBanners[index] = newBanners[index - 1];
      newBanners[index - 1] = temp;
    } else if (direction === 'down' && index < newBanners.length - 1) {
      const temp = newBanners[index];
      newBanners[index] = newBanners[index + 1];
      newBanners[index + 1] = temp;
    } else {
      return;
    }
    
    try {
      await reorderBannersMutation.mutateAsync({ data: { orderedIds: newBanners.map(b => b.id) } });
      queryClient.invalidateQueries({ queryKey: ["/api/stores/me/banners"] });
    } catch (err) {
      toast({ title: "Error al reordenar", variant: "destructive" });
    }
  };

  const [businessHours, setBusinessHours] = useState("");
  const [thankYouMessage, setThankYouMessage] = useState("");
  
  // Pre-fill business hours and thank you message
  useEffect(() => {
    if (settings?.businessHours) {
      setBusinessHours(settings.businessHours);
    }
  }, [settings?.businessHours]);

  useEffect(() => {
    if (settings?.thankYouMessage !== undefined) {
      setThankYouMessage(settings.thankYouMessage ?? "");
    }
  }, [settings?.thankYouMessage]);

  if (isLoadingSettings) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-96 mb-8" />
          <Skeleton className="h-[400px] w-full rounded-2xl" />
        </div>
      </DashboardLayout>
    );
  }

  const templates: { id: StoreSettingsTemplate, label: string, color: string }[] = [
    { id: "moderna", label: "Moderna", color: "bg-blue-500" },
    { id: "clasica", label: "Clásica", color: "bg-stone-500" },
    { id: "minimalista", label: "Minimalista", color: "bg-neutral-800" },
    { id: "vibrante", label: "Vibrante", color: "bg-rose-500" },
    { id: "elegante", label: "Elegante", color: "bg-purple-500" },
  ];

  const fonts: StoreSettingsFont[] = ["inter", "poppins", "roboto", "playfair", "montserrat", "nunito"];

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Personalización</h1>
        <p className="text-muted-foreground">Adapta la apariencia y funcionalidad de tu tienda.</p>
      </div>

      <Tabs defaultValue="apariencia" className="space-y-6">
        <TabsList className="bg-card border border-border/50 h-14 p-1 rounded-xl w-full sm:w-auto inline-flex overflow-x-auto justify-start">
          <TabsTrigger value="apariencia" className="rounded-lg h-full px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Apariencia</TabsTrigger>
          <TabsTrigger value="banners" className="rounded-lg h-full px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Banners</TabsTrigger>
          <TabsTrigger value="funcionalidades" className="rounded-lg h-full px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Funcionalidades</TabsTrigger>
          <TabsTrigger value="horarios" className="rounded-lg h-full px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Horarios</TabsTrigger>
        </TabsList>

        <TabsContent value="apariencia" className="space-y-8 animate-in fade-in-50 duration-500">
          <div className="bg-primary/5 border border-primary/20 text-primary-foreground/80 text-sm px-4 py-3 rounded-xl flex items-center mb-6">
            <span className="text-primary font-medium">💡 Los cambios de esta sección se guardan automáticamente y se reflejan en tu tienda.</span>
          </div>

          <section>
            <h3 className="text-xl font-bold font-display mb-4">Plantilla</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {templates.map(tpl => (
                <button 
                  key={tpl.id}
                  onClick={() => handleUpdateSettings({ template: tpl.id })}
                  className={`relative flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-200 hover:scale-[1.02]
                    ${settings?.template === tpl.id ? 'border-primary bg-primary/5' : 'border-border/50 bg-card hover:border-primary/50'}`}
                >
                  <div className={`w-12 h-12 rounded-full ${tpl.color} shadow-sm flex items-center justify-center`}>
                    {settings?.template === tpl.id && <Check className="text-white h-6 w-6" />}
                  </div>
                  <span className="font-medium">{tpl.label}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-xl font-bold font-display mb-4">Tipografía</h3>
            <div className="flex flex-wrap gap-3">
              {fonts.map(font => (
                <button
                  key={font}
                  onClick={() => handleUpdateSettings({ font })}
                  className={`px-5 py-2.5 rounded-full font-medium transition-colors border capitalize
                    ${settings?.font === font 
                      ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20' 
                      : 'bg-card border-border/50 text-foreground hover:bg-secondary'}`}
                  style={{ fontFamily: font }}
                >
                  {font}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-xl font-bold font-display mb-4">Color Secundario</h3>
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-border/50 shadow-sm cursor-pointer">
                <input 
                  type="color" 
                  className="absolute inset-[-10px] w-24 h-24 cursor-pointer"
                  value={settings?.secondaryColor || "#000000"}
                  onChange={(e) => handleUpdateSettings({ secondaryColor: e.target.value })}
                  onBlur={(e) => handleUpdateSettings({ secondaryColor: e.target.value })}
                />
              </div>
              <span className="font-mono text-sm text-muted-foreground uppercase">{settings?.secondaryColor || "Por defecto"}</span>
            </div>
          </section>

          <section>
            <h3 className="text-xl font-bold font-display mb-4">Vista de Catálogo</h3>
            <div className="flex bg-card border border-border/50 rounded-xl p-1 w-fit">
              {[
                { id: "grid", label: "Cuadrícula", icon: LayoutGrid },
                { id: "list", label: "Lista", icon: List },
                { id: "featured", label: "Destacados", icon: Star }
              ].map(view => {
                const Icon = view.icon;
                return (
                  <button
                    key={view.id}
                    onClick={() => handleUpdateSettings({ catalogView: view.id as StoreSettingsCatalogView })}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors
                      ${settings?.catalogView === view.id 
                        ? 'bg-secondary text-secondary-foreground shadow-sm' 
                        : 'text-muted-foreground hover:bg-muted'}`}
                  >
                    <Icon className="h-4 w-4" />
                    {view.label}
                  </button>
                )
              })}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="banners" className="space-y-6 animate-in fade-in-50 duration-500">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-bold font-display">Banners Promocionales</h3>
              <p className="text-muted-foreground text-sm mt-1">
                El banner 1 es fijo (muestra tu logo y nombre). Puedes agregar hasta 5 banners personalizados del 2 al 6.
                <span className="font-medium text-foreground ml-1">({banners?.length || 0}/5 personalizados)</span>
              </p>
            </div>
            <Button
              disabled={(banners?.length || 0) >= 5 || isBannerDialogOpen}
              className="rounded-xl shadow-md"
              onClick={() => {
                setBannerForm({ imageUrl: "", title: "", subtitle: "", linkUrl: "", isActive: true });
                setIsBannerDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" /> Agregar Banner
            </Button>
          </div>

          {isBannerDialogOpen && (
            <Card className="rounded-2xl border-primary/30 shadow-md overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h4 className="font-bold text-lg font-display">Nuevo Banner</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground rounded-xl"
                    onClick={() => setIsBannerDialogOpen(false)}
                    type="button"
                  >
                    Cancelar
                  </Button>
                </div>
                <form onSubmit={handleCreateBanner} className="space-y-4">
                  <ImageUpload
                    label="Imagen del banner *"
                    hint="Recomendado: 1200×400px. JPG o PNG."
                    folder="banner-promo"
                    aspectRatio="banner"
                    value={bannerForm.imageUrl}
                    onChange={(url) => setBannerForm({ ...bannerForm, imageUrl: url })}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Título (Opcional)</Label>
                      <Input value={bannerForm.title} onChange={e => setBannerForm({...bannerForm, title: e.target.value})} className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label>Subtítulo (Opcional)</Label>
                      <Input value={bannerForm.subtitle} onChange={e => setBannerForm({...bannerForm, subtitle: e.target.value})} className="rounded-xl" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Enlace destino (Opcional)</Label>
                    <Input value={bannerForm.linkUrl} onChange={e => setBannerForm({...bannerForm, linkUrl: e.target.value})} className="rounded-xl" placeholder="https://..." />
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <Label>Activo al guardar</Label>
                    <Switch checked={bannerForm.isActive} onCheckedChange={c => setBannerForm({...bannerForm, isActive: c})} />
                  </div>
                  <Button type="submit" disabled={createBannerMutation.isPending} className="w-full h-12 rounded-xl mt-2">
                    {createBannerMutation.isPending ? <Loader2 className="animate-spin" /> : "Guardar Banner"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {isLoadingBanners ? (
            <div className="py-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : !banners?.length ? (
            <div className="bg-card border border-border/50 rounded-2xl p-16 flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 bg-secondary rounded-full flex items-center justify-center mb-4">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <h4 className="font-bold text-lg">No hay banners</h4>
              <p className="text-muted-foreground mt-1 max-w-sm">Agrega tu primer banner promocional para captar la atención de tus clientes.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {banners.map((banner, index) => (
                <Card key={banner.id} className="border-border/50 rounded-2xl overflow-hidden shadow-sm flex items-stretch">
                  <div className="w-48 bg-muted shrink-0 relative group">
                    <img src={banner.imageUrl} alt="Banner" className="w-full h-full object-cover absolute inset-0" />
                  </div>
                  <CardContent className="flex-1 p-6 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-bold text-lg">{banner.title || "Sin título"}</h4>
                        {banner.isActive ? (
                          <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20">Activo</Badge>
                        ) : (
                          <Badge variant="secondary">Inactivo</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{banner.subtitle || "Sin subtítulo"}</p>
                      {banner.linkUrl && <p className="text-xs text-primary mt-2 truncate max-w-md">{banner.linkUrl}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col mr-4">
                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={index === 0} onClick={() => handleReorderBanner(index, 'up')}>
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={index === banners.length - 1} onClick={() => handleReorderBanner(index, 'down')}>
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteBanner(banner.id)}>
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="funcionalidades" className="space-y-6 animate-in fade-in-50 duration-500 max-w-3xl">
          <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
            <div className="divide-y divide-border/50">
              {[
                { key: 'showOffers', label: 'Mostrar ofertas', desc: 'Destacar productos que tienen precio de costo menor al precio de venta' },
                { key: 'showComments', label: 'Reseñas', desc: 'Permitir que los clientes dejen comentarios en los productos' },
                { key: 'showStock', label: 'Mostrar stock', desc: 'Mostrar la cantidad exacta disponible a los clientes' },
                { key: 'showMenuOfDay', label: 'Menú del día', desc: 'Sección especial destacada para restaurantes y cafeterías' },
                { key: 'restaurantModule', label: 'Módulo Restaurante', desc: 'Activar funciones adicionales para negocios de comida' },
                { key: 'showWhatsappButton', label: 'Botón WhatsApp', desc: 'Botón flotante en toda la tienda para contacto directo' },
                { key: 'showYapeQr', label: 'Código Yape', desc: 'Mostrar código QR de Yape como método de pago al finalizar' },
              ].map(feat => (
                <div key={feat.key} className="p-6 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div className="pr-6">
                    <Label className="text-base font-semibold">{feat.label}</Label>
                    <p className="text-sm text-muted-foreground mt-1">{feat.desc}</p>
                  </div>
                  <Switch 
                    checked={(settings as any)?.[feat.key]} 
                    onCheckedChange={(checked) => handleUpdateSettings({ [feat.key]: checked })} 
                  />
                </div>
              ))}
              
              {settings?.showYapeQr && (
                <div className="p-6 bg-secondary/20">
                  <p className="text-base font-semibold mb-3">Imagen QR de Yape</p>
                  <div className="max-w-[220px]">
                    <ImageUpload
                      label=""
                      hint="Sube la captura de tu QR de Yape. Recomendado: imagen cuadrada."
                      folder="qr"
                      aspectRatio="square"
                      value={settings.yapeQrUrl || ""}
                      onChange={(url) => handleUpdateSettings({ yapeQrUrl: url })}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Este QR aparecerá en tu tienda cuando los clientes quieran pagar con Yape.</p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="horarios" className="space-y-6 animate-in fade-in-50 duration-500 max-w-3xl">
          <Card className="rounded-2xl border-border/50 shadow-sm p-6">
            <div className="mb-6">
              <h3 className="text-xl font-bold font-display">Horario de Atención</h3>
              <p className="text-muted-foreground mt-1">Este horario se mostrará públicamente en tu tienda para que tus clientes sepan cuándo estás disponible.</p>
            </div>
            
            <Textarea
              value={businessHours}
              onChange={e => setBusinessHours(e.target.value)}
              placeholder="Lun-Vie: 8:00 AM - 6:00 PM&#10;Sáb: 9:00 AM - 2:00 PM&#10;Dom: Cerrado"
              className="min-h-[200px] rounded-xl text-base p-4"
            />
            
            <div className="mt-6 flex justify-end">
              <Button 
                onClick={() => handleUpdateSettings({ businessHours })}
                className="h-12 px-8 rounded-xl shadow-md"
                disabled={updateSettingsMutation.isPending}
              >
                {updateSettingsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Horarios
              </Button>
            </div>
          </Card>

          <Card className="rounded-2xl border-border/50 shadow-sm p-6">
            <div className="mb-6">
              <h3 className="text-xl font-bold font-display">Mensaje de Agradecimiento</h3>
              <p className="text-muted-foreground mt-1">Este mensaje aparecerá al pie de cada recibo de venta. Personalízalo para transmitir la identidad de tu negocio.</p>
            </div>
            
            <input
              type="text"
              value={thankYouMessage}
              onChange={e => setThankYouMessage(e.target.value)}
              placeholder="¡Gracias por tu compra! Vuelve pronto."
              maxLength={200}
              className="w-full h-12 rounded-xl border border-input bg-background px-4 text-base focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground mt-2">{thankYouMessage.length}/200 caracteres. Déjalo vacío para usar el mensaje por defecto.</p>
            
            <div className="mt-6 flex justify-end">
              <Button 
                onClick={() => handleUpdateSettings({ thankYouMessage })}
                className="h-12 px-8 rounded-xl shadow-md"
                disabled={updateSettingsMutation.isPending}
              >
                {updateSettingsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Mensaje
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
