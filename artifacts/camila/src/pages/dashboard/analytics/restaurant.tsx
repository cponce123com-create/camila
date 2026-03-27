import { useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useGetRestaurantAnalytics } from "@workspace/api-client-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Loader2, Download, AlertTriangle, RefreshCw } from "lucide-react";
import { downloadCSV, downloadPDF, formatCurrency, getDefaultDateRange } from "@/lib/export-utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const COLORS = ["#4F46E5", "#7C3AED", "#2563EB", "#0EA5E9", "#10B981", "#F59E0B", "#EF4444"];
const PAYMENT_LABELS: Record<string, string> = {
  cash: "Efectivo", card: "Tarjeta", yape: "Yape",
  plin: "Plin", transfer: "Transferencia", other: "Otro",
};

export default function RestaurantAnalyticsPage() {
  const defaultRange = getDefaultDateRange();
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
  const [activeFrom, setActiveFrom] = useState(defaultRange.from);
  const [activeTo, setActiveTo] = useState(defaultRange.to);

  const query = useGetRestaurantAnalytics({ from: activeFrom, to: activeTo });
  const data = query.data;

  const applyDateRange = useCallback(() => {
    setActiveFrom(from);
    setActiveTo(to);
  }, [from, to]);

  const handleExportCSV = () => {
    if (!data) return;
    downloadCSV(
      `restaurante-${activeFrom}-${activeTo}.csv`,
      ["Mesa", "Pedidos", "Ingresos (S/)", "Ticket promedio (S/)"],
      data.topTables.map((r) => [r.tableName, r.ordersCount, r.revenue.toFixed(2), r.avgTicket.toFixed(2)])
    );
  };

  const handleExportPDF = () => {
    if (!data) return;
    downloadPDF(
      `reporte-restaurante-${activeFrom}-${activeTo}.pdf`,
      "Reporte de Restaurante",
      `Período: ${activeFrom} al ${activeTo}`,
      [
        {
          heading: "Resumen del período",
          headers: ["Métrica", "Valor"],
          rows: [
            ["Total pedidos", data.totals.ordersCount.toString()],
            ["Ingresos totales", formatCurrency(data.totals.revenue)],
            ["Ticket promedio", formatCurrency(data.totals.avgTicket)],
            ["Tiempo servicio promedio", `${data.totals.avgServiceMinutes.toFixed(0)} min`],
            ["Comensales promedio", data.totals.avgGuests.toFixed(1)],
          ],
        },
        {
          heading: "Mesas más activas",
          headers: ["Mesa", "Pedidos", "Ingresos", "Ticket promedio"],
          rows: data.topTables.map((r) => [
            r.tableName, r.ordersCount, formatCurrency(r.revenue), formatCurrency(r.avgTicket),
          ]),
        },
        {
          heading: "Platos más vendidos",
          headers: ["Plato", "Cantidad", "Ingresos"],
          rows: data.topDishes.map((r) => [
            r.productName ?? "—", r.quantity, formatCurrency(r.revenue),
          ]),
        },
      ]
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analítica del Restaurante</h1>
            <p className="text-sm text-gray-500 mt-1">Desempeño de mesas, platos y servicio</p>
          </div>
        </div>

        {/* Date range */}
        <div className="flex flex-wrap items-end gap-3 bg-white border rounded-xl p-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Desde</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Hasta</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <Button size="sm" onClick={applyDateRange} className="bg-indigo-600 hover:bg-indigo-700">
            <RefreshCw className="h-4 w-4 mr-2" />
            Aplicar
          </Button>
        </div>

        {query.isLoading && <LoadingState />}
        {query.isError && <ErrorState />}

        {data && (
          <div className="space-y-6">
            {/* Export buttons */}
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-1" /> CSV
              </Button>
              <Button size="sm" variant="outline" onClick={handleExportPDF}>
                <Download className="h-4 w-4 mr-1" /> PDF
              </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <KPICard label="Pedidos" value={data.totals.ordersCount.toString()} icon="🧾" />
              <KPICard label="Ingresos" value={formatCurrency(data.totals.revenue)} icon="💰" />
              <KPICard label="Ticket promedio" value={formatCurrency(data.totals.avgTicket)} icon="📊" />
              <KPICard label="Tiempo servicio" value={`${data.totals.avgServiceMinutes.toFixed(0)} min`} icon="⏱️" />
              <KPICard label="Comensales prom." value={data.totals.avgGuests.toFixed(1)} icon="👥" />
            </div>

            {/* Trend chart */}
            <div className="bg-white border rounded-xl p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Tendencia de ventas</h2>
              {data.trend.length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={data.trend}>
                    <defs>
                      <linearGradient id="restGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `S/${v}`} width={60} />
                    <Tooltip formatter={(v: number) => [formatCurrency(v), "Ingresos"]} />
                    <Area type="monotone" dataKey="revenue" stroke="#7C3AED" fill="url(#restGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Top tables + Top dishes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border rounded-xl p-5">
                <h2 className="font-semibold text-gray-900 mb-4">Mesas más activas</h2>
                {data.topTables.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={data.topTables} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="tableName" width={80} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => [v, "Pedidos"]} />
                      <Bar dataKey="ordersCount" fill="#4F46E5" radius={[0, 3, 3, 0]} name="Pedidos" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="bg-white border rounded-xl p-5">
                <h2 className="font-semibold text-gray-900 mb-4">Platos más vendidos</h2>
                {data.topDishes.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={data.topDishes} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="productName" width={110} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => [v, "Unidades"]} />
                      <Bar dataKey="quantity" fill="#10B981" radius={[0, 3, 3, 0]} name="Unidades" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Payment methods + Service by hour */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border rounded-xl p-5">
                <h2 className="font-semibold text-gray-900 mb-4">Métodos de pago</h2>
                {data.paymentMethods.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={data.paymentMethods} dataKey="revenue" nameKey="method" cx="50%" cy="50%" outerRadius={80} label={({ method, percent }) => `${PAYMENT_LABELS[method] ?? method} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {data.paymentMethods.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => [formatCurrency(v), "Ingresos"]} />
                      <Legend formatter={(v) => PAYMENT_LABELS[v] ?? v} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="bg-white border rounded-xl p-5">
                <h2 className="font-semibold text-gray-900 mb-4">Tiempo de servicio por hora</h2>
                {data.serviceByHour.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.serviceByHour}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="hour" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}h`} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}m`} />
                      <Tooltip formatter={(v: number) => [`${v.toFixed(0)} min`, "Tiempo promedio"]} labelFormatter={(l) => `Hora: ${l}:00`} />
                      <Bar dataKey="avgMinutes" fill="#F59E0B" radius={[3, 3, 0, 0]} name="Tiempo (min)" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function KPICard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="border rounded-xl p-4 bg-white">
      <div className="text-xl mb-1">{icon}</div>
      <div className="text-lg font-bold text-gray-900 truncate">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
    </div>
  );
}

function ErrorState() {
  return (
    <div className="text-center py-16 text-gray-400">
      <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-red-400" />
      <p className="font-medium">No se pudo cargar la analítica</p>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-40 text-gray-400">
      <p className="text-sm">Sin datos para el período seleccionado</p>
    </div>
  );
}
