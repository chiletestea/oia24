import { getSupabaseServerClient } from "@/lib/supabase-server";
import { verificarAccesoSupervisor } from "@/lib/supervisor-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/supervisor/resumen?usuario_id=&programa_id=&fecha=YYYY-MM-DD&estado=visto|no_visto
// Devuelve SOLO resúmenes — nunca la columna "mensajes" (encriptada). Luis
// jamás ve el chat crudo, ni con acceso directo a la DB debería poder verlo.

export async function GET(req: Request) {
  const unauthorized = verificarAccesoSupervisor(req);
  if (unauthorized) return unauthorized;

  const url = new URL(req.url);
  const usuarioId = url.searchParams.get("usuario_id");
  const programaId = url.searchParams.get("programa_id");
  const fecha = url.searchParams.get("fecha"); // YYYY-MM-DD
  const estado = url.searchParams.get("estado"); // "visto" | "no_visto"

  const supabase = getSupabaseServerClient();
  let query = supabase
    .from("chat_sesiones")
    .select(
      "id, usuario_id, programa_id, modulo_numero, resumen_ia, cerrada_en, es_crisis, visto_por_supervisor, visto_en, created_at"
    )
    .not("resumen_ia", "is", null)
    .order("created_at", { ascending: false });

  if (usuarioId) query = query.eq("usuario_id", usuarioId);
  if (programaId) query = query.eq("programa_id", programaId);
  if (estado === "visto") query = query.eq("visto_por_supervisor", true);
  if (estado === "no_visto") query = query.eq("visto_por_supervisor", false);
  if (fecha) {
    const inicio = `${fecha}T00:00:00.000Z`;
    const fin = `${fecha}T23:59:59.999Z`;
    query = query.gte("created_at", inicio).lte("created_at", fin);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error en /api/supervisor/resumen:", error);
    return Response.json({ error: "No se pudieron obtener los resúmenes" }, { status: 500 });
  }

  return Response.json({ resumenes: data });
}
