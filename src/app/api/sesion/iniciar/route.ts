import { resumenContextoReinicio } from "@/lib/email-templates";
import {
  contarModulosCompletados,
  fetchPrograma,
  fetchUltimaSesionCerrada,
  fetchUsuario,
} from "@/lib/o-chat-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/sesion/iniciar?usuario_id=xxx&programa_id=xxx&modulo=N
// Devuelve el contexto que el frontend usa para armar el mensaje inicial de
// O al entrar a un módulo (no dispara la conversación con Anthropic — eso
// lo hace /api/o-chat, pasándole "contexto" como parte del historial/system).

export async function GET(req: Request) {
  const url = new URL(req.url);
  const usuarioId = url.searchParams.get("usuario_id");
  const programaId = url.searchParams.get("programa_id");
  const moduloParam = url.searchParams.get("modulo");
  const modulo = moduloParam ? Number(moduloParam) : NaN;

  if (!usuarioId || !programaId || !Number.isFinite(modulo)) {
    return Response.json(
      { error: "Faltan parámetros: usuario_id, programa_id, modulo" },
      { status: 400 }
    );
  }

  const [usuario, programa, ultimaSesion, completados] = await Promise.all([
    fetchUsuario(usuarioId),
    fetchPrograma(programaId),
    fetchUltimaSesionCerrada(usuarioId),
    contarModulosCompletados(usuarioId, programaId),
  ]);

  if (!usuario || !programa) {
    return Response.json({ error: "Usuario o programa no encontrado" }, { status: 404 });
  }

  const contexto = resumenContextoReinicio({
    nombre: usuario.nombre,
    moduloNumero: modulo,
    resumenAnterior: ultimaSesion?.resumen_ia ?? null,
  });

  return Response.json({
    contexto,
    modulo_actual: modulo,
    progreso: { completados, total: programa.modulos },
    ultima_sesion: ultimaSesion
      ? { modulo_numero: ultimaSesion.modulo_numero, cerrada_en: ultimaSesion.cerrada_en }
      : null,
  });
}
