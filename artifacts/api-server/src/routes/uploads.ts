import { Router, type IRouter } from "express";
import crypto from "crypto";
import { requireAuth, requireStoreAdmin } from "../middlewares/session";
import { z } from "zod";

const router: IRouter = Router();

function getCloudinaryConfig() {
  const cloudName = process.env["CLOUDINARY_CLOUD_NAME"];
  const apiKey = process.env["CLOUDINARY_API_KEY"];
  const apiSecret = process.env["CLOUDINARY_API_SECRET"];
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary no está configurado correctamente");
  }
  return { cloudName, apiKey, apiSecret };
}

function generateSignature(
  params: Record<string, string | number>,
  apiSecret: string
): string {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return crypto.createHash("sha256").update(sorted + apiSecret).digest("hex");
}

// ─── POST /api/uploads/sign ───────────────────────────────────────────────────
// Returns a signed upload preset so the frontend can upload directly to Cloudinary
const signSchema = z.object({
  folder: z.enum(["logo", "banner", "product", "banner-promo", "qr", "category"]),
});

router.post("/sign", requireAuth, requireStoreAdmin, (req, res) => {
  const result = signSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Carpeta inválida" });
    return;
  }

  try {
    const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
    const timestamp = Math.round(Date.now() / 1000);
    const folder = `camila/${result.data.folder}`;

    const paramsToSign: Record<string, string | number> = { folder, timestamp };
    const signature = generateSignature(paramsToSign, apiSecret);

    res.json({ cloudName, apiKey, timestamp, signature, folder });
  } catch (err) {
    res.status(500).json({ error: "Error al generar firma de subida" });
  }
});

export default router;
