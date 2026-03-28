import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Check, Star, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Plan {
  id: string;
  name: string;
  amount: number;
  days: number;
  savings: number | null;
  popular: boolean;
  description: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  "Productos y categorías ilimitados",
  "Tienda pública con URL propia",
  "Punto de venta (POS) integrado",
  "Control de inventario",
  "Analytics y reportes",
  "Soporte por WhatsApp",
];

const FAQS = [
  {
    q: "¿Puedo cancelar cuando quiera?",
    a: "Sí. No hay contratos ni compromisos. Al vencer tu plan simplemente no se renueva y tu tienda queda en pausa. Puedes reactivarla en cualquier momento comprando un nuevo plan.",
  },
  {
    q: "¿Qué pasa cuando vence mi licencia?",
    a: "Tu panel y tienda pública se pausan temporalmente. Tus datos quedan guardados durante 90 días. Al renovar todo vuelve a funcionar exactamente como lo dejaste.",
  },
  {
    q: "¿Aceptan Yape, Plin u otros pagos locales?",
    a: "Actualmente aceptamos tarjetas de débito y crédito (Visa, Mastercard) a través de Culqi. Estamos trabajando para agregar Yape y otros métodos de pago locales próximamente.",
  },
  {
    q: "¿Tienen soporte en español?",
    a: "Sí, nuestro equipo está en San Ramón, Chanchamayo. Te respondemos por WhatsApp en horario de oficina de lunes a sábado de 8 am a 6 pm.",
  },
];

// ─── Subcomponents ────────────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-200 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left gap-4 group"
      >
        <span className="font-semibold text-gray-900 group-hover:text-[#1a5c2e] transition-colors">
          {q}
        </span>
        {open ? (
          <ChevronUp className="w-5 h-5 text-[#1a5c2e] shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
        )}
      </button>
      {open && (
        <p className="pb-5 text-gray-600 text-sm leading-relaxed">{a}</p>
      )}
    </div>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  const soles = plan.amount / 100;
  const isPopular = plan.popular;

  return (
    <div
      className={`relative flex flex-col rounded-2xl border-2 bg-white p-7 shadow-sm transition-shadow hover:shadow-md ${
        isPopular ? "border-[#1a5c2e] shadow-md" : "border-gray-200"
      }`}
    >
      {isPopular && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1a5c2e] px-3.5 py-1 text-xs font-bold text-white shadow">
            <Star className="w-3 h-3 fill-white" />
            Más popular
          </span>
        </div>
      )}

      <div className="mb-5">
        <p className="text-sm font-semibold uppercase tracking-widest text-[#1a5c2e] mb-1">
          {plan.name}
        </p>
        <div className="flex items-end gap-1">
          <span className="text-4xl font-extrabold text-gray-900">
            S/{soles.toFixed(0)}
          </span>
          <span className="text-gray-500 mb-1.5 text-sm">
            /{plan.days === 30 ? "mes" : plan.days === 90 ? "trimestre" : plan.days === 180 ? "semestre" : "año"}
          </span>
        </div>
        <p className="text-gray-500 text-sm mt-1">{plan.description}</p>
        {plan.savings !== null && (
          <span className="inline-block mt-2 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
            Ahorra {plan.savings}%
          </span>
        )}
      </div>

      <ul className="space-y-2.5 flex-1 mb-7">
        {FEATURES.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-gray-700">
            <Check className="w-4 h-4 text-[#1a5c2e] mt-0.5 shrink-0" />
            {f}
          </li>
        ))}
      </ul>

      <Link href="/register">
        <Button
          className={`w-full font-semibold ${
            isPopular
              ? "bg-[#1a5c2e] hover:bg-[#154a24] text-white"
              : "bg-white border-2 border-[#1a5c2e] text-[#1a5c2e] hover:bg-[#1a5c2e] hover:text-white"
          }`}
          variant={isPopular ? "default" : "outline"}
        >
          Empezar gratis
        </Button>
      </Link>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");

  const { data: plans, isLoading } = useQuery<Plan[]>({
    queryKey: ["plans"],
    queryFn: async () => {
      const res = await fetch(`${base}/api/payments/plans`);
      if (!res.ok) throw new Error("Error al cargar planes");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="min-h-screen bg-[#f9fbf9] text-gray-900">
      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/">
            <span className="text-xl font-extrabold text-[#1a5c2e] tracking-tight cursor-pointer">
              Camila
            </span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/">
              <span className="text-sm font-medium text-gray-600 hover:text-[#1a5c2e] transition-colors cursor-pointer">
                Inicio
              </span>
            </Link>
            <Link href="/register">
              <Button
                size="sm"
                className="bg-[#1a5c2e] hover:bg-[#154a24] text-white font-semibold"
              >
                Registrarse
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-6 pt-20 pb-12 text-center">
        <span className="inline-block rounded-full bg-green-100 px-4 py-1 text-xs font-semibold text-green-800 mb-5">
          30 días gratis · Sin tarjeta de crédito
        </span>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-5">
          Planes para tu{" "}
          <span className="text-[#1a5c2e]">negocio</span>
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto">
          Empieza gratis 30 días, sin tarjeta de crédito. Elige el plan que mejor se adapte a tu negocio después.
        </p>
      </section>

      {/* ── Plans grid ──────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-96 rounded-2xl bg-gray-100 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start pt-6">
            {(plans ?? []).map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        )}

        <p className="mt-10 text-center text-sm text-gray-400">
          Todos los precios incluyen IGV · Pagos procesados de forma segura por{" "}
          <span className="font-semibold text-gray-500">Culqi</span>
        </p>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────── */}
      <section className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-2xl px-6 py-20">
          <h2 className="text-2xl font-extrabold text-gray-900 mb-10 text-center">
            Preguntas frecuentes
          </h2>
          <div>
            {FAQS.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-200 bg-[#f9fbf9]">
        <div className="mx-auto max-w-6xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xl font-extrabold text-[#1a5c2e] tracking-tight">
            Camila
          </span>
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} Camila · San Ramón, Chanchamayo, Perú
          </p>
          <div className="flex gap-5 text-sm text-gray-500">
            <Link href="/">
              <span className="hover:text-[#1a5c2e] transition-colors cursor-pointer">Inicio</span>
            </Link>
            <Link href="/register">
              <span className="hover:text-[#1a5c2e] transition-colors cursor-pointer">Registrarse</span>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
