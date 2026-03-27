import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Store, TrendingUp, ShieldCheck, ArrowRight, Package,
  ShoppingCart, UtensilsCrossed, BarChart2, Users, FileDown,
  CheckCircle2, ChevronRight, Zap, MapPin,
} from "lucide-react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";

const BASE = import.meta.env.BASE_URL;
const SITE_URL = "https://camila.replit.app";
const OG_IMAGE = `${SITE_URL}${BASE}images/opengraph.jpg`;

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.55, delay: i * 0.08, ease: "easeOut" } }),
};

const FEATURES = [
  {
    icon: Package,
    color: "bg-emerald-500/10",
    iconColor: "text-emerald-600",
    title: "Control de Inventario",
    desc: "Registra entradas, salidas y ajustes de stock. Alertas automáticas cuando el stock está por agotarse.",
  },
  {
    icon: ShoppingCart,
    color: "bg-amber-500/10",
    iconColor: "text-amber-600",
    title: "Punto de Venta (POS)",
    desc: "Registra ventas rápido desde cualquier dispositivo. Descuentos, múltiples métodos de pago y boletas digitales.",
  },
  {
    icon: UtensilsCrossed,
    color: "bg-orange-500/10",
    iconColor: "text-orange-600",
    title: "Módulo Restaurante",
    desc: "Mesas, pedidos por mesa, carta digital, control de cocina y estadísticas de servicio en tiempo real.",
  },
  {
    icon: BarChart2,
    color: "bg-blue-500/10",
    iconColor: "text-blue-600",
    title: "Analítica y Reportes",
    desc: "Ve cómo va tu negocio con gráficos claros. Exporta reportes en PDF o CSV con un solo clic.",
  },
  {
    icon: Users,
    color: "bg-purple-500/10",
    iconColor: "text-purple-600",
    title: "Gestión de Equipo",
    desc: "Crea cuentas para tu personal con roles y permisos. Tú controlas quién accede a qué información.",
  },
  {
    icon: FileDown,
    color: "bg-rose-500/10",
    iconColor: "text-rose-600",
    title: "Exporta y Comparte",
    desc: "Genera boletas PDF y compártelas por WhatsApp. Exporta tu inventario o ventas a Excel en segundos.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Crea tu cuenta gratis",
    desc: "Registra tu negocio en menos de 2 minutos. Sin tarjeta de crédito, sin complicaciones.",
  },
  {
    n: "02",
    title: "Carga tu catálogo",
    desc: "Agrega tus productos, precios y stock. Importa desde Excel o escánalos uno a uno.",
  },
  {
    n: "03",
    title: "Vende y crece",
    desc: "Usa el POS para vender, revisa tu analítica y toma decisiones con datos reales de tu negocio.",
  },
];

const TESTIMONIALS = [
  {
    name: "Rosa Huamán",
    role: "Propietaria — Bodega El Paraíso",
    location: "San Ramón, Chanchamayo",
    quote:
      "Antes anotaba todo en cuadernos y perdía ventas. Con Camila sé exactamente cuánto tengo en stock y cuánto vendí esta semana. Es facilísimo de usar.",
    avatar: "RH",
  },
  {
    name: "Carlos Ríos",
    role: "Dueño — Restaurante La Selva Verde",
    location: "La Merced, Junín",
    quote:
      "El módulo de restaurante me cambió la vida. Mis mozos anotan los pedidos desde el celular y cocina ya sabe qué preparar. Cero papel, cero errores.",
    avatar: "CR",
  },
];

const PLAN_FEATURES = [
  "Hasta 3 usuarios incluidos",
  "Inventario ilimitado",
  "POS completo",
  "Exportación PDF y CSV",
  "Soporte por WhatsApp",
  "Módulo restaurante opcional",
];

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

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <header className="fixed top-0 w-full z-50 bg-background/85 backdrop-blur-lg border-b border-border/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center shadow-sm"
              style={{ background: "hsl(var(--sidebar-accent))" }}
            >
              <img
                src={`${BASE}images/camila-logo.png`}
                alt="Camila Logo"
                className="h-4.5 w-4.5 brightness-0 invert"
                style={{ height: "1.1rem", width: "1.1rem" }}
              />
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-primary">Camila</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Funciones</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">Cómo funciona</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Precios</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="font-semibold text-muted-foreground hover:text-primary">
                Ingresar
              </Button>
            </Link>
            <Link href="/register">
              <Button
                size="sm"
                className="font-semibold rounded-full px-5 shadow-sm"
                style={{ background: "hsl(var(--primary))", color: "white" }}
              >
                Crear Tienda
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-16">
        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden pt-20 pb-32 lg:pt-32 lg:pb-44">
          {/* Background layers */}
          <div className="absolute inset-0 -z-10">
            <img
              src={`${BASE}images/hero-bg.png`}
              alt="Selva peruana"
              fetchPriority="high"
              decoding="async"
              className="w-full h-full object-cover opacity-10"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/75 to-background" />
            <div
              className="absolute inset-0 opacity-30"
              style={{
                background:
                  "radial-gradient(ellipse 80% 50% at 50% 0%, hsl(148 65% 22% / 0.15), transparent)",
              }}
            />
          </div>

          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={0}
            >
              <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full text-sm font-semibold mb-8 border"
                style={{
                  background: "hsl(var(--secondary))",
                  borderColor: "hsl(var(--primary) / 0.2)",
                  color: "hsl(var(--primary))",
                }}
              >
                <MapPin className="h-3.5 w-3.5" />
                Diseñado para Chanchamayo y el Mundo 🌿
              </div>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={1}
              className="text-5xl sm:text-6xl lg:text-7xl font-display font-black text-foreground leading-[1.06] tracking-tight mb-6"
            >
              Gestiona tu negocio
              <br />
              <span style={{ color: "hsl(var(--primary))" }}>con tecnología</span>
              <br />
              que entiende la selva.
            </motion.h1>

            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={2}
              className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
            >
              Camila es la plataforma todo-en-uno para tiendas, restaurantes y ferias. Controla tu inventario, registra ventas y crece con datos reales — desde cualquier dispositivo.
            </motion.p>

            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={3}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link href="/register">
                <Button
                  size="lg"
                  className="w-full sm:w-auto text-base px-8 h-13 rounded-full font-bold shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
                  style={{
                    background: "hsl(var(--accent))",
                    color: "hsl(var(--accent-foreground))",
                    boxShadow: "0 8px 24px hsl(var(--accent) / 0.35)",
                  }}
                >
                  Empieza Gratis — 30 días <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto text-base px-8 h-13 rounded-full font-semibold border-2 hover:bg-secondary"
                >
                  Ver cómo funciona
                </Button>
              </a>
            </motion.div>
          </div>

          {/* Stats bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="max-w-3xl mx-auto mt-20 px-4"
          >
            <div
              className="rounded-2xl border px-6 py-5 grid grid-cols-3 divide-x"
              style={{
                background: "hsl(0 0% 100% / 0.7)",
                backdropFilter: "blur(12px)",
                borderColor: "hsl(var(--border))",
                divideColor: "hsl(var(--border))",
              }}
            >
              {[
                { value: "500+", label: "Negocios activos" },
                { value: "S/ 2M+", label: "En ventas registradas" },
                { value: "3", label: "Tipos de negocio soportados" },
              ].map((stat, i) => (
                <div key={i} className="text-center px-4">
                  <p className="text-2xl sm:text-3xl font-display font-black" style={{ color: "hsl(var(--primary))" }}>
                    {stat.value}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 font-medium">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ── Features ──────────────────────────────────────────────────────── */}
        <section id="features" className="py-28 bg-card border-t border-border/60">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-16">
              <span className="inline-block text-sm font-bold uppercase tracking-widest mb-3" style={{ color: "hsl(var(--accent))" }}>
                Funcionalidades
              </span>
              <h2 className="text-4xl md:text-5xl font-display font-black text-foreground mb-4">
                Todo lo que tu negocio necesita
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Sin hojas de cálculo, sin cuadernos. Una sola plataforma para gestionar todo tu negocio desde el celular o la computadora.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07, duration: 0.45 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="group p-7 rounded-2xl bg-background border border-border/60 hover:border-primary/25 transition-all hover:shadow-card-hover cursor-default"
                >
                  <div className={`h-12 w-12 ${f.color} rounded-xl flex items-center justify-center mb-5 group-hover:scale-105 transition-transform`}>
                    <f.icon className={`h-6 w-6 ${f.iconColor}`} />
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-foreground">{f.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────────────── */}
        <section id="how-it-works" className="py-28 bg-background border-t border-border/60">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-16">
              <span className="inline-block text-sm font-bold uppercase tracking-widest mb-3" style={{ color: "hsl(var(--accent))" }}>
                Proceso
              </span>
              <h2 className="text-4xl md:text-5xl font-display font-black text-foreground mb-4">
                Tres pasos y listo
              </h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                No necesitas ser técnico. Si usas WhatsApp, puedes usar Camila.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {STEPS.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12, duration: 0.5 }}
                  className="relative"
                >
                  {i < STEPS.length - 1 && (
                    <div className="hidden md:block absolute top-10 left-full w-full h-px -ml-4 mr-4" style={{ background: "hsl(var(--border))" }}>
                      <ChevronRight className="absolute -top-3 right-2 h-6 w-6 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="text-center md:text-left">
                    <div
                      className="inline-flex h-16 w-16 items-center justify-center rounded-2xl font-display font-black text-2xl mb-5 shadow-sm"
                      style={{
                        background: "hsl(var(--primary))",
                        color: "white",
                      }}
                    >
                      {step.n}
                    </div>
                    <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Testimonials ─────────────────────────────────────────────────── */}
        <section className="py-28 bg-card border-t border-border/60">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-16">
              <span className="inline-block text-sm font-bold uppercase tracking-widest mb-3" style={{ color: "hsl(var(--accent))" }}>
                Testimonios
              </span>
              <h2 className="text-4xl md:text-5xl font-display font-black text-foreground mb-4">
                Lo que dicen nuestros clientes
              </h2>
              <p className="text-lg text-muted-foreground">
                Negocios reales de Chanchamayo usando Camila todos los días.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {TESTIMONIALS.map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.45 }}
                  className="p-8 rounded-2xl bg-background border border-border/60 hover:border-primary/20 transition-colors"
                >
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, s) => (
                      <span key={s} className="text-amber-400 text-lg">★</span>
                    ))}
                  </div>
                  <p className="text-foreground leading-relaxed mb-6 text-base italic">
                    "{t.quote}"
                  </p>
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ background: "hsl(var(--primary))" }}
                    >
                      {t.avatar}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 text-muted-foreground/60" />
                        <p className="text-xs text-muted-foreground/60">{t.location}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ───────────────────────────────────────────────────────── */}
        <section id="pricing" className="py-28 bg-background border-t border-border/60">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-16">
              <span className="inline-block text-sm font-bold uppercase tracking-widest mb-3" style={{ color: "hsl(var(--accent))" }}>
                Precios
              </span>
              <h2 className="text-4xl md:text-5xl font-display font-black text-foreground mb-4">
                Simple y transparente
              </h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Empieza gratis, paga solo cuando estés listo. Sin contratos ni letra chica.
              </p>
            </div>

            <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Free trial */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="p-8 rounded-2xl bg-card border-2 border-border"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-display font-bold text-lg">Prueba Gratuita</h3>
                </div>
                <p className="text-4xl font-display font-black mt-3 mb-1">S/ 0</p>
                <p className="text-sm text-muted-foreground mb-6">por 30 días, sin tarjeta</p>
                <ul className="space-y-2.5 mb-8">
                  {PLAN_FEATURES.map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/register">
                  <Button variant="outline" className="w-full rounded-xl border-2 font-semibold h-11">
                    Empezar gratis
                  </Button>
                </Link>
              </motion.div>

              {/* Monthly */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="p-8 rounded-2xl border-2 relative overflow-hidden"
                style={{
                  background: "hsl(var(--primary))",
                  borderColor: "hsl(var(--primary))",
                }}
              >
                <div
                  className="absolute top-4 right-4 text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ background: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))" }}
                >
                  Popular
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Store className="h-5 w-5 text-white/70" />
                  <h3 className="font-display font-bold text-lg text-white">Plan Mensual</h3>
                </div>
                <p className="text-4xl font-display font-black mt-3 mb-1 text-white">S/ 49</p>
                <p className="text-sm text-white/60 mb-6">por mes / por negocio</p>
                <ul className="space-y-2.5 mb-8">
                  {PLAN_FEATURES.map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-white/80">
                      <CheckCircle2 className="h-4 w-4 text-white/70 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/register">
                  <Button
                    className="w-full rounded-xl font-bold h-11 text-sm"
                    style={{
                      background: "hsl(var(--accent))",
                      color: "hsl(var(--accent-foreground))",
                    }}
                  >
                    Crear mi tienda <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── Final CTA ─────────────────────────────────────────────────────── */}
        <section
          className="py-28 border-t border-border/60"
          style={{
            background:
              "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(150 55% 18%) 100%)",
          }}
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-white/80 text-sm font-semibold mb-6 border border-white/15">
                🌿 Para emprendedores de la selva peruana
              </div>
              <h2 className="text-4xl md:text-5xl font-display font-black text-white mb-5 leading-tight">
                Tu negocio merece una herramienta profesional.
              </h2>
              <p className="text-lg text-white/70 max-w-xl mx-auto mb-10">
                Únete a los emprendedores de Chanchamayo que ya llevan su negocio con Camila. Prueba gratuita por 30 días, sin compromisos.
              </p>
              <Link href="/register">
                <Button
                  size="lg"
                  className="text-base px-10 h-14 rounded-full font-bold shadow-xl transition-all hover:-translate-y-0.5"
                  style={{
                    background: "hsl(var(--accent))",
                    color: "hsl(var(--accent-foreground))",
                    boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
                  }}
                >
                  Crear mi cuenta gratis <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="bg-card border-t border-border/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center"
                  style={{ background: "hsl(var(--primary))" }}
                >
                  <img
                    src={`${BASE}images/camila-logo.png`}
                    alt="Logo"
                    className="h-4 w-4 brightness-0 invert"
                  />
                </div>
                <span className="font-display font-bold text-xl text-primary">Camila</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Software de gestión para negocios locales en la selva peruana.
              </p>
              <p className="text-xs text-muted-foreground/60 mt-3 flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Hecho con ❤️ en Chanchamayo, Perú
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-bold text-sm text-foreground mb-4">Producto</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Funciones</a></li>
                <li><a href="#how-it-works" className="hover:text-foreground transition-colors">Cómo funciona</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Precios</a></li>
              </ul>
            </div>

            {/* Business types */}
            <div>
              <h4 className="font-bold text-sm text-foreground mb-4">Para tu negocio</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><span>Tiendas y bodegas</span></li>
                <li><span>Restaurantes</span></li>
                <li><span>Ferias y mercados</span></li>
                <li><span>Servicios</span></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-bold text-sm text-foreground mb-4">Contacto</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li>San Ramón, Chanchamayo</li>
                <li>Junín, Perú</li>
                <li className="mt-4">
                  <Link href="/register" className="font-semibold text-primary hover:underline">
                    Empieza gratis →
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} Camila SaaS. Todos los derechos reservados.</span>
            <span>Orgullosamente desarrollado para el Perú 🇵🇪</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
