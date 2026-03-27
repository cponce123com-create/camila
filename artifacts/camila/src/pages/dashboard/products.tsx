import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useGetProducts, useCreateProduct, useDeleteProduct, useGetCategories } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Trash2, Edit, PackageX, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: productsData, isLoading } = useGetProducts({ search });
  const { data: categories } = useGetCategories();
  
  const createMutation = useCreateProduct();
  const deleteMutation = useDeleteProduct();

  const [formData, setFormData] = useState({
    name: "", description: "", price: "", costPrice: "", categoryId: "", stock: "0"
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync({
        data: {
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          costPrice: formData.costPrice ? parseFloat(formData.costPrice) : undefined,
          categoryId: formData.categoryId || undefined,
          stock: parseInt(formData.stock),
        }
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsDialogOpen(false);
      setFormData({ name: "", description: "", price: "", costPrice: "", categoryId: "", stock: "0" });
      toast({ title: "Producto creado" });
    } catch (err) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Seguro que deseas eliminar este producto?")) {
      await deleteMutation.mutateAsync({ productId: id });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Producto eliminado" });
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Productos</h1>
          <p className="text-muted-foreground">Gestiona tu catálogo de productos.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg shadow-primary/20">
              <Plus className="mr-2 h-4 w-4" /> Nuevo Producto
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">Crear Producto</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select value={formData.categoryId} onValueChange={v => setFormData({...formData, categoryId: v})}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin categoría</SelectItem>
                    {categories?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Precio (S/)</Label>
                  <Input type="number" step="0.01" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Stock Inicial</Label>
                  <Input type="number" required value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} className="rounded-xl" />
                </div>
              </div>
              <Button type="submit" disabled={createMutation.isPending} className="w-full h-12 rounded-xl mt-4">
                {createMutation.isPending ? <Loader2 className="animate-spin" /> : "Guardar Producto"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar productos..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-10 rounded-xl bg-background border-border/50"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground"><Loader2 className="animate-spin h-8 w-8 mx-auto" /></div>
        ) : !productsData?.data.length ? (
          <div className="p-16 text-center flex flex-col items-center">
            <div className="h-16 w-16 bg-secondary rounded-full flex items-center justify-center mb-4">
              <PackageX className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-1">No hay productos</h3>
            <p className="text-muted-foreground">Agrega tu primer producto para empezar a vender.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-secondary/30">
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productsData.data.map((p) => (
                  <TableRow key={p.id} className="hover:bg-secondary/10 transition-colors">
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      {p.category ? <span className="bg-secondary px-2 py-1 rounded-md text-xs font-medium text-secondary-foreground">{p.category.name}</span> : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="font-semibold text-primary">S/ {p.price.toFixed(2)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${p.stock <= 5 ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-600'}`}>
                        {p.stock} unds
                      </span>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
