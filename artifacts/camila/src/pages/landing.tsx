import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Store, TrendingUp, ShieldCheck, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";

const BASE = import.meta.env.BASE_URL;
const SITE_URL = "https://camila.replit.app";
const OG_IMAGE = `${SITE_URL}${BASE}images/opengraph.jpg`;

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Helmet>
        <title>Camila — Software de Gestión para Negocios Locales en Chanchamayo</title>
        <meta
          name="description"
          content="Camila es el sistema de ventas, inventario y gestión todo-en-uno diseñado para emprendedores de San Ramón, Chanchamayo y toda la selva peruana. Prueba gratis."
        />
        <meta name="keywords" content="software tienda peru, sistema ventas chanchamayo, inventario san ramon, gestion negocio local peru, camila saas" />
        <link rel="canonical" href={SITE_URL} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:title" content="Camila — Software de Gestión para Negocios Locales en Chanchamayo" />
        <meta property="og:description" content="Sistema de ventas, inventario y analítica diseñado para emprendedores de la selva peruana. Fácil, rápido y desde S/ 0." />
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:locale" content="es_PE" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Camila — Software para Negocios en Chanchamayo" />
        <meta name="twitter:description" content="Gestiona ventas, inventario y análisis de tu negocio desde cualquier dispositivo." />
        <meta name="twitter:image" content={OG_IMAGE} />
      </Helmet>
      <header className="fixed top-0 w-full bg-background/80 backdrop-blur-md border-b border-border/50 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={`${import.meta.env.BASE_URL}images/camila-logo.png`} alt="Camila Logo" className="h-10 w-10" />
            <span className="font-display font-bold text-2xl text-primary tracking-tight">Camila</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="font-semibold text-muted-foreground hover:text-primary">Ingresar</Button>
            </Link>
            <Link href="/register">
              <Button className="font-semibold bg-primary hover:bg-primary/90 rounded-full px-6 shadow-md shadow-primary/20">
                Crear Tienda
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-20">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-16 pb-24 lg:pt-32 lg:pb-40">
          <div className="absolute inset-0 -z-10">
            <img 
              src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
              alt="Jungle foliage background" 
              className="w-full h-full object-cover opacity-15"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
          </div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <span className="inline-block py-1.5 px-4 rounded-full bg-secondary text-primary font-semibold text-sm mb-6 border border-primary/20 shadow-sm">
                Diseñado para Chanchamayo y el Mundo 🌴
              </span>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-extrabold text-foreground mb-6 leading-tight">
                Impulsa tu negocio local <br className="hidden md:block"/> con tecnología de clase mundial.
              </h1>
              <p className="mt-4 text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
                Camila es la plataforma todo-en-uno para tiendas, restaurantes y ferias. Gestiona tu inventario, ventas y equipo desde un solo lugar.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/register">
                  <Button size="lg" className="w-full sm:w-auto text-lg px-8 h-14 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/25 hover:-translate-y-1 transition-all">
                    Empieza Gratis Hoy <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-card border-t border-border/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">Todo lo que tu negocio necesita</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Hecho a la medida para emprendedores que buscan profesionalizar sus operaciones sin complicaciones.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <motion.div whileHover={{ y: -5 }} className="bg-background p-8 rounded-3xl shadow-sm border border-border/50">
                <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                  <Store className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">Multi-tenant Real</h3>
                <p className="text-muted-foreground leading-relaxed">Tu espacio es 100% privado. Nadie más verá tus datos, productos o ventas. Total aislamiento y seguridad.</p>
              </motion.div>

              <motion.div whileHover={{ y: -5 }} className="bg-background p-8 rounded-3xl shadow-sm border border-border/50">
                <div className="h-14 w-14 bg-accent/10 rounded-2xl flex items-center justify-center mb-6">
                  <TrendingUp className="h-7 w-7 text-accent" />
                </div>
                <h3 className="text-xl font-bold mb-3">Control de Inventario</h3>
                <p className="text-muted-foreground leading-relaxed">Olvídate del cuaderno. Registra entradas, salidas y ajustes de stock con precisión y reportes en tiempo real.</p>
              </motion.div>

              <motion.div whileHover={{ y: -5 }} className="bg-background p-8 rounded-3xl shadow-sm border border-border/50">
                <div className="h-14 w-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6">
                  <ShieldCheck className="h-7 w-7 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold mb-3">Roles y Permisos</h3>
                <p className="text-muted-foreground leading-relaxed">Asigna roles a tu equipo: administrador, personal de tienda o cajero. Controla quién ve qué información.</p>
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-primary text-primary-foreground py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center opacity-80">
          <img src={`${import.meta.env.BASE_URL}images/camila-logo.png`} alt="Logo" className="h-8 w-8 mx-auto mb-4 brightness-0 invert" />
          <p>&copy; {new Date().getFullYear()} Camila SaaS. Orgullosamente desarrollado para San Ramón y todo el Perú.</p>
        </div>
      </footer>
    </div>
  );
}
