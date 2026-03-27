import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login({ email, password });
    } catch (err) {
      // Error handled in auth context
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Helmet>
        <title>Ingresar — Camila</title>
        <meta name="description" content="Accede a tu panel de control de Camila para gestionar ventas, inventario y tu negocio." />
        <meta name="robots" content="noindex" />
      </Helmet>
      {/* Form Side */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-8 transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver al inicio
          </Link>
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-border/50 shadow-xl shadow-black/5 rounded-2xl overflow-hidden">
              <CardHeader className="space-y-2 pb-6">
                <div className="flex justify-center mb-2">
                  <img src={`${import.meta.env.BASE_URL}images/camila-logo.png`} alt="Logo" className="h-12 w-12" />
                </div>
                <CardTitle className="text-2xl font-display text-center font-bold">Bienvenido de vuelta</CardTitle>
                <CardDescription className="text-center text-base">
                  Ingresa a tu panel de control
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email">Correo electrónico</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="tu@correo.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required 
                      className="h-12 rounded-xl bg-background border-border focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Contraseña</Label>
                    </div>
                    <Input 
                      id="password" 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required 
                      className="h-12 rounded-xl bg-background border-border focus:ring-primary/20"
                    />
                  </div>
                  <Button type="submit" disabled={isLoading} className="w-full h-12 rounded-xl text-base font-semibold shadow-md">
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Iniciar Sesión"}
                  </Button>
                </form>
                
                <div className="mt-8 text-center text-sm text-muted-foreground">
                  ¿No tienes una cuenta?{' '}
                  <Link href="/register" className="font-semibold text-primary hover:underline">
                    Crea tu tienda gratis
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
      
      {/* Image Side */}
      <div className="hidden lg:block relative w-0 flex-1 bg-secondary">
        <img
          className="absolute inset-0 h-full w-full object-cover opacity-90 mix-blend-multiply"
          src={`${import.meta.env.BASE_URL}images/login-side.png`}
          alt="Entrepreneur in store"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/20 to-transparent" />
        <div className="absolute bottom-12 left-12 right-12 text-primary-foreground">
          <h2 className="text-4xl font-display font-bold mb-4">Tu negocio, evolucionado.</h2>
          <p className="text-lg opacity-90 max-w-md">Gestiona tu tienda, inventario y equipo con la plataforma líder para emprendedores locales.</p>
        </div>
      </div>
    </div>
  );
}
