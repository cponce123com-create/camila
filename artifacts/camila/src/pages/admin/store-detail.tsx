import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAdminGetStore, useAdminUpdateLicense, UpdateLicenseRequestStatus } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Store as StoreIcon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";

export default function AdminStoreDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: store, isLoading } = useAdminGetStore(id || "");
  const updateLicenseMutation = useAdminUpdateLicense();
  
  const [licenseStatus, setLicenseStatus] = useState<UpdateLicenseRequestStatus>("trial");

  useEffect(() => {
    if (store?.license) {
      setLicenseStatus(store.license.status);
    }
  }, [store]);

  if (isLoading) return <DashboardLayout><div className="p-8 text-center"><Loader2 className="animate-spin mx-auto h-8 w-8" /></div></DashboardLayout>;
  if (!store) return <DashboardLayout><div className="p-8">Tienda no encontrada.</div></DashboardLayout>;

  const handleUpdateLicense = async () => {
    try {
      await updateLicenseMutation.mutateAsync({
        storeId: store.id,
        data: { status: licenseStatus }
      });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/stores/${store.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/stores`] });
      toast({ title: "Licencia actualizada" });
    } catch (err) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <Link href="/admin" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-4 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Tiendas
        </Link>
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center">
            <StoreIcon className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">{store.businessName}</h1>
            <p className="text-muted-foreground">{store.district} • Creada el {new Date(store.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="font-display">Datos del Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Titular</p>
                <p className="font-semibold">{store.ownerName}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Documento ({store.documentType})</p>
                <p className="font-semibold">{store.documentNumber}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Celular / WhatsApp</p>
                <p className="font-semibold">{store.phone}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Correo (Admin)</p>
                <p className="font-semibold">{store.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm rounded-2xl border-l-4 border-l-primary">
          <CardHeader>
            <CardTitle className="font-display">Gestión de Licencia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl">
                <div>
                  <p className="text-sm text-muted-foreground">Estado Actual</p>
                  <p className="text-lg font-bold uppercase">{store.license?.status}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Cambiar Estado</p>
                <div className="flex gap-3">
                  <Select value={licenseStatus} onValueChange={(v: UpdateLicenseRequestStatus) => setLicenseStatus(v)}>
                    <SelectTrigger className="w-full rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trial">Trial (Prueba)</SelectItem>
                      <SelectItem value="active">Activa</SelectItem>
                      <SelectItem value="expired">Vencida</SelectItem>
                      <SelectItem value="suspended">Suspendida</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleUpdateLicense} 
                    disabled={updateLicenseMutation.isPending || licenseStatus === store.license?.status}
                    className="rounded-xl"
                  >
                    {updateLicenseMutation.isPending ? <Loader2 className="animate-spin" /> : "Actualizar"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
