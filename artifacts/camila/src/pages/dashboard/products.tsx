import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  useGetProducts, useCreateProduct, useDeleteProduct, useGetCategories,
  useUpdateProduct, useGetProduct, useExportProducts, useImportProducts,
} from "@workspace/api-client-react";
import type { Product } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Search, Plus, Trash2, Edit, PackageX, Loader2, Star, Download,
  Upload, Tag, Filter, ChevronDown, MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const SORT_OPTIONS = [
  { value: "name", label: "Nombre" },
  { value: "price", label: "Precio" },
  { value: "stock", label: "Stock" },
  { value: "createdAt", label: "Fecha" },
];

const EMPTY_FORM = {
  name: "", description: "", longDescription: "", price: "", salePrice: "",
  costPrice: "", categoryId: "", sku: "", barcode: "", imageUrl: "",
  stock: "0", minStock: "0", unit: "unidad", isActive: true, isFeatured: false,
  tags: "",
};

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterActive, setFilterActive] = useState<"" | "true" | "false">("");
  const [filterFeatured, setFilterFeatured] = useState<"" | "true" | "false">("");
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importUpdateExisting, setImportUpdateExisting] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const queryParams = {
    search: search || undefined,
    categoryId: filterCategory || undefined,
    isActive: filterActive ? filterActive === "true" : undefined,
    isFeatured: filterFeatured ? filterFeatured === "true" : undefined,
    sortBy,
    sortDir,
    page,
    limit: 20,
  };

  const { data: productsData, isLoading } = useGetProducts(queryParams);
  const { data: categories } = useGetCategories();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();
  const importMutation = useImportProducts();
  const { data: exportData, refetch: doExport, isFetching: isExporting } = useExportProducts(
    {}, { query: { enabled: false } }
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/products"] });
  };

  const openCreate = () => {
    setEditingId(null);
    setFormData({ ...EMPTY_FORM });
    setDialogMode("create");
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setFormData({
      name: p.name,
      description: p.description || "",
      longDescription: p.longDescription || "",
      price: String(p.price),
      salePrice: p.salePrice ? String(p.salePrice) : "",
      costPrice: p.costPrice ? String(p.costPrice) : "",
      categoryId: p.categoryId || "",
      sku: p.sku || "",
      barcode: p.barcode || "",
      imageUrl: p.imageUrl || "",
      stock: String(p.stock),
      minStock: String(p.minStock),
      unit: p.unit || "unidad",
      isActive: p.isActive,
      isFeatured: p.isFeatured,
      tags: p.tags ? p.tags.join(", ") : "",
    });
    setDialogMode("edit");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tagsArr = formData.tags.split(",").map((t) => t.trim()).filter(Boolean);
    const payload = {
      name: formData.name,
      description: formData.description || undefined,
      longDescription: formData.longDescription || undefined,
      price: parseFloat(formData.price),
      salePrice: formData.salePrice ? parseFloat(formData.salePrice) : undefined,
      costPrice: formData.costPrice ? parseFloat(formData.costPrice) : undefined,
      categoryId: formData.categoryId || undefined,
      sku: formData.sku || undefined,
      barcode: formData.barcode || undefined,
      imageUrl: formData.imageUrl || undefined,
      stock: parseInt(formData.stock),
      minStock: parseInt(formData.minStock),
      unit: formData.unit || undefined,
      isActive: formData.isActive,
      isFeatured: formData.isFeatured,
      tags: tagsArr.length > 0 ? tagsArr : undefined,
    };

    try {
      if (dialogMode === "edit" && editingId) {
        await updateMutation.mutateAsync({ productId: editingId, data: payload });
        toast({ title: "Producto actualizado" });
      } else {
        await createMutation.mutateAsync({ data: payload });
        toast({ title: "Producto creado" });
      }
      invalidate();
      setDialogMode(null);
    } catch {
      toast({ title: "Error al guardar", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar "${name}"?`)) return;
    await deleteMutation.mutateAsync({ productId: id });
    invalidate();
    toast({ title: "Producto eliminado" });
  };

  const handleExport = async () => {
    const result = await doExport();
    if (!result.data?.length) {
      toast({ title: "Sin datos para exportar" });
      return;
    }
    const headers = Object.keys(result.data[0]).join(",");
    const rows = result.data.map((r: any) =>
      Object.values(r).map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")
    );
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "productos.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV descargado" });
  };

  const handleImport = async () => {
    const lines = importText.trim().split("\n");
    if (lines.length < 2) {
      toast({ title: "El CSV debe tener al menos encabezado y una fila", variant: "destructive" });
      return;
    }
    const [headerLine, ...dataLines] = lines;
    const headers = headerLine.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    const products = dataLines.map((line) => {
      const vals = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const obj: any = {};
      headers.forEach((h, i) => {
        obj[h] = vals[i] ?? "";
      });
      return {
        name: obj.name,
        sku: obj.sku || undefined,
        description: obj.description || undefined,
        categoryName: obj.category || undefined,
        price: parseFloat(obj.price) || 0,
        costPrice: obj.costPrice ? parseFloat(obj.costPrice) : undefined,
        stock: parseInt(obj.stock) || 0,
        minStock: parseInt(obj.minStock) || 0,
        unit: obj.unit || undefined,
        isActive: obj.isActive !== "false",
        tags: obj.tags || undefined,
      };
    }).filter((p) => p.name && p.price > 0);

    if (!products.length) {
      toast({ title: "No se encontraron productos válidos", variant: "destructive" });
      return;
    }

    try {
      const res = await importMutation.mutateAsync({
        data: { products, updateExisting: importUpdateExisting },
      });
      invalidate();
      toast({
        title: `Importación completada: ${res.created} creados, ${res.updated} actualizados, ${res.skipped} omitidos`,
      });
      setImportDialogOpen(false);
      setImportText("");
    } catch {
      toast({ title: "Error en la importación", variant: "destructive" });
    }
  };

  const products = productsData?.data ?? [];
  const totalPages = productsData?.totalPages ?? 1;
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Productos</h1>
          <p className="text-muted-foreground">
            {productsData?.total ?? 0} productos en total
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" className="rounded-xl" onClick={handleExport} disabled={isExporting}>
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="mr-2 h-4 w-4" />}
            Exportar CSV
          </Button>
          <Button variant="outline" className="rounded-xl" onClick={() => setImportDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Importar CSV
          </Button>
          <Button
            onClick={openCreate}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg shadow-primary/20"
          >
            <Plus className="mr-2 h-4 w-4" /> Nuevo Producto
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-border/50 mb-4 p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o SKU..."
              className="pl-9 rounded-xl"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          <Select value={filterCategory || "__all__"} onValueChange={(v) => { setFilterCategory(v === "__all__" ? "" : v); setPage(1); }}>
            <SelectTrigger className="w-44 rounded-xl">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas las categorías</SelectItem>
              {categories?.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterActive || "__all__"} onValueChange={(v) => { setFilterActive(v === "__all__" ? "" : v as any); setPage(1); }}>
            <SelectTrigger className="w-36 rounded-xl">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              <SelectItem value="true">Activos</SelectItem>
              <SelectItem value="false">Inactivos</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterFeatured || "__all__"} onValueChange={(v) => { setFilterFeatured(v === "__all__" ? "" : v as any); setPage(1); }}>
            <SelectTrigger className="w-36 rounded-xl">
              <SelectValue placeholder="Destacado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              <SelectItem value="true">Destacados</SelectItem>
              <SelectItem value="false">No destacados</SelectItem>
            </SelectContent>
          </Select>

          <Select value={`${sortBy}-${sortDir}`} onValueChange={(v) => { const [sb, sd] = v.split("-"); setSortBy(sb); setSortDir(sd as "asc" | "desc"); }}>
            <SelectTrigger className="w-44 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.flatMap((o) => [
                <SelectItem key={`${o.value}-asc`} value={`${o.value}-asc`}>{o.label} A→Z</SelectItem>,
                <SelectItem key={`${o.value}-desc`} value={`${o.value}-desc`}>{o.label} Z→A</SelectItem>,
              ])}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-muted-foreground" /></div>
        ) : !products.length ? (
          <div className="p-16 text-center flex flex-col items-center">
            <div className="h-16 w-16 bg-secondary rounded-full flex items-center justify-center mb-4">
              <PackageX className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-1">No hay productos</h3>
            <p className="text-muted-foreground mb-4">
              {search || filterCategory || filterActive ? "Prueba con otros filtros." : "Crea tu primer producto."}
            </p>
            {!search && !filterCategory && !filterActive && (
              <Button onClick={openCreate} variant="outline" className="rounded-xl">
                <Plus className="mr-2 h-4 w-4" /> Crear producto
              </Button>
            )}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader className="bg-secondary/30">
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => {
                  const isLow = p.stock <= p.minStock && p.minStock > 0;
                  const isOut = p.stock === 0;
                  return (
                    <TableRow key={p.id} className="hover:bg-secondary/10">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.name} className="h-10 w-10 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="h-10 w-10 bg-secondary rounded-lg flex items-center justify-center shrink-0">
                              <PackageX className="h-5 w-5 text-muted-foreground/40" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold">{p.name}</span>
                              {p.isFeatured && (
                                <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                              )}
                            </div>
                            {p.sku && <p className="text-xs text-muted-foreground">SKU: {p.sku}</p>}
                            {p.tags && p.tags.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {p.tags.slice(0, 2).map((t) => (
                                  <Badge key={t} variant="outline" className="text-xs py-0 px-1.5">{t}</Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{p.category?.name || "-"}</span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className={`font-semibold ${p.salePrice ? "line-through text-muted-foreground text-sm" : ""}`}>
                            S/ {parseFloat(String(p.price)).toFixed(2)}
                          </span>
                          {p.salePrice && (
                            <div className="text-emerald-600 font-bold text-sm">
                              S/ {parseFloat(String(p.salePrice)).toFixed(2)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`font-semibold ${isOut ? "text-destructive" : isLow ? "text-amber-600" : "text-foreground"}`}>
                          {p.stock}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">{p.unit || "uds"}</span>
                        {(isOut || isLow) && (
                          <div className="text-xs text-amber-500 mt-0.5">{isOut ? "Sin stock" : "Stock bajo"}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={p.isActive ? "default" : "secondary"}
                          className={p.isActive ? "bg-emerald-500/15 text-emerald-700 border-emerald-200" : ""}
                        >
                          {p.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl">
                            <DropdownMenuItem onClick={() => openEdit(p)}>
                              <Edit className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(p.id, p.name)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="p-4 flex items-center justify-between border-t border-border/40">
                <span className="text-sm text-muted-foreground">
                  Página {page} de {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="rounded-xl"
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-xl"
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogMode !== null} onOpenChange={(o) => !o && setDialogMode(null)}>
        <DialogContent className="sm:max-w-[640px] rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {dialogMode === "edit" ? "Editar Producto" : "Nuevo Producto"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Nombre <span className="text-destructive">*</span></Label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label>Precio (S/) <span className="text-destructive">*</span></Label>
                <Input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label>Precio de oferta (S/)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.salePrice}
                  onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
                  className="rounded-xl"
                  placeholder="Opcional"
                />
              </div>

              <div className="space-y-2">
                <Label>Precio de costo (S/)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.costPrice}
                  onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                  className="rounded-xl"
                  placeholder="Opcional"
                />
              </div>

              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select
                  value={formData.categoryId || "__none__"}
                  onValueChange={(v) => setFormData({ ...formData, categoryId: v === "__none__" ? "" : v })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Sin categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin categoría</SelectItem>
                    {categories?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Stock inicial</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label>Stock mínimo (alerta)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.minStock}
                  onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label>Unidad</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(v) => setFormData({ ...formData, unit: v })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["unidad", "kg", "g", "litro", "ml", "metro", "caja", "pack", "docena"].map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>SKU</Label>
                <Input
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="rounded-xl"
                  placeholder="Código único"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label>URL de imagen</Label>
                <Input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="rounded-xl"
                  placeholder="https://..."
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label>Descripción corta</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="rounded-xl resize-none"
                  rows={2}
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label>Etiquetas (separadas por coma)</Label>
                <Input
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="rounded-xl"
                  placeholder="Ej: nuevo, oferta, verano"
                />
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(v) => setFormData({ ...formData, isActive: v })}
                />
                <Label>Producto activo</Label>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.isFeatured}
                  onCheckedChange={(v) => setFormData({ ...formData, isFeatured: v })}
                />
                <Label>Producto destacado</Label>
              </div>
            </div>

            <Button type="submit" disabled={isPending} className="w-full h-12 rounded-xl mt-2">
              {isPending ? <Loader2 className="animate-spin" /> : dialogMode === "edit" ? "Guardar Cambios" : "Crear Producto"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-[560px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Importar Productos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              Pega el contenido CSV con columnas: <code className="bg-secondary px-1 rounded text-xs">name,price,sku,description,category,costPrice,stock,minStock,unit,isActive,tags</code>
            </p>
            <Textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="rounded-xl font-mono text-xs resize-none"
              rows={10}
              placeholder={"name,price,sku\nProducto 1,10.00,SKU001"}
            />
            <div className="flex items-center gap-3">
              <Switch
                checked={importUpdateExisting}
                onCheckedChange={setImportUpdateExisting}
              />
              <Label>Actualizar productos existentes por SKU</Label>
            </div>
            <Button
              onClick={handleImport}
              disabled={importMutation.isPending || !importText.trim()}
              className="w-full h-12 rounded-xl"
            >
              {importMutation.isPending ? <Loader2 className="animate-spin" /> : "Importar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
