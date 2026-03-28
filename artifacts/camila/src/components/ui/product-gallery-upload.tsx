import { useRef, useState } from "react";
import { Plus, Trash2, Star, Loader2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_IMAGES = 5;

type UploadFolder = "logo" | "banner" | "product" | "banner-promo";

interface SignResponse {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
}

async function getSignature(folder: UploadFolder): Promise<SignResponse> {
  const res = await fetch("/api/uploads/sign", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder }),
  });
  if (!res.ok) throw new Error("No se pudo obtener firma");
  return res.json();
}

async function uploadToCloudinary(file: File, folder: UploadFolder): Promise<string> {
  const sign = await getSignature(folder);
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sign.apiKey);
  form.append("timestamp", String(sign.timestamp));
  form.append("signature", sign.signature);
  form.append("folder", sign.folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`,
    { method: "POST", body: form }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message || "Error al subir");
  }
  const data = await res.json();
  return data.secure_url as string;
}

export interface GalleryImage {
  url: string;
  isPrimary: boolean;
}

interface ProductGalleryUploadProps {
  images: GalleryImage[];
  onChange: (images: GalleryImage[]) => void;
  disabled?: boolean;
}

export function ProductGalleryUpload({
  images,
  onChange,
  disabled,
}: ProductGalleryUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleFiles(files: FileList) {
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) return;
    const filesToUpload = Array.from(files).slice(0, remaining);
    setError(null);
    setUploading(true);
    try {
      const urls = await Promise.all(filesToUpload.map((f) => uploadToCloudinary(f, "product")));
      const newImages: GalleryImage[] = urls.map((url, i) => ({
        url,
        isPrimary: images.length === 0 && i === 0,
      }));
      onChange([...images, ...newImages]);
    } catch (err: any) {
      setError(err.message || "Error al subir imágenes");
    } finally {
      setUploading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) handleFiles(e.target.files);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  }

  function handleRemove(index: number) {
    const updated = images.filter((_, i) => i !== index);
    if (images[index].isPrimary && updated.length > 0) {
      updated[0] = { ...updated[0], isPrimary: true };
    }
    onChange(updated);
  }

  function handleSetPrimary(index: number) {
    onChange(images.map((img, i) => ({ ...img, isPrimary: i === index })));
  }

  const canAdd = images.length < MAX_IMAGES && !disabled;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          Galería de imágenes{" "}
          <span className="text-muted-foreground font-normal">
            ({images.length}/{MAX_IMAGES})
          </span>
        </span>
        {images.length > 0 && (
          <p className="text-xs text-muted-foreground">
            La imagen con <Star className="inline h-3 w-3 text-amber-500" /> es la imagen principal
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {images.map((img, index) => (
          <div key={index} className="relative group aspect-square rounded-xl overflow-hidden border-2 border-border/50">
            <img src={img.url} alt={`Imagen ${index + 1}`} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => handleSetPrimary(index)}
                className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center transition-colors",
                  img.isPrimary
                    ? "bg-amber-500 text-white"
                    : "bg-white/20 hover:bg-amber-500 text-white"
                )}
                title="Establecer como principal"
              >
                <Star className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="h-7 w-7 rounded-full bg-destructive/80 hover:bg-destructive flex items-center justify-center text-white transition-colors"
                title="Eliminar"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            {img.isPrimary && (
              <div className="absolute top-1 left-1 bg-amber-500 rounded-full p-0.5">
                <Star className="h-3 w-3 text-white fill-white" />
              </div>
            )}
          </div>
        ))}

        {canAdd && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            disabled={uploading}
            className={cn(
              "aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors text-muted-foreground",
              dragOver
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/50 hover:border-primary/50 hover:bg-primary/5 hover:text-primary",
              uploading && "opacity-50 cursor-not-allowed"
            )}
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Plus className="h-5 w-5" />
                <span className="text-xs font-medium">Agregar</span>
              </>
            )}
          </button>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleChange}
        disabled={uploading || !canAdd}
      />
    </div>
  );
}
