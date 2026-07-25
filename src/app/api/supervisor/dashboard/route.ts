import { getSupabaseServerClient } from "@/lib/supabase-server";
import { verificarAccesoSupervisor } from "@/lib/supervisor-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/supervisor/dashboard?fecha=YYYY-MM-DD (default: hoy)
// Métricas agregadas del día — nunca contenido de mensajes.

export async function GET(req: Request) {
  const unauthorized = verificarAccesoSupervisor(req);
  if (unauthorized) return unauthorized;

  const url = new URL(req.url);
  const fecha = url.searchParams.get("fecha") ?? new Date().toISOString().slice(0, 10);
  const inicio = `${fecha}T00:00:00.000Z`;
  const fin = `${fecha}T23:59:59.999Z`;

  const supabase = getSupabaseServerClient();

  const [sesionesHoy, sesionesCompletadas, modulosCerrados, alertasCrisis, noVistos] =
    await Promise.all([
      supabase
        .from("chat_sesiones")
        .select("usuario_id", { count: "exact", head: true })
        .gte("created_at", inicio)
        .lte("created_at", fin),
      supabase
        .from("chat_sesiones")
        .select("id", { count: "exact", head: true })
        .gte("cerrada_en", inicio)
        .lte("cerrada_en", fin),
      supabase
        .from("modulos")
        .select("id", { count: "exact", head: true })
        .eq("completado", true)
        .gte("fecha_completado", inicio)
        .lte("fecha_completado", fin),
      supabase
        .from("chat_sesiones")
        .select("id, usuario_id, programa_id, modulo_numero, created_at")
        .eq("es_crisis", true)
        .gte("created_at", inicio)
        .lte("created_at", fin),
      supabase
        .from("chat_sesiones")
        .select("id", { count: "exact", head: true })
        .eq("visto_por_supervisor", false)
        .not("resumen_ia", "is", null),
    ]);

  // usuarios activos hoy: distinct usuario_id entre las sesiones de hoy
  const { data: usuariosHoyData } = await supabase
    .from("chat_sesiones")
    .select("usuario_id")
    .gte("created_at", inicio)
    .lte("created_at", fin);
  const usuariosActivosHoy = new Set((usuariosHoyData ?? []).map((r) => r.usuario_id)).size;

  return Response.json({
    fecha,
    usuarios_activos_hoy: usuariosActivosHoy,
    sesiones_creadas_hoy: sesionesHoy.count ?? 0,
    sesiones_completadas_hoy: sesionesCompletadas.count ?? 0,
    modulos_cerrados_hoy: modulosCerrados.count ?? 0,
    alertas_crisis: alertasCrisis.data ?? [],
    resumenes_no_vistos: noVistos.count ?? 0,
  });
}
