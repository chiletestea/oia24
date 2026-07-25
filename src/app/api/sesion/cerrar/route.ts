import { getSupabaseServerClient } from "@/lib/supabase-server";
import { generarMiniResumen } from "@/lib/mini-resumen";
import { enviarEmail } from "@/lib/enviar-email";
import {
  contarModulosCompletados,
  decodificarMensajes,
  fetchPrograma,
  fetchSesionAbierta,
  fetchUsuario,
} from "@/lib/o-chat-data";

export const runtime = "nodejs";

interface CerrarSesionBody {
  usuario_id: string;
  programa_id: string;
  modulo_numero: number;
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://openia.cl";
}

export async function POST(req: Request) {
  let body: CerrarSesionBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { usuario_id, programa_id, modulo_numero } = body;
  if (!usuario_id || !programa_id || !modulo_numero) {
    return Response.json(
      { error: "Faltan campos: usuario_id, programa_id, modulo_numero" },
      { status: 400 }
    );
  }

  const [usuario, programa, sesion] = await Promise.all([
    fetchUsuario(usuario_id),
    fetchPrograma(programa_id),
    fetchSesionAbierta(usuario_id, programa_id, modulo_numero),
  ]);

  if (!usuario || !programa) {
    return Response.json({ error: "Usuario o programa no encontrado" }, { status: 404 });
  }
  if (!sesion) {
    return Response.json({ error: "No hay una sesión abierta para cerrar" }, { status: 404 });
  }

  const mensajes = decodificarMensajes(sesion);
  const resumen = await generarMiniResumen(mensajes, modulo_numero, programa.nombre);

  const supabase = getSupabaseServerClient();
  const cerradaEn = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("chat_sesiones")
    .update({ resumen_ia: resumen, cerrada_en: cerradaEn })
    .eq("id", sesion.id);

  if (updateError) {
    console.error("Error cerrando sesión:", updateError);
    return Response.json({ error: "No se pudo cerrar la sesión" }, { status: 500 });
  }

  const completados = await contarModulosCompletados(usuario_id, programa_id);

  let emailEnviado = false;
  try {
    await enviarEmail({
      tipo: "resumen",
      to: usuario.email,
      params: {
        nombre: usuario.nombre,
        moduloNumero: modulo_numero,
        totalModulos: programa.modulos,
        modulosCompletados: completados,
        resumen,
        continuarUrl: `${siteUrl()}/${programa_id}/${usuario.token}`,
      },
    });
    emailEnviado = true;
  } catch (err) {
    // No hacemos fallar el cierre de sesión si el email no pudo enviarse
    // (p.ej. falta RESEND_API_KEY en este entorno) — el resumen ya quedó
    // guardado para Luis, que es lo crítico.
    console.error("No se pudo enviar el email de resumen:", err);
  }

  if (emailEnviado) {
    await supabase
      .from("chat_sesiones")
      .update({ email_enviado: true, email_enviado_en: new Date().toISOString() })
      .eq("id", sesion.id);
  }

  return Response.json({ success: true, resumen, email_enviado: emailEnviado });
}
