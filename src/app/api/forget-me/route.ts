import { getSupabaseServerClient } from "@/lib/supabase-server";
import { consumirForgetMeToken, validarForgetMeToken } from "@/lib/forget-me";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/forget-me?token=TOKEN
// Derecho al olvido: un solo click (el link del email) borra permanentemente
// los datos del usuario. Sin confirmación adicional, sin sesión, sin cookies
// — el consentimiento ya se dio al hacer click en el link.
//
// NOTA: por diseño (spec del producto) esto es un GET destructivo. Es un
// desvío deliberado de la semántica HTTP habitual (GET = seguro/idempotente)
// para evitar fricción en el flujo de borrado. El riesgo real es que
// escáneres de "link previsualization" de algunos clientes de correo
// (Gmail, Outlook Safe Links, etc.) pueden pre-visitar el link automáticamente
// y disparar el borrado sin que el usuario haga click. Vale la pena
// reconsiderar esto — ver reporte adjunto.

function paginaResultado(mensaje: string, ok: boolean): Response {
  const color = ok ? "#1D9E75" : "#b3453a";
  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>openia.cl</title>
</head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(160deg,#f0f9f7,#dff8f4);font-family:sans-serif;">
  <div style="max-width:360px;padding:32px;text-align:center;">
    <p style="font-size:32px;margin:0 0 16px;color:${color};">${ok ? "✓" : "✕"}</p>
    <p style="font-size:15px;line-height:1.6;color:#1a4d4d;">${mensaje}</p>
  </div>
</body>
</html>`;

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return paginaResultado("Falta el token en el link.", false);
  }

  const { valido, emailHasheado } = await validarForgetMeToken(token);
  if (!valido || !emailHasheado) {
    return paginaResultado("Este link no es válido o ya expiró.", false);
  }

  const supabase = getSupabaseServerClient();

  const { data: usuario, error: findError } = await supabase
    .from("usuarios")
    .select("id")
    .eq("email_hash", emailHasheado)
    .maybeSingle();

  // Se consume el token de todas formas: es de un solo uso, encontremos o no al usuario.
  await consumirForgetMeToken(token);

  if (findError || !usuario) {
    return paginaResultado("Este link no es válido o ya expiró.", false);
  }

  const usuarioId = usuario.id as string;

  await Promise.all([
    supabase.from("chat_sesiones").delete().eq("usuario_id", usuarioId),
    supabase.from("evaluaciones").delete().eq("usuario_id", usuarioId),
    supabase.from("modulos").delete().eq("usuario_id", usuarioId),
  ]);

  await supabase
    .from("usuarios")
    .update({ activo: false, deleted_at: new Date().toISOString() })
    .eq("id", usuarioId);

  return paginaResultado("Todos tus datos han sido eliminados.", true);
}
