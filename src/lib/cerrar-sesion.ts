import { getSupabaseServerClient } from "@/lib/supabase-server";
import { generarMiniResumen } from "@/lib/mini-resumen";
import { enviarEmail } from "@/lib/enviar-email";
import {
  contarModulosCompletados,
  decodificarMensajes,
  type ProgramaInfo,
} from "@/lib/o-chat-data";
import type { ChatSesion, Usuario } from "@/types/privacy";

// Lógica de "cerrar sesión" compartida por dos disparadores:
// 1. El botón "Salir" del usuario (POST /api/sesion/cerrar).
// 2. El tag [[MODULO_COMPLETADO:N]] emitido por O en /api/programa-chat.
// Ambos deben terminar la sesión igual: generar resumen, guardarlo, avisar
// por email. Vive en lib/ para no duplicar esto entre los dos.

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://openia.cl";
}

export interface CerrarSesionResultado {
  resumen: string;
  emailEnviado: boolean;
  modulosCompletados: number;
}

export async function cerrarSesion(
  sesion: ChatSesion,
  usuario: Usuario,
  programa: ProgramaInfo
): Promise<CerrarSesionResultado> {
  const mensajes = decodificarMensajes(sesion);
  const resumen = await generarMiniResumen(mensajes, sesion.modulo_numero, programa.nombre);

  const supabase = getSupabaseServerClient();
  await supabase
    .from("chat_sesiones")
    .update({ resumen_ia: resumen, cerrada_en: new Date().toISOString() })
    .eq("id", sesion.id);

  const modulosCompletados = await contarModulosCompletados(usuario.id, programa.id);

  let emailEnviado = false;
  try {
    await enviarEmail({
      tipo: "resumen",
      to: usuario.email,
      params: {
        nombre: usuario.nombre,
        moduloNumero: sesion.modulo_numero,
        totalModulos: programa.modulos,
        modulosCompletados,
        resumen,
        continuarUrl: `${siteUrl()}/programa/${usuario.token}`,
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

  return { resumen, emailEnviado, modulosCompletados };
}
