import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM = "Camila <noreply@camila.pe>";
const BRAND = "#1a5c2e";
const FRONTEND_URL = process.env.FRONTEND_URL || "https://camila.pe";

function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Camila</title></head>
<body style="margin:0;padding:0;background:#f4f7f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f4;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:${BRAND};padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:-0.5px;">Camila</h1>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Plataforma para emprendedores locales</p>
        </td></tr>
        <tr><td style="padding:40px;">
          ${content}
        </td></tr>
        <tr><td style="background:#f4f7f4;padding:24px 40px;text-align:center;border-top:1px solid #e8f0e8;">
          <p style="margin:0;color:#6b7280;font-size:12px;">© ${new Date().getFullYear()} Camila · San Ramón, Chanchamayo, Perú</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function btn(text: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;margin-top:24px;padding:14px 32px;background:${BRAND};color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;border-radius:10px;">${text}</a>`;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const client = getResend();
  if (!client) {
    console.warn("[email] RESEND_API_KEY not set — skipping email to", to);
    return;
  }
  try {
    await client.emails.send({ from: FROM, to, subject, html });
  } catch (err) {
    console.error("[email] Failed to send email to", to, err);
  }
}

export async function sendWelcomeEmail(to: string, ownerName: string, businessName: string): Promise<void> {
  const html = baseLayout(`
    <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">¡Bienvenido a Camila, ${ownerName}!</h2>
    <p style="margin:0 0 16px;color:#4b5563;font-size:15px;line-height:1.6;">
      Tu tienda <strong>${businessName}</strong> ya está lista. Comienza a agregar tus productos,
      personalizar tu tienda y compartir tu catálogo con tus clientes.
    </p>
    <p style="margin:0 0 8px;color:#4b5563;font-size:15px;line-height:1.6;">
      Tienes <strong>30 días de prueba gratuita</strong> para explorar todas las funciones.
    </p>
    ${btn("Ir al panel de control", `${FRONTEND_URL}/dashboard`)}
    <p style="margin:32px 0 0;color:#9ca3af;font-size:13px;">
      Si tienes alguna duda, escríbenos y con gusto te ayudamos.
    </p>
  `);
  await sendEmail(to, `Bienvenido a Camila, ${businessName}`, html);
}

export async function sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
  const link = `${FRONTEND_URL}/reset-password?token=${resetToken}`;
  const html = baseLayout(`
    <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">Restablecer contraseña</h2>
    <p style="margin:0 0 16px;color:#4b5563;font-size:15px;line-height:1.6;">
      Recibimos una solicitud para restablecer la contraseña de tu cuenta en Camila.
      Haz clic en el botón de abajo para crear una nueva contraseña.
    </p>
    <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">
      Este enlace expira en <strong>1 hora</strong>. Si no solicitaste esto, puedes ignorar este correo.
    </p>
    ${btn("Restablecer contraseña", link)}
    <p style="margin:24px 0 0;color:#9ca3af;font-size:12px;word-break:break-all;">
      O copia este enlace en tu navegador:<br>${link}
    </p>
  `);
  await sendEmail(to, "Restablece tu contraseña en Camila", html);
}

export async function sendLicenseExpiringEmail(
  to: string,
  businessName: string,
  expiresAt: Date,
): Promise<void> {
  const days = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const dateStr = expiresAt.toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" });
  const html = baseLayout(`
    <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">Tu plan está por vencer</h2>
    <p style="margin:0 0 16px;color:#4b5563;font-size:15px;line-height:1.6;">
      Hola, el plan de <strong>${businessName}</strong> vence el <strong>${dateStr}</strong>
      (en ${days} día${days !== 1 ? "s" : ""}).
    </p>
    <p style="margin:0 0 8px;color:#4b5563;font-size:15px;line-height:1.6;">
      Para continuar usando Camila sin interrupciones, renueva tu suscripción antes de esa fecha.
    </p>
    ${btn("Renovar ahora", `${FRONTEND_URL}/dashboard/billing`)}
    <p style="margin:32px 0 0;color:#9ca3af;font-size:13px;">
      Si ya realizaste el pago, ignora este mensaje. Cualquier consulta escríbenos.
    </p>
  `);
  await sendEmail(to, `Tu plan de Camila vence en ${days} día${days !== 1 ? "s" : ""}`, html);
}
