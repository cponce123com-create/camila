import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useGetCategories, useCreateCategory, useDeleteCategory } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Edit, Tags, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function CategoriesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: categories, isLoading } = useGetCategories();
  const createMutation = useCreateCategory();
  const deleteMutation = useDeleteCategory();

  const [formData, setFormData] = useState({ name: "", description: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync({ data: formData });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setIsDialogOpen(false);
      setFormData({ name: "", description: "" });
      toast({ title: "Categoría creada" });
    } catch (err) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Seguro que deseas eliminar esta categoría?")) {
      await deleteMutation.mutateAsync({ categoryId: id });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Categoría eliminada" });
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Categorías</h1>
          <p className="text-muted-foreground">Organiza tus productos por familias.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg shadow-primary/20">
              <Plus className="mr-2 h-4 w-4" /> Nueva Categoría
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">Crear Categoría</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="rounded-xl" />
              </div>
              <Button type="submit" disabled={createMutation.isPending} className="w-full h-12 rounded-xl mt-4">
                {createMutation.isPending ? <Loader2 className="animate-spin" /> : "Guardar Categoría"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground"><Loader2 className="animate-spin h-8 w-8 mx-auto" /></div>
        ) : !categories?.length ? (
          <div className="p-16 text-center flex flex-col items-center">
            <div className="h-16 w-16 bg-secondary rounded-full flex items-center justify-center mb-4">
              <Tags className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-1">No hay categorías</h3>
            <p className="text-muted-foreground">Crea tu primera categoría para organizar tus productos.</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-secondary/30">
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((c) => (
                <TableRow key={c.id} className="hover:bg-secondary/10">
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.description || "-"}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)} className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </DashboardLayout>
  );
}
