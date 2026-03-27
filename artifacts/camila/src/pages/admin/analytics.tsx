import { AdminLayout } from "@/components/layout/admin-layout";
import { useGetAdminAnalytics } from "@workspace/api-client-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Loader2, Download, AlertTriangle, TrendingUp, Store, BarChart2 } from "lucide-react";
import { downloadPDF, downloadCSV, formatCurrency } from "@/lib/export-utils";

const COLORS = ["#4F46E5", "#7C3AED", "#2563EB", "#0EA5E9", "#10B981", "#F59E0B", "#EF4444", "#EC4899"];

const STATUS_LABELS: Record<string, string> = {
  active: "Activa",
  inactive: "Inactiva",
  suspended: "Suspendida",
  trial: "Prueba",
};

const PLAN_LABELS: Record<string, string> = {
  trial: "Prueba",
  monthly: "Mensual",
  quarterly: "Trimestral",
  semi_annual: "Semestral",
  annual: "Anual",
  free: "Gratuito",
};

const BUSINESS_LABELS: Record<string, string> = {
  store: "Tienda",
  restaurant: "Restaurante",
  both: "Tienda + Rest.",
};

export default function AdminAnalyticsPage() {
  const query = useGetAdminAnalytics();
  const data = query.data;

  const handleExportCSV = () => {
    if (!data) return;
    downloadCSV(
      "admin-analytics.csv",
      ["Tipo de negocio", "Cantidad"],
      data.byBusinessType.map((r) => [BUSINESS_LABELS[r.businessType ?? ""] ?? r.businessType ?? "Otro", r.count])
    );
  };

  const handleExportPDF = () => {
    if (!data) return;
    downloadPDF(
      "reporte-admin-global.pdf",
      "Analítica Global",
      `Generado: ${new Date().toLocaleDateString("es-PE")}`,
      [
        {
          heading: "Resumen global",
          headers: ["Métrica", "Valor"],
          rows: [
            ["Nuevas tiendas (30 días)", data.newStores30days.toString()],
            ["Total ventas en plataforma", formatCurrency(data.totalSalesAmount)],
            ["Total pedidos en plataforma", data.totalSalesCount.toString()],
          ],
        },
        {
          heading: "Por tipo de negocio",
          headers: ["Tipo", "Cantidad"],
          rows: data.byBusinessType.map((r) => [
            BUSINESS_LABELS[r.businessType ?? ""] ?? r.businessType ?? "Otro",
            r.count,
          ]),
        },
        {
          heading: "Por estado de licencia",
          headers: ["Estado", "Cantidad"],
          rows: data.licenseStatus.map((r) => [STATUS_LABELS[r.status ?? ""] ?? r.status ?? "—", r.count]),
        },
        {
          heading: "Por plan de licencia",
          headers: ["Plan", "Cantidad"],
          rows: data.licensePlan.map((r) => [PLAN_LABELS[r.plan ?? ""] ?? r.plan ?? "—", r.count]),
        },
        {
          heading: "Por distrito",
          headers: ["Distrito", "Tiendas"],
          rows: data.byDistrict.map((r) => [r.district, r.count]),
        },
        {
          heading: "Top tiendas (últimos 30 días)",
          headers: ["Tienda", "Ingresos", "Pedidos"],
          rows: data.topStores.map((r) => [r.storeName, formatCurrency(r.revenue), r.ordersCount]),
        },
      ]
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analítica Global</h1>
            <p className="text-sm text-gray-500 mt-1">Métricas de toda la plataforma</p>
          </div>
          {data && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-1" /> CSV
              </Button>
              <Button size="sm" variant="outline" onClick={handleExportPDF}>
                <Download className="h-4 w-4 mr-1" /> PDF
              </Button>
            </div>
          )}
        </div>

        {query.isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        )}

        {query.isError && (
          <div className="text-center py-16 text-gray-400">
            <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-red-400" />
            <p className="font-medium">No se pudo cargar la analítica</p>
          </div>
        )}

        {data && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard label="Nuevas tiendas (30d)" value={data.newStores30days.toString()} icon={<Store className="h-5 w-5 text-indigo-500" />} color="indigo" />
              <KPICard label="Total ventas plataforma" value={formatCurrency(data.totalSalesAmount)} icon={<TrendingUp className="h-5 w-5 text-green-500" />} color="green" />
              <KPICard label="Total pedidos" value={data.totalSalesCount.toLocaleString()} icon={<BarChart2 className="h-5 w-5 text-blue-500" />} color="blue" />
              <KPICard label="Top tiendas activas" value={data.topStores.length.toString()} icon={<Store className="h-5 w-5 text-amber-500" />} color="amber" />
            </div>

            {/* Monthly Growth */}
            <div className="bg-white border rounded-xl p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Crecimiento de tiendas (12 meses)</h2>
              {data.monthlyGrowth.length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={data.monthlyGrowth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} tickFormatter={(v) => v?.slice(5) ?? v} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip formatter={(v: number) => [v, "Tiendas registradas"]} />
                    <Line type="monotone" dataKey="stores" stroke="#4F46E5" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Business type + License status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border rounded-xl p-5">
                <h2 className="font-semibold text-gray-900 mb-4">Por tipo de negocio</h2>
                {data.byBusinessType.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={data.byBusinessType}
                        dataKey="count"
                        nameKey="businessType"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ businessType, percent }) =>
                          `${BUSINESS_LABELS[businessType ?? ""] ?? businessType ?? "Otro"} ${(percent * 100).toFixed(0)}%`
                        }
                        labelLine={false}
                      >
                        {data.byBusinessType.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => [v, "Tiendas"]} />
                      <Legend formatter={(v) => BUSINESS_LABELS[v] ?? v} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="bg-white border rounded-xl p-5">
                <h2 className="font-semibold text-gray-900 mb-4">Estado de licencias</h2>
                {data.licenseStatus.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={data.licenseStatus}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ status, percent }) =>
                          `${STATUS_LABELS[status ?? ""] ?? status ?? "—"} ${(percent * 100).toFixed(0)}%`
                        }
                        labelLine={false}
                      >
                        {data.licenseStatus.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => [v, "Licencias"]} />
                      <Legend formatter={(v) => STATUS_LABELS[v] ?? v} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* License plans + Districts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border rounded-xl p-5">
                <h2 className="font-semibold text-gray-900 mb-4">Distribución de planes</h2>
                {data.licensePlan.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.licensePlan}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="plan" tick={{ fontSize: 11 }} tickFormatter={(v) => PLAN_LABELS[v] ?? v} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip formatter={(v: number) => [v, "Tiendas"]} labelFormatter={(l) => PLAN_LABELS[l] ?? l} />
                      <Bar dataKey="count" fill="#7C3AED" radius={[3, 3, 0, 0]} name="Tiendas" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="bg-white border rounded-xl p-5">
                <h2 className="font-semibold text-gray-900 mb-4">Top distritos</h2>
                {data.byDistrict.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.byDistrict.slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="district" width={100} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => [v, "Tiendas"]} />
                      <Bar dataKey="count" fill="#0EA5E9" radius={[0, 3, 3, 0]} name="Tiendas" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Top stores table */}
            {data.topStores.length > 0 && (
              <div className="bg-white border rounded-xl p-5">
                <h2 className="font-semibold text-gray-900 mb-4">Tiendas con más ventas (últimos 30 días)</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
                        <th className="py-2 pr-4 font-medium">#</th>
                        <th className="py-2 pr-4 font-medium">Tienda</th>
                        <th className="py-2 pr-4 font-medium text-right">Ingresos</th>
                        <th className="py-2 font-medium text-right">Pedidos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topStores.map((r, i) => (
                        <tr key={r.storeId} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="py-2 pr-4 text-gray-400 font-medium">{i + 1}</td>
                          <td className="py-2 pr-4 font-medium text-gray-900">{r.storeName}</td>
                          <td className="py-2 pr-4 text-right text-indigo-600 font-semibold">{formatCurrency(r.revenue)}</td>
                          <td className="py-2 text-right text-gray-700">{r.ordersCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function KPICard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  const colorMap: Record<string, string> = {
    indigo: "border-indigo-100 bg-indigo-50",
    green: "border-green-100 bg-green-50",
    blue: "border-blue-100 bg-blue-50",
    amber: "border-amber-100 bg-amber-50",
  };
  return (
    <div className={`border rounded-xl p-4 ${colorMap[color] ?? "bg-white border-gray-200"}`}>
      <div className="mb-1">{icon}</div>
      <div className="text-xl font-bold text-gray-900 truncate">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-40 text-gray-400">
      <p className="text-sm">Sin datos disponibles</p>
    </div>
  );
}
