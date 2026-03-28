import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2, Clock, XCircle, ShieldOff, Star, Loader2,
  Zap, Calendar, CreditCard, TrendingUp, Ticket,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(cents: number) {
  return `S/ ${(cents / 100).toFixed(2)}`;
}

function licenseStatusBadge(status: string) {
  switch (status) {
    case "active":    return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 border"><CheckCircle2 className="w-3 h-3 mr-1" />Activa</Badge>;
    case "trial":     return <Badge className="bg-blue-50 text-blue-700 border-blue-200 border"><Clock className="w-3 h-3 mr-1" />Prueba</Badge>;
    case "expired":   return <Badge className="bg-red-50 text-red-700 border-red-200 border"><XCircle className="w-3 h-3 mr-1" />Vencida</Badge>;
    case "suspended": return <Badge className="bg-gray-50 text-gray-600 border-gray-200 border"><ShieldOff className="w-3 h-3 mr-1" />Suspendida</Badge>;
    default:          return <Badge variant="outline">{status}</Badge>;
  }
}

function planLabel(plan: string) {
  const labels: Record<string, string> = {
    trial: "Prueba gratuita", monthly: "Mensual", quarterly: "Trimestral",
    semi_annual: "Semestral", annual: "Anual", free: "Gratuito",
  };
  return labels[plan] ?? plan;
}

// ─── Culqi Loader ─────────────────────────────────────────────────────────────

function loadCulqiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).Culqi) { resolve(); return; }
    const existing = document.getElementById("culqi-js");
    if (existing) { resolve(); return; }
    const script = document.createElement("script");
    script.id = "culqi-js";
    script.src = "https://checkout.culqi.com/js/v4";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("No se pudo cargar Culqi"));
    document.head.appendChild(script);
  });
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useGetPlans() {
  return useQuery<Plan[]>({
    queryKey: ["/api/payments/plans"],
    queryFn: async () => {
      const r = await fetch("/api/payments/plans");
      if (!r.ok) throw new Error("Error al cargar planes");
      return r.json();
    },
    staleTime: 1000 * 60 * 30,
  });
}

function useRedeemCode() {
  return useMutation<
    { success: boolean; license: Record<string, unknown>; message: string },
    Error,
    { code: string }
  >({
    mutationFn: async ({ code }) => {
      const r = await fetch("/api/payments/redeem-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Error al canjear el código");
      return data;
    },
  });
}

function useCreateCharge() {
  return useMutation<
    { success: boolean; license: Record<string, unknown> },
    Error,
    { token: string; plan: string }
  >({
    mutationFn: async ({ token, plan }) => {
      const r = await fetch("/api/payments/create-charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, plan }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Error al procesar el pago");
      return data;
    },
  });
}

// ─── BillingPage ──────────────────────────────────────────────────────────────

export default function BillingPage() {
  const { user, license } = useAuth();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { data: plans, isLoading: plansLoading } = useGetPlans();
  const createCharge = useCreateCharge();
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const resolveRef = useRef<((token: string) => void) | null>(null);
  const rejectRef = useRef<((err: Error) => void) | null>(null);

  // ── Set up global Culqi callback ────────────────────────────────────────────
  useEffect(() => {
    (window as any).culqi = () => {
      const culqi = (window as any).Culqi;
      if (culqi.token) {
        resolveRef.current?.(culqi.token.id as string);
        resolveRef.current = null;
        rejectRef.current = null;
      } else if (culqi.error) {
        const msg =
          (culqi.error as any).user_message ||
          (culqi.error as any).merchant_message ||
          "Error en el pago";
        rejectRef.current?.(new Error(msg));
        resolveRef.current = null;
        rejectRef.current = null;
      }
    };
    return () => {
      delete (window as any).culqi;
    };
  }, []);

  // ── Open checkout and wait for token ────────────────────────────────────────
  function openCulqiCheckout(plan: Plan): Promise<string> {
    return new Promise(async (resolve, reject) => {
      const publicKey = import.meta.env.VITE_CULQI_PUBLIC_KEY as string;
      if (!publicKey) {
        reject(new Error("Pasarela de pagos no configurada"));
        return;
      }
      try {
        await loadCulqiScript();
        const culqi = (window as any).Culqi;
        culqi.publicKey = publicKey;
        culqi.settings({
          title: "Camila",
          currency: "PEN",
          description: `Plan ${plan.name}`,
          amount: plan.amount,
        });
        culqi.options({ lang: "es", installments: false, modal: true });
        culqi.open();
        resolveRef.current = resolve;
        rejectRef.current = reject;
      } catch (err: any) {
        reject(err);
      }
    });
  }

  // ── Handle plan selection ────────────────────────────────────────────────────
  async function handleSelectPlan(plan: Plan) {
    setProcessingPlan(plan.id);
    try {
      const token = await openCulqiCheckout(plan);
      const result = await createCharge.mutateAsync({ token, plan: plan.id });
      if (result.success) {
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/payments/plans"] });
        toast({ title: "¡Pago exitoso!", description: `Plan ${plan.name} activado correctamente.` });
        navigate("/dashboard");
      }
    } catch (err: any) {
      const msg = err?.message || "Error inesperado";
      toast({ title: "Error en el pago", description: msg, variant: "destructive" });
    } finally {
      setProcessingPlan(null);
    }
  }

  const isSuperAdmin = user?.role === "superadmin";
  const redeemCode = useRedeemCode();
  const [codeInput, setCodeInput] = useState("");

  async function handleRedeemCode() {
    const trimmed = codeInput.trim().toUpperCase();
    if (!trimmed) return;
    try {
      const result = await redeemCode.mutateAsync({ code: trimmed });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "¡Licencia activada!", description: result.message });
      setCodeInput("");
    } catch (err: any) {
      toast({ title: "Error al canjear", description: err.message, variant: "destructive" });
    }
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Facturación</h1>
        <p className="text-muted-foreground">Administra tu plan y licencia.</p>
      </div>

      <div className="max-w-4xl space-y-8">
        {/* ── Current Plan ─────────────────────────────────────────────────── */}
        <Card className="border-border/50 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" /> Plan Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            {license ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-semibold">{planLabel(license.plan ?? "trial")}</span>
                    {licenseStatusBadge(license.status ?? "trial")}
                  </div>
                  {license.expiresAt && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      Vence el{" "}
                      <span className="font-medium text-foreground">
                        {format(parseISO(license.expiresAt as string), "d 'de' MMMM yyyy", { locale: es })}
                      </span>
                    </p>
                  )}
                  {!license.expiresAt && (
                    <p className="text-sm text-muted-foreground">Sin fecha de vencimiento configurada</p>
                  )}
                </div>
                {(license.status === "expired" || license.status === "suspended" || license.status === "trial") && !isSuperAdmin && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800 max-w-xs">
                    {license.status === "trial"
                      ? "Estás en período de prueba. Activa un plan para continuar."
                      : "Tu acceso está limitado. Renueva tu plan para continuar."}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Sin información de licencia.</p>
            )}
          </CardContent>
        </Card>

        {/* ── Plans ────────────────────────────────────────────────────────── */}
        <div>
          <h2 className="text-xl font-display font-semibold mb-1">Planes Disponibles</h2>
          <p className="text-sm text-muted-foreground mb-5">Elige el plan que mejor se adapte a tu negocio.</p>

          {plansLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(plans ?? []).map((plan) => {
                const isProcessing = processingPlan === plan.id;
                const isAnyProcessing = processingPlan !== null;
                const monthlyEquiv = plan.amount / (plan.days / 30);
                return (
                  <div
                    key={plan.id}
                    className={`relative rounded-2xl border p-5 flex flex-col gap-4 transition-all ${
                      plan.popular
                        ? "border-primary shadow-lg shadow-primary/10 bg-primary/[0.02]"
                        : "border-border/60 bg-card hover:border-primary/30 hover:shadow-md"
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="flex items-center gap-1 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full shadow">
                          <Star className="w-3 h-3" /> Más popular
                        </span>
                      </div>
                    )}

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{plan.name}</p>
                      <p className="text-3xl font-display font-bold text-foreground mt-1">
                        {fmt(plan.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>
                    </div>

                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <TrendingUp className="w-3 h-3 text-primary/70" />
                        ~{fmt(Math.round(monthlyEquiv))}/mes
                      </div>
                      {plan.savings && (
                        <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
                          <Zap className="w-3 h-3" />
                          Ahorra {plan.savings}% vs mensual
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="w-3 h-3 text-primary/70" />
                        {plan.days} días de acceso total
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="w-3 h-3 text-primary/70" />
                        Todas las funciones incluidas
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="w-3 h-3 text-primary/70" />
                        Soporte prioritario
                      </div>
                    </div>

                    <Button
                      className={`w-full rounded-xl h-10 ${plan.popular ? "" : "variant-outline"}`}
                      variant={plan.popular ? "default" : "outline"}
                      onClick={() => handleSelectPlan(plan)}
                      disabled={isAnyProcessing}
                    >
                      {isProcessing ? (
                        <><Loader2 className="animate-spin w-4 h-4 mr-2" />Procesando…</>
                      ) : (
                        "Elegir plan"
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Redeem Code ──────────────────────────────────────────────────── */}
        {!isSuperAdmin && (
          <Card className="border-border/50 shadow-sm rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="font-display flex items-center gap-2 text-base">
                <Ticket className="w-4 h-4 text-primary" /> ¿Tienes un código?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Si recibiste un código de licencia, ingrésalo aquí para activar o extender tu plan.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="CAMILA-2026-XXXX"
                  value={codeInput}
                  onChange={e => setCodeInput(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === "Enter" && handleRedeemCode()}
                  className="font-mono tracking-wider"
                  disabled={redeemCode.isPending}
                />
                <Button
                  onClick={handleRedeemCode}
                  disabled={!codeInput.trim() || redeemCode.isPending}
                  className="shrink-0"
                >
                  {redeemCode.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Canjeando…</>
                  ) : (
                    "Canjear"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Notes ────────────────────────────────────────────────────────── */}
        <div className="text-xs text-muted-foreground space-y-1 pb-4">
          <p>• Los precios incluyen IGV. El pago se procesa de forma segura mediante Culqi.</p>
          <p>• Al completar el pago tu licencia se activa de inmediato por la duración del plan elegido.</p>
          <p>• Para soporte con pagos escribe a soporte@camila.pe o por WhatsApp.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
