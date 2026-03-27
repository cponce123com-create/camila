import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useGetStoreUsers, useAddStoreUser, useRemoveStoreUser, AddUserRequestRole } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Users, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function TeamPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const { data: users, isLoading } = useGetStoreUsers();
  const addMutation = useAddStoreUser();
  const removeMutation = useRemoveStoreUser();

  const [formData, setFormData] = useState({
    name: "", email: "", password: "", role: "store_staff" as AddUserRequestRole
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addMutation.mutateAsync({ data: formData });
      queryClient.invalidateQueries({ queryKey: ["/api/stores/me/users"] });
      setIsDialogOpen(false);
      setFormData({ name: "", email: "", password: "", role: "store_staff" });
      toast({ title: "Usuario invitado" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (id === currentUser?.id) {
      toast({ title: "No puedes eliminarte a ti mismo", variant: "destructive" });
      return;
    }
    if (confirm("¿Remover este usuario del negocio?")) {
      await removeMutation.mutateAsync({ userId: id });
      queryClient.invalidateQueries({ queryKey: ["/api/stores/me/users"] });
      toast({ title: "Usuario removido" });
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Equipo</h1>
          <p className="text-muted-foreground">Administra quién tiene acceso a tu tienda.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg shadow-primary/20">
              <Plus className="mr-2 h-4 w-4" /> Agregar Personal
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">Nuevo Usuario</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Nombre completo</Label>
                <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Correo electrónico</Label>
                <Input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Contraseña</Label>
                <Input type="password" required minLength={8} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select value={formData.role} onValueChange={(v: any) => setFormData({...formData, role: v})}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="store_admin">Administrador</SelectItem>
                    <SelectItem value="store_staff">Personal General</SelectItem>
                    <SelectItem value="cashier">Cajero</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={addMutation.isPending} className="w-full h-12 rounded-xl mt-4">
                {addMutation.isPending ? <Loader2 className="animate-spin" /> : "Crear Usuario"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground"><Loader2 className="animate-spin h-8 w-8 mx-auto" /></div>
        ) : !users?.length ? (
          <div className="p-16 text-center flex flex-col items-center">
            <div className="h-16 w-16 bg-secondary rounded-full flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-1">Aún no hay equipo</h3>
            <p className="text-muted-foreground">Eres el único en este negocio. ¡Invita a tu equipo!</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-secondary/30">
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} className="hover:bg-secondary/10">
                  <TableCell className="font-medium flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                      {u.name.charAt(0)}
                    </div>
                    {u.name}
                  </TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <span className="bg-accent/10 text-accent-foreground px-2 py-1 rounded-md text-xs font-semibold">
                      {u.role.replace('_', ' ').toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      disabled={u.id === currentUser?.id}
                      onClick={() => handleDelete(u.id)} 
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                    >
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
