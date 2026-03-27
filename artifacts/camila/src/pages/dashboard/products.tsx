import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  useGetProducts, useCreateProduct, useDeleteProduct, useGetCategories,
  useUpdateProduct, useExportProducts, useImportProducts,
  useGetProductVariants, useCreateProductVariant, useUpdateProductVariant, useDeleteProductVariant,
} from "@workspace/api-client-react";
import type { Product, ProductVariant } from "@workspace/api-client-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search, Plus, Trash2, Edit, PackageX, Loader2, Star, Download,
  Upload, Layers, MoreHorizontal,
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

const EMPTY_VARIANT_FORM = {
  talla: "", color: "", colorHex: "", estilo: "", material: "",
  genero: "", temporada: "", sku: "", price: "", salePrice: "",
  imageUrl: "", stock: "0", minStock: "0", sortOrder: "0", isActive: true,
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
  const [activeTab, setActiveTab] = useState<"datos" | "variantes">("datos");

  // Variant state
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [variantForm, setVariantForm] = useState({ ...EMPTY_VARIANT_FORM });

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

  // Variants
  const { data: variants, isLoading: variantsLoading } = useGetProductVariants(
    editingId ?? "",
    {},
    { query: { enabled: !!editingId && activeTab === "variantes" } }
  );
  const createVariantMutation = useCreateProductVariant();
  const updateVariantMutation = useUpdateProductVariant();
  const deleteVariantMutation = useDeleteProductVariant();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/products"] });
  };

  const invalidateVariants = () => {
    if (editingId) {
      queryClient.invalidateQueries({ queryKey: [`/api/products/${editingId}/variants`] });
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setFormData({ ...EMPTY_FORM });
    setActiveTab("datos");
    setDialogMode("create");
  };

  const openEdit = (p: Product, tab: "datos" | "variantes" = "datos") => {
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
    setActiveTab(tab);
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

  // Variant handlers
  const openCreateVariant = () => {
    setEditingVariantId(null);
    setVariantForm({ ...EMPTY_VARIANT_FORM });
    setVariantDialogOpen(true);
  };

  const openEditVariant = (v: ProductVariant) => {
    setEditingVariantId(v.id);
    setVariantForm({
      talla: v.talla || "",
      color: v.color || "",
      colorHex: v.colorHex || "",
      estilo: v.estilo || "",
      material: v.material || "",
      genero: v.genero || "",
      temporada: v.temporada || "",
      sku: v.sku || "",
      price: v.price ? String(v.price) : "",
      salePrice: v.salePrice ? String(v.salePrice) : "",
      imageUrl: v.imageUrl || "",
      stock: String(v.stock),
      minStock: String(v.minStock),
      sortOrder: String(v.sortOrder),
      isActive: v.isActive,
    });
    setVariantDialogOpen(true);
  };

  const handleSaveVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    const payload = {
      talla: variantForm.talla || undefined,
      color: variantForm.color || undefined,
      colorHex: variantForm.colorHex || undefined,
      estilo: variantForm.estilo || undefined,
      material: variantForm.material || undefined,
      genero: variantForm.genero || undefined,
      temporada: variantForm.temporada || undefined,
      sku: variantForm.sku || undefined,
      price: variantForm.price ? parseFloat(variantForm.price) : undefined,
      salePrice: variantForm.salePrice ? parseFloat(variantForm.salePrice) : undefined,
      imageUrl: variantForm.imageUrl || undefined,
      stock: parseInt(variantForm.stock) || 0,
      minStock: parseInt(variantForm.minStock) || 0,
      sortOrder: parseInt(variantForm.sortOrder) || 0,
      isActive: variantForm.isActive,
    };

    try {
      if (editingVariantId) {
        await updateVariantMutation.mutateAsync({
          productId: editingId,
          variantId: editingVariantId,
          data: payload,
        });
        toast({ title: "Variante actualizada" });
      } else {
        await createVariantMutation.mutateAsync({
          productId: editingId,
          data: payload,
        });
        toast({ title: "Variante creada" });
      }
      invalidateVariants();
      setVariantDialogOpen(false);
    } catch {
      toast({ title: "Error al guardar variante", variant: "destructive" });
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!editingId || !confirm("¿Eliminar esta variante?")) return;
    await deleteVariantMutation.mutateAsync({ productId: editingId, variantId });
    invalidateVariants();
    toast({ title: "Variante eliminada" });
  };

  const products = productsData?.data ?? [];
  const totalPages = productsData?.totalPages ?? 1;
  const isPending = createMutation.isPending || updateMutation.isPending;
  const isVariantPending = createVariantMutation.isPending || updateVariantMutation.isPending;

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
                            <DropdownMenuItem onClick={() => openEdit(p, "datos")}>
                              <Edit className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(p, "variantes")}>
                              <Layers className="mr-2 h-4 w-4" /> Gestionar Variantes
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
        <DialogContent className="sm:max-w-[680px] rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {dialogMode === "edit" ? "Editar Producto" : "Nuevo Producto"}
            </DialogTitle>
          </DialogHeader>

          {dialogMode === "edit" ? (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mt-2">
              <TabsList className="rounded-xl mb-4">
                <TabsTrigger value="datos" className="rounded-lg">Datos</TabsTrigger>
                <TabsTrigger value="variantes" className="rounded-lg">
                  <Layers className="h-4 w-4 mr-1.5" />
                  Variantes
                </TabsTrigger>
              </TabsList>

              <TabsContent value="datos">
                <ProductForm
                  formData={formData}
                  setFormData={setFormData}
                  categories={categories ?? []}
                  isPending={isPending}
                  onSubmit={handleSubmit}
                  mode="edit"
                />
              </TabsContent>

              <TabsContent value="variantes">
                <VariantManager
                  productId={editingId!}
                  variants={variants ?? []}
                  isLoading={variantsLoading}
                  onAdd={openCreateVariant}
                  onEdit={openEditVariant}
                  onDelete={handleDeleteVariant}
                />
              </TabsContent>
            </Tabs>
          ) : (
            <ProductForm
              formData={formData}
              setFormData={setFormData}
              categories={categories ?? []}
              isPending={isPending}
              onSubmit={handleSubmit}
              mode="create"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Variant Form Dialog */}
      <Dialog open={variantDialogOpen} onOpenChange={setVariantDialogOpen}>
        <DialogContent className="sm:max-w-[560px] rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {editingVariantId ? "Editar Variante" : "Nueva Variante"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveVariant} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Talla</Label>
                <Input
                  value={variantForm.talla}
                  onChange={(e) => setVariantForm({ ...variantForm, talla: e.target.value })}
                  className="rounded-xl"
                  placeholder="S, M, L, XL, 38, 40..."
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Input
                  value={variantForm.color}
                  onChange={(e) => setVariantForm({ ...variantForm, color: e.target.value })}
                  className="rounded-xl"
                  placeholder="Rojo, Azul..."
                />
              </div>
              <div className="space-y-2">
                <Label>Color (hex)</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={variantForm.colorHex || "#000000"}
                    onChange={(e) => setVariantForm({ ...variantForm, colorHex: e.target.value })}
                    className="h-10 w-12 rounded-lg border border-input cursor-pointer p-1"
                  />
                  <Input
                    value={variantForm.colorHex}
                    onChange={(e) => setVariantForm({ ...variantForm, colorHex: e.target.value })}
                    className="rounded-xl flex-1"
                    placeholder="#ff0000"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Estilo</Label>
                <Input
                  value={variantForm.estilo}
                  onChange={(e) => setVariantForm({ ...variantForm, estilo: e.target.value })}
                  className="rounded-xl"
                  placeholder="Casual, Formal..."
                />
              </div>
              <div className="space-y-2">
                <Label>Material</Label>
                <Input
                  value={variantForm.material}
                  onChange={(e) => setVariantForm({ ...variantForm, material: e.target.value })}
                  className="rounded-xl"
                  placeholder="Algodón, Poliéster..."
                />
              </div>
              <div className="space-y-2">
                <Label>Género</Label>
                <Select
                  value={variantForm.genero || "__none__"}
                  onValueChange={(v) => setVariantForm({ ...variantForm, genero: v === "__none__" ? "" : v })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin especificar</SelectItem>
                    <SelectItem value="hombre">Hombre</SelectItem>
                    <SelectItem value="mujer">Mujer</SelectItem>
                    <SelectItem value="unisex">Unisex</SelectItem>
                    <SelectItem value="niño">Niño</SelectItem>
                    <SelectItem value="niña">Niña</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Temporada</Label>
                <Input
                  value={variantForm.temporada}
                  onChange={(e) => setVariantForm({ ...variantForm, temporada: e.target.value })}
                  className="rounded-xl"
                  placeholder="Verano 2025, Invierno..."
                />
              </div>
              <div className="space-y-2">
                <Label>SKU variante</Label>
                <Input
                  value={variantForm.sku}
                  onChange={(e) => setVariantForm({ ...variantForm, sku: e.target.value })}
                  className="rounded-xl"
                  placeholder="Código único"
                />
              </div>
              <div className="space-y-2">
                <Label>Precio (S/)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={variantForm.price}
                  onChange={(e) => setVariantForm({ ...variantForm, price: e.target.value })}
                  className="rounded-xl"
                  placeholder="Deja vacío para usar el del producto"
                />
              </div>
              <div className="space-y-2">
                <Label>Precio de oferta (S/)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={variantForm.salePrice}
                  onChange={(e) => setVariantForm({ ...variantForm, salePrice: e.target.value })}
                  className="rounded-xl"
                  placeholder="Opcional"
                />
              </div>
              <div className="space-y-2">
                <Label>Stock</Label>
                <Input
                  type="number"
                  min="0"
                  value={variantForm.stock}
                  onChange={(e) => setVariantForm({ ...variantForm, stock: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Stock mínimo</Label>
                <Input
                  type="number"
                  min="0"
                  value={variantForm.minStock}
                  onChange={(e) => setVariantForm({ ...variantForm, minStock: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>URL imagen de variante</Label>
                <Input
                  type="url"
                  value={variantForm.imageUrl}
                  onChange={(e) => setVariantForm({ ...variantForm, imageUrl: e.target.value })}
                  className="rounded-xl"
                  placeholder="https://..."
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={variantForm.isActive}
                  onCheckedChange={(v) => setVariantForm({ ...variantForm, isActive: v })}
                />
                <Label>Variante activa</Label>
              </div>
            </div>
            <Button type="submit" disabled={isVariantPending} className="w-full h-12 rounded-xl mt-2">
              {isVariantPending ? <Loader2 className="animate-spin" /> : editingVariantId ? "Guardar Cambios" : "Crear Variante"}
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

// ───────────────────────────── Sub-components ─────────────────────────────

interface ProductFormProps {
  formData: typeof EMPTY_FORM;
  setFormData: (d: typeof EMPTY_FORM) => void;
  categories: any[];
  isPending: boolean;
  onSubmit: (e: React.FormEvent) => void;
  mode: "create" | "edit";
}

function ProductForm({ formData, setFormData, categories, isPending, onSubmit, mode }: ProductFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
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
              {categories?.map((c: any) => (
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
        {isPending ? <Loader2 className="animate-spin" /> : mode === "edit" ? "Guardar Cambios" : "Crear Producto"}
      </Button>
    </form>
  );
}

interface VariantManagerProps {
  productId: string;
  variants: ProductVariant[];
  isLoading: boolean;
  onAdd: () => void;
  onEdit: (v: ProductVariant) => void;
  onDelete: (id: string) => void;
}

function VariantManager({ variants, isLoading, onAdd, onEdit, onDelete }: VariantManagerProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {variants.length} {variants.length === 1 ? "variante" : "variantes"}
        </p>
        <Button size="sm" onClick={onAdd} className="rounded-xl">
          <Plus className="h-4 w-4 mr-1.5" /> Nueva Variante
        </Button>
      </div>

      {!variants.length ? (
        <div className="text-center py-10 border-2 border-dashed border-border/60 rounded-2xl">
          <Layers className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Sin variantes</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Añade tallas, colores u otras variantes de este producto
          </p>
          <Button variant="outline" size="sm" className="mt-4 rounded-xl" onClick={onAdd}>
            <Plus className="h-4 w-4 mr-1.5" /> Agregar primera variante
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {variants.map((v) => {
            const label = [v.talla, v.color, v.estilo].filter(Boolean).join(" / ") || "Variante sin nombre";
            const isLow = v.stock <= v.minStock && v.minStock > 0;
            const isOut = v.stock === 0;
            return (
              <div
                key={v.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:bg-secondary/10 transition-colors"
              >
                {v.colorHex && (
                  <div
                    className="h-6 w-6 rounded-full border border-border/50 shrink-0"
                    style={{ backgroundColor: v.colorHex }}
                  />
                )}
                {v.imageUrl && !v.colorHex && (
                  <img src={v.imageUrl} alt={label} className="h-8 w-8 rounded-lg object-cover shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{label}</span>
                    {!v.isActive && (
                      <Badge variant="secondary" className="text-xs py-0">Inactivo</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {v.price && (
                      <span className="text-xs text-muted-foreground">S/ {parseFloat(String(v.price)).toFixed(2)}</span>
                    )}
                    <span className={`text-xs font-medium ${isOut ? "text-destructive" : isLow ? "text-amber-600" : "text-emerald-600"}`}>
                      Stock: {v.stock}
                    </span>
                    {v.sku && <span className="text-xs text-muted-foreground">SKU: {v.sku}</span>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(v)}>
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => onDelete(v.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
