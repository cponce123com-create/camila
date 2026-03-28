import { useRef, useState } from "react";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
  if (!res.ok) throw new Error("No se pudo obtener firma de subida");
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
    throw new Error((err as any)?.error?.message || "Error al subir imagen");
  }
  const data = await res.json();
  return data.secure_url as string;
}

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  folder: UploadFolder;
  label?: string;
  hint?: string;
  aspectRatio?: "square" | "banner" | "free";
  className?: string;
  disabled?: boolean;
}

export function ImageUpload({
  value,
  onChange,
  folder,
  label,
  hint,
  aspectRatio = "free",
  className,
  disabled,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const containerClass = {
    square: "aspect-square",
    banner: "aspect-[3/1]",
    free: "min-h-[120px]",
  }[aspectRatio];

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Solo se permiten imágenes");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("La imagen no puede superar 10 MB");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, folder);
      onChange(url);
    } catch (err: any) {
      setError(err.message || "Error al subir");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  return (
    <div className={cn("space-y-2", className)}>
      {label && <span className="text-sm font-medium leading-none">{label}</span>}
      <div
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors cursor-pointer overflow-hidden",
          containerClass,
          disabled || uploading
            ? "opacity-60 cursor-not-allowed border-border/50"
            : "border-border/50 hover:border-primary/50 hover:bg-primary/5"
        )}
      >
        {value ? (
          <>
            <img
              src={value}
              alt="Preview"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
              <Upload className="h-6 w-6 text-white" />
              <span className="text-white text-xs font-medium">Cambiar imagen</span>
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                }}
                className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors z-10"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 py-6 px-4 text-center">
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            ) : (
              <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              {uploading ? "Subiendo..." : "Haz clic o arrastra una imagen"}
            </p>
            {hint && !uploading && (
              <p className="text-xs text-muted-foreground/70">{hint}</p>
            )}
          </div>
        )}

        {uploading && value && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
        disabled={disabled || uploading}
      />
    </div>
  );
}
