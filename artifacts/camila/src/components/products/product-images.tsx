import { useState } from "react";
import { 
  useGetProductImages,
  useAddProductImage,
  useUpdateProductImage,
  useDeleteProductImage
} from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ImagePlus, Loader2, MoreVertical, Star, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface ProductImagesManagerProps {
  productId: string;
}

export function ProductImagesManager({ productId }: ProductImagesManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: images, isLoading } = useGetProductImages(productId);
  const addMutation = useAddProductImage();
  const updateMutation = useUpdateProductImage();
  const deleteMutation = useDeleteProductImage();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState({ imageUrl: "", altText: "", isPrimary: false });

  const handleAddImage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addMutation.mutateAsync({
        productId,
        data: {
          imageUrl: form.imageUrl,
          altText: form.altText || undefined,
          isPrimary: form.isPrimary
        }
      });
      queryClient.invalidateQueries({ queryKey: [`/api/products/${productId}/images`] });
      setIsDialogOpen(false);
      setForm({ imageUrl: "", altText: "", isPrimary: false });
      toast({ title: "Imagen agregada" });
    } catch (err) {
      toast({ title: "Error al agregar imagen", variant: "destructive" });
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    try {
      await updateMutation.mutateAsync({
        productId,
        imageId,
        data: { isPrimary: true }
      });
      queryClient.invalidateQueries({ queryKey: [`/api/products/${productId}/images`] });
      toast({ title: "Imagen principal actualizada" });
    } catch (err) {
      toast({ title: "Error al actualizar", variant: "destructive" });
    }
  };

  const handleDelete = async (imageId: string) => {
    if (confirm("¿Eliminar esta imagen?")) {
      try {
        await deleteMutation.mutateAsync({ productId, imageId });
        queryClient.invalidateQueries({ queryKey: [`/api/products/${productId}/images`] });
        toast({ title: "Imagen eliminada" });
      } catch (err) {
        toast({ title: "Error al eliminar", variant: "destructive" });
      }
    }
  };

  const imageCount = images?.length || 0;
  const isAtLimit = imageCount >= 10;

  if (isLoading) {
    return <div className="flex gap-2 animate-pulse">
      {[1,2,3].map(i => <div key={i} className="w-16 h-16 bg-muted rounded-xl"></div>)}
    </div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm text-muted-foreground">Imágenes del Producto</h4>
        <span className="text-xs font-medium bg-secondary px-2 py-1 rounded-md">{imageCount} / 10 imágenes</span>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        {images?.map((img) => (
          <Popover key={img.id}>
            <PopoverTrigger asChild>
              <div className="relative w-16 h-16 rounded-xl border-2 border-border/50 overflow-hidden cursor-pointer group hover:border-primary transition-colors shrink-0">
                <img src={img.imageUrl} alt={img.altText || "Product"} className="w-full h-full object-cover" />
                {img.isPrimary && (
                  <div className="absolute top-1 right-1 bg-amber-400 text-white p-0.5 rounded-full shadow-sm">
                    <Star className="w-3 h-3 fill-current" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <MoreVertical className="h-5 w-5" />
                </div>
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1 rounded-xl" align="center">
              <div className="flex flex-col">
                {!img.isPrimary && (
                  <button 
                    onClick={() => handleSetPrimary(img.id)}
                    className="flex items-center px-3 py-2 text-sm hover:bg-secondary rounded-lg text-left"
                  >
                    <Star className="w-4 h-4 mr-2" /> Marcar principal
                  </button>
                )}
                <button 
                  onClick={() => handleDelete(img.id)}
                  className="flex items-center px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg text-left"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                </button>
              </div>
            </PopoverContent>
          </Popover>
        ))}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-16 h-16 rounded-xl border-2 border-dashed border-border/80 hover:border-primary hover:bg-primary/5 flex flex-col items-center justify-center shrink-0 p-0"
                    disabled={isAtLimit}
                  >
                    <ImagePlus className="h-6 w-6 text-muted-foreground" />
                  </Button>
                </DialogTrigger>
              </div>
            </TooltipTrigger>
            {isAtLimit && (
              <TooltipContent>
                <p>Límite máximo de 10 imágenes alcanzado</p>
              </TooltipContent>
            )}
          </Tooltip>
          <DialogContent className="sm:max-w-[400px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-display">Agregar Imagen</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddImage} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>URL de la imagen *</Label>
                <Input required value={form.imageUrl} onChange={e => setForm({...form, imageUrl: e.target.value})} className="rounded-xl" placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label>Texto alternativo (Opcional)</Label>
                <Input value={form.altText} onChange={e => setForm({...form, altText: e.target.value})} className="rounded-xl" placeholder="Descripción de la imagen" />
              </div>
              <div className="flex items-center justify-between pt-2">
                <Label>Es imagen principal</Label>
                <Switch checked={form.isPrimary} onCheckedChange={c => setForm({...form, isPrimary: c})} />
              </div>
              <Button type="submit" disabled={addMutation.isPending} className="w-full h-11 rounded-xl mt-2">
                {addMutation.isPending ? <Loader2 className="animate-spin" /> : "Guardar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
