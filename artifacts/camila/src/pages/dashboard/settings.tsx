import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import { useUpdateMyStore } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ImageUpload } from "@/components/ui/image-upload";

export default function SettingsPage() {
  const { store } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateMutation = useUpdateMyStore();

  const [formData, setFormData] = useState({
    businessName: "",
    phone: "",
    address: "",
    whatsapp: "",
    socialInstagram: "",
    socialFacebook: "",
    logoUrl: "",
  });

  useEffect(() => {
    if (store) {
      setFormData({
        businessName: store.businessName || "",
        phone: store.phone || "",
        address: store.address || "",
        whatsapp: store.whatsapp || "",
        socialInstagram: store.socialInstagram || "",
        socialFacebook: store.socialFacebook || "",
        logoUrl: (store as any).logoUrl || "",
      });
    }
  }, [store]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync({ data: formData });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stores/me"] });
      toast({ title: "Configuración guardada" });
    } catch (err) {
      toast({ title: "Error al guardar", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Configuración</h1>
        <p className="text-muted-foreground">Actualiza los datos de tu negocio.</p>
      </div>

      <div className="max-w-3xl space-y-6">
        <Card className="border-border/50 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="font-display">Imágenes del Negocio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="max-w-xs">
              <ImageUpload
                label="Logo del negocio"
                hint="Recomendado: 400×400px. PNG o JPG."
                folder="logo"
                aspectRatio="square"
                value={formData.logoUrl}
                onChange={(url) => setFormData({ ...formData, logoUrl: url })}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Las imágenes se actualizan al guardar los cambios.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="font-display">Perfil del Negocio</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Nombre Público</Label>
                  <Input 
                    value={formData.businessName} 
                    onChange={e => setFormData({...formData, businessName: e.target.value})} 
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Celular de Contacto</Label>
                  <Input 
                    value={formData.phone} 
                    onChange={e => setFormData({...formData, phone: e.target.value})} 
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Dirección Física</Label>
                  <Input 
                    value={formData.address} 
                    onChange={e => setFormData({...formData, address: e.target.value})} 
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-border/50">
                <h3 className="font-semibold text-lg mb-4">Redes Sociales & Contacto</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>WhatsApp (Para pedidos)</Label>
                    <div className="flex rounded-xl border border-input overflow-hidden focus-within:ring-1 focus-within:ring-ring">
                      <span className="flex items-center px-3 bg-muted text-muted-foreground text-sm font-medium border-r border-input shrink-0">
                        +51
                      </span>
                      <Input
                        placeholder="987654321"
                        value={formData.whatsapp}
                        onChange={e => {
                          const v = e.target.value.replace(/\D/g, "").slice(0, 9);
                          setFormData({ ...formData, whatsapp: v });
                        }}
                        maxLength={9}
                        inputMode="numeric"
                        className="rounded-none border-0 shadow-none focus-visible:ring-0"
                      />
                    </div>
                    {formData.whatsapp && !/^9\d{8}$/.test(formData.whatsapp) && (
                      <p className="flex items-center gap-1 text-xs text-amber-600">
                        <AlertCircle className="w-3 h-3" />
                        Debe tener 9 dígitos y empezar en 9
                      </p>
                    )}
                    {!formData.whatsapp && (
                      <p className="text-xs text-muted-foreground">9 dígitos, empieza en 9. Ej: 987654321</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Instagram (@usuario)</Label>
                    <Input 
                      value={formData.socialInstagram} 
                      onChange={e => setFormData({...formData, socialInstagram: e.target.value})} 
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Facebook (Link o página)</Label>
                    <Input 
                      value={formData.socialFacebook} 
                      onChange={e => setFormData({...formData, socialFacebook: e.target.value})} 
                      className="rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 flex justify-end">
                <Button type="submit" disabled={updateMutation.isPending} className="h-12 px-8 rounded-xl bg-primary hover:bg-primary/90">
                  {updateMutation.isPending ? <Loader2 className="animate-spin mr-2" /> : null}
                  Guardar Cambios
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
