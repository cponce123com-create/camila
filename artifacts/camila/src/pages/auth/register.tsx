import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useRegisterStore, RegisterStoreRequestBusinessType, RegisterStoreRequestDocumentType } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Store } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Helmet } from "react-helmet-async";

const DISTRICTS = ["San Ramón", "La Merced", "Pichanaqui", "Chanchamayo", "Perené", "Villa Rica", "Satipo"];

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const registerMutation = useRegisterStore();
  
  const [formData, setFormData] = useState({
    businessName: "",
    businessType: "clothing" as RegisterStoreRequestBusinessType,
    documentType: "DNI" as RegisterStoreRequestDocumentType,
    documentNumber: "",
    ownerName: "",
    phone: "",
    email: "",
    password: "",
    address: "",
    district: "San Ramón",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await registerMutation.mutateAsync({ data: formData });
      toast({ title: "¡Tienda creada exitosamente!", description: "Por favor, inicia sesión." });
      setLocation('/login');
    } catch (err: any) {
      toast({ 
        title: "Error en el registro", 
        description: err.message || "Verifica los datos ingresados", 
        variant: "destructive" 
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <Helmet>
        <title>Crear Tienda Gratis — Camila</title>
        <meta name="description" content="Registra tu negocio en Camila y empieza a gestionar ventas, inventario y clientes de forma gratuita. Para emprendedores de Chanchamayo y todo Perú." />
      </Helmet>
      <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-8 self-start md:self-auto transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" /> Volver al inicio
      </Link>
      
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl">
        <Card className="border-border/50 shadow-2xl shadow-primary/5 rounded-3xl overflow-hidden">
          <div className="bg-primary p-8 text-primary-foreground text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 opacity-10">
              <Store className="w-48 h-48" />
            </div>
            <img src={`${import.meta.env.BASE_URL}images/camila-logo.webp`} alt="Logo" className="h-12 w-12 mx-auto mb-4 brightness-0 invert" />
            <CardTitle className="text-3xl font-display font-bold mb-2 relative z-10">Crea tu Tienda</CardTitle>
            <CardDescription className="text-primary-foreground/80 text-lg relative z-10">
              Únete a la revolución del comercio local en Chanchamayo
            </CardDescription>
          </div>
          
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Nombre del Negocio</Label>
                  <Input id="businessName" required value={formData.businessName} onChange={handleChange} className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Negocio</Label>
                  <Select value={formData.businessType} onValueChange={(v: any) => setFormData(p => ({...p, businessType: v}))}>
                    <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clothing">Tienda de Ropa</SelectItem>
                      <SelectItem value="restaurant">Restaurante</SelectItem>
                      <SelectItem value="bakery">Panadería</SelectItem>
                      <SelectItem value="fair_booth">Tienda de Feria</SelectItem>
                      <SelectItem value="general_catalog">Catálogo General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Documento</Label>
                  <Select value={formData.documentType} onValueChange={(v: any) => setFormData(p => ({...p, documentType: v}))}>
                    <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DNI">DNI</SelectItem>
                      <SelectItem value="RUC10">RUC 10</SelectItem>
                      <SelectItem value="RUC20">RUC 20</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="documentNumber">Número de Documento</Label>
                  <Input id="documentNumber" required value={formData.documentNumber} onChange={handleChange} className="h-12 rounded-xl" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ownerName">Nombre del Titular</Label>
                  <Input id="ownerName" required value={formData.ownerName} onChange={handleChange} className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Celular / WhatsApp</Label>
                  <Input id="phone" required value={formData.phone} onChange={handleChange} className="h-12 rounded-xl" />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input id="address" required value={formData.address} onChange={handleChange} className="h-12 rounded-xl" />
                </div>

                <div className="space-y-2">
                  <Label>Distrito</Label>
                  <Select value={formData.district} onValueChange={(v) => setFormData(p => ({...p, district: v}))}>
                    <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DISTRICTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="hidden md:block"></div> {/* Spacer */}

                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input id="email" type="email" required value={formData.email} onChange={handleChange} className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña (Mín. 8 caracteres)</Label>
                  <Input id="password" type="password" required minLength={8} value={formData.password} onChange={handleChange} className="h-12 rounded-xl" />
                </div>
              </div>

              <div className="pt-4 border-t border-border/50">
                <Button type="submit" disabled={registerMutation.isPending} className="w-full h-14 rounded-xl text-lg font-bold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all">
                  {registerMutation.isPending ? <Loader2 className="h-6 w-6 animate-spin" /> : "Crear mi Tienda Ahora"}
                </Button>
              </div>
            </form>
            
            <div className="mt-8 text-center text-sm text-muted-foreground">
              ¿Ya tienes una cuenta?{' '}
              <Link href="/login" className="font-semibold text-primary hover:underline">
                Inicia sesión aquí
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
