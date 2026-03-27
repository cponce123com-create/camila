import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  useGetAnalyticsSales,
  useGetAnalyticsProducts,
  useGetAnalyticsInventory,
} from "@workspace/api-client-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, TrendingUp, Package, AlertTriangle, RefreshCw, UtensilsCrossed } from "lucide-react";
import { downloadCSV, downloadPDF, formatCurrency, getDefaultDateRange } from "@/lib/export-utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const COLORS = ["#4F46E5", "#7C3AED", "#2563EB", "#0EA5E9", "#10B981", "#F59E0B", "#EF4444"];
const PAYMENT_LABELS: Record<string, string> = {
  cash: "Efectivo", card: "Tarjeta", yape: "Yape",
  plin: "Plin", transfer: "Transferencia", other: "Otro",
};

type TabType = "ventas" | "productos" | "inventario";

export default function AnalyticsPage() {
  const [, navigate] = useLocation();
  const defaultRange = getDefaultDateRange();
  const [tab, setTab] = useState<TabType>("ventas");
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
  const [activeFrom, setActiveFrom] = useState(defaultRange.from);
  const [activeTo, setActiveTo] = useState(defaultRange.to);

  const salesQuery = useGetAnalyticsSales(
    { from: activeFrom, to: activeTo },
    { query: { enabled: tab === "ventas" } }
  );
  const productsQuery = useGetAnalyticsProducts(
    { from: activeFrom, to: activeTo, limit: 10 },
    { query: { enabled: tab === "productos" } }
  );
  const inventoryQuery = useGetAnalyticsInventory({
    query: { enabled: tab === "inventario" },
  });

  const applyDateRange = useCallback(() => {
    setActiveFrom(from);
    setActiveTo(to);
  }, [from, to]);

  const salesData = salesQuery.data;
  const productsData = productsQuery.data;
  const inventoryData = inventoryQuery.data;

  const handleExportSalesCSV = () => {
    if (!salesData) return;
    const headers = ["Fecha", "Ventas (S/)", "Nro. Pedidos"];
    const rows = salesData.trend.map((r) => [r.date, r.revenue.toFixed(2), r.count]);
    downloadCSV(`ventas-${activeFrom}-${activeTo}.csv`, headers, rows);
  };

  const handleExportSalesPDF = () => {
    if (!salesData) return;
    downloadPDF(
      `reporte-ventas-${activeFrom}-${activeTo}.pdf`,
      "Reporte de Ventas",
      `Período: ${activeFrom} al ${activeTo}`,
      [
        {
          heading: "Resumen",
          headers: ["Métrica", "Valor"],
          rows: [
            ["Ingresos totales", formatCurrency(salesData.totals.revenue)],
            ["Nro. de ventas", salesData.totals.count.toString()],
            ["Ticket promedio", formatCurrency(salesData.totals.avgOrder)],
            ["Descuentos totales", formatCurrency(salesData.totals.totalDiscount)],
          ],
        },
        {
          heading: "Tendencia diaria",
          headers: ["Fecha", "Ingresos", "Pedidos"],
          rows: salesData.trend.map((r) => [r.date, formatCurrency(r.revenue), r.count]),
        },
        {
          heading: "Por método de pago",
          headers: ["Método", "Pedidos", "Ingresos"],
          rows: salesData.paymentMethods.map((r) => [
            PAYMENT_LABELS[r.method] ?? r.method,
            r.count,
            formatCurrency(r.revenue),
          ]),
        },
      ]
    );
  };

  const handleExportProductsCSV = () => {
    if (!productsData) return;
    const headers = ["Producto", "Cantidad vendida", "Ingresos (S/)"];
    const rows = productsData.topByQuantity.map((r) => [
      r.productName ?? "—", r.quantity, r.revenue.toFixed(2),
    ]);
    downloadCSV(`productos-${activeFrom}-${activeTo}.csv`, headers, rows);
  };

  const handleExportProductsPDF = () => {
    if (!productsData) return;
    downloadPDF(
      `reporte-productos-${activeFrom}-${activeTo}.pdf`,
      "Reporte de Productos",
      `Período: ${activeFrom} al ${activeTo}`,
      [
        {
          heading: "Top productos por cantidad vendida",
          headers: ["Producto", "Cantidad", "Ingresos"],
          rows: productsData.topByQuantity.map((r) => [
            r.productName ?? "—", r.quantity, formatCurrency(r.revenue),
          ]),
        },
        {
          heading: "Top productos por ingresos",
          headers: ["Producto", "Ingresos", "Cantidad"],
          rows: productsData.topByRevenue.map((r) => [
            r.productName ?? "—", formatCurrency(r.revenue), r.quantity,
          ]),
        },
        {
          heading: "Por categoría",
          headers: ["Categoría", "Cantidad", "Ingresos"],
          rows: productsData.categories.map((r) => [
            r.categoryName, r.quantity, formatCurrency(r.revenue),
          ]),
        },
      ]
    );
  };

  const handleExportInventoryCSV = () => {
    if (!inventoryData) return;
    const headers = ["Producto", "Stock actual", "Stock mínimo", "SKU"];
    const rows = inventoryData.criticalStock.map((r) => [
      r.name, r.stock, r.minStock, r.sku ?? "",
    ]);
    downloadCSV("inventario-critico.csv", headers, rows);
  };

  const handleExportInventoryPDF = () => {
    if (!inventoryData) return;
    downloadPDF(
      "reporte-inventario.pdf",
      "Reporte de Inventario",
      `Generado: ${format(new Date(), "PPP", { locale: es })}`,
      [
        {
          heading: "Stock crítico",
          headers: ["Producto", "Stock", "Stock mínimo", "SKU"],
          rows: inventoryData.criticalStock.map((r) => [r.name, r.stock, r.minStock, r.sku ?? "—"]),
        },
        {
          heading: "Sin stock",
          headers: ["Producto", "SKU"],
          rows: inventoryData.outOfStock.map((r) => [r.name, r.sku ?? "—"]),
        },
        {
          heading: "Rotación (últimos 30 días)",
          headers: ["Producto", "Vendidos", "Stock actual", "Tasa rotación"],
          rows: inventoryData.rotation.map((r) => [
            r.productName ?? "—", r.totalSold, r.currentStock, r.rotationRate.toFixed(2),
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
            <h1 className="text-2xl font-bold text-gray-900">Analítica</h1>
            <p className="text-sm text-gray-500 mt-1">Reportes detallados de tu negocio</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/analytics/restaurant")}>
            <UtensilsCrossed className="h-4 w-4 mr-2" />
            Analítica restaurante
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          {(["ventas", "productos", "inventario"] as TabType[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${
                tab === t ? "bg-white shadow text-indigo-700" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Date range — only show for ventas and productos */}
        {tab !== "inventario" && (
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
        )}

        {/* VENTAS TAB */}
        {tab === "ventas" && (
          <>
            {salesQuery.isLoading && <LoadingState />}
            {salesQuery.isError && <ErrorState />}
            {salesData && (
              <div className="space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <KPICard label="Ingresos totales" value={formatCurrency(salesData.totals.revenue)} icon="💰" color="indigo" />
                  <KPICard label="Ventas realizadas" value={salesData.totals.count.toString()} icon="🧾" color="green" />
                  <KPICard label="Ticket promedio" value={formatCurrency(salesData.totals.avgOrder)} icon="📊" color="blue" />
                  <KPICard label="Descuentos" value={formatCurrency(salesData.totals.totalDiscount)} icon="🏷️" color="amber" />
                </div>

                {/* Trend chart */}
                <div className="bg-white border rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-gray-900">Tendencia de ventas</h2>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={handleExportSalesCSV}>
                        <Download className="h-4 w-4 mr-1" /> CSV
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleExportSalesPDF}>
                        <Download className="h-4 w-4 mr-1" /> PDF
                      </Button>
                    </div>
                  </div>
                  {salesData.trend.length === 0 ? (
                    <EmptyChart />
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <AreaChart data={salesData.trend}>
                        <defs>
                          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `S/${v}`} width={60} />
                        <Tooltip formatter={(v: number) => [formatCurrency(v), "Ingresos"]} labelFormatter={(l) => `Fecha: ${l}`} />
                        <Area type="monotone" dataKey="revenue" stroke="#4F46E5" fill="url(#revGrad)" strokeWidth={2} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Payment methods + Peak hours */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white border rounded-xl p-5">
                    <h2 className="font-semibold text-gray-900 mb-4">Por método de pago</h2>
                    {salesData.paymentMethods.length === 0 ? (
                      <EmptyChart />
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie data={salesData.paymentMethods} dataKey="revenue" nameKey="method" cx="50%" cy="50%" outerRadius={80} label={({ method, percent }) => `${PAYMENT_LABELS[method] ?? method} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                            {salesData.paymentMethods.map((_, i) => (
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
                    <h2 className="font-semibold text-gray-900 mb-4">Horas pico</h2>
                    {salesData.peakHours.length === 0 ? (
                      <EmptyChart />
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={salesData.peakHours}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="hour" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}h`} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v: number) => [v, "Ventas"]} labelFormatter={(l) => `Hora: ${l}:00`} />
                          <Bar dataKey="count" fill="#7C3AED" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* PRODUCTOS TAB */}
        {tab === "productos" && (
          <>
            {productsQuery.isLoading && <LoadingState />}
            {productsQuery.isError && <ErrorState />}
            {productsData && (
              <div className="space-y-6">
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={handleExportProductsCSV}>
                    <Download className="h-4 w-4 mr-1" /> CSV
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleExportProductsPDF}>
                    <Download className="h-4 w-4 mr-1" /> PDF
                  </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Top by quantity */}
                  <div className="bg-white border rounded-xl p-5">
                    <h2 className="font-semibold text-gray-900 mb-4">Más vendidos (por cantidad)</h2>
                    {productsData.topByQuantity.length === 0 ? (
                      <EmptyChart />
                    ) : (
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={productsData.topByQuantity} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 11 }} />
                          <YAxis type="category" dataKey="productName" width={110} tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(v: number) => [v, "Unidades"]} />
                          <Bar dataKey="quantity" fill="#4F46E5" radius={[0, 3, 3, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  {/* Top by revenue */}
                  <div className="bg-white border rounded-xl p-5">
                    <h2 className="font-semibold text-gray-900 mb-4">Más vendidos (por ingresos)</h2>
                    {productsData.topByRevenue.length === 0 ? (
                      <EmptyChart />
                    ) : (
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={productsData.topByRevenue} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `S/${v}`} />
                          <YAxis type="category" dataKey="productName" width={110} tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(v: number) => [formatCurrency(v), "Ingresos"]} />
                          <Bar dataKey="revenue" fill="#10B981" radius={[0, 3, 3, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Categories */}
                {productsData.categories.length > 0 && (
                  <div className="bg-white border rounded-xl p-5">
                    <h2 className="font-semibold text-gray-900 mb-4">Por categoría</h2>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={productsData.categories}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="categoryName" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="quantity" fill="#0EA5E9" radius={[3, 3, 0, 0]} name="Cantidad" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Least sold */}
                {productsData.bottomByQuantity.length > 0 && (
                  <div className="bg-white border rounded-xl p-5">
                    <h2 className="font-semibold text-gray-900 mb-1">Menos vendidos</h2>
                    <p className="text-xs text-gray-500 mb-4">Productos con menor rotación en el período</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-gray-500">
                            <th className="py-2 pr-4 font-medium">Producto</th>
                            <th className="py-2 pr-4 font-medium text-right">Cantidad</th>
                            <th className="py-2 font-medium text-right">Ingresos</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productsData.bottomByQuantity.map((r, i) => (
                            <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                              <td className="py-2 pr-4 text-gray-900">{r.productName ?? "—"}</td>
                              <td className="py-2 pr-4 text-right text-gray-700">{r.quantity}</td>
                              <td className="py-2 text-right text-gray-700">{formatCurrency(r.revenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* INVENTARIO TAB */}
        {tab === "inventario" && (
          <>
            {inventoryQuery.isLoading && <LoadingState />}
            {inventoryQuery.isError && <ErrorState />}
            {inventoryData && (
              <div className="space-y-6">
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={handleExportInventoryCSV}>
                    <Download className="h-4 w-4 mr-1" /> CSV
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleExportInventoryPDF}>
                    <Download className="h-4 w-4 mr-1" /> PDF
                  </Button>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <KPICard label="Productos activos" value={inventoryData.summary.totalActive.toString()} icon="📦" color="blue" />
                  <KPICard label="Stock crítico" value={inventoryData.summary.criticalCount.toString()} icon="⚠️" color="amber" />
                  <KPICard label="Sin stock" value={inventoryData.summary.outOfStockCount.toString()} icon="🚫" color="red" />
                  <KPICard label="Valor del inventario" value={formatCurrency(inventoryData.summary.stockValue)} icon="💵" color="green" />
                </div>

                {/* Critical stock */}
                {inventoryData.criticalStock.length > 0 ? (
                  <div className="bg-white border border-amber-200 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      <h2 className="font-semibold text-gray-900">Stock crítico</h2>
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700">{inventoryData.criticalStock.length}</Badge>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-gray-500">
                            <th className="py-2 pr-4 font-medium">Producto</th>
                            <th className="py-2 pr-4 font-medium">SKU</th>
                            <th className="py-2 pr-4 font-medium text-right">Stock actual</th>
                            <th className="py-2 font-medium text-right">Stock mínimo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inventoryData.criticalStock.map((r) => (
                            <tr key={r.id} className="border-b last:border-0 hover:bg-amber-50">
                              <td className="py-2 pr-4 font-medium text-gray-900">{r.name}</td>
                              <td className="py-2 pr-4 text-gray-500">{r.sku ?? "—"}</td>
                              <td className="py-2 pr-4 text-right">
                                <span className="text-amber-600 font-semibold">{r.stock} {r.unit ?? ""}</span>
                              </td>
                              <td className="py-2 text-right text-gray-500">{r.minStock} {r.unit ?? ""}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                    <Package className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-green-700 font-medium">¡Todo en orden!</p>
                    <p className="text-green-600 text-sm">No hay productos con stock crítico.</p>
                  </div>
                )}

                {/* Out of stock */}
                {inventoryData.outOfStock.length > 0 && (
                  <div className="bg-white border border-red-200 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <h2 className="font-semibold text-gray-900">Sin stock</h2>
                      <Badge variant="secondary" className="bg-red-100 text-red-700">{inventoryData.outOfStock.length}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {inventoryData.outOfStock.map((r) => (
                        <Badge key={r.id} variant="outline" className="text-red-600 border-red-200">{r.name}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rotation */}
                {inventoryData.rotation.length > 0 && (
                  <div className="bg-white border rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="h-5 w-5 text-indigo-500" />
                      <h2 className="font-semibold text-gray-900">Rotación de inventario (últimos 30 días)</h2>
                    </div>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={inventoryData.rotation.slice(0, 10)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="productName" width={120} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v: number) => [v, "Unidades vendidas"]} />
                        <Bar dataKey="totalSold" fill="#4F46E5" radius={[0, 3, 3, 0]} name="Vendidos" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function KPICard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  const colorMap: Record<string, string> = {
    indigo: "border-indigo-100 bg-indigo-50",
    green: "border-green-100 bg-green-50",
    blue: "border-blue-100 bg-blue-50",
    amber: "border-amber-100 bg-amber-50",
    red: "border-red-100 bg-red-50",
  };
  return (
    <div className={`border rounded-xl p-4 ${colorMap[color] ?? "bg-white border-gray-200"}`}>
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
