import { getSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";
// Sin esto, Next.js detecta que este GET no usa ninguna API dinámica
// (cookies/headers/params) y lo pre-renderiza UNA VEZ en el build, sirviendo
// esa misma respuesta congelada en producción para siempre — nunca
// reflejaría evaluaciones nuevas ni cambios de visibilidad hechos después.
export const dynamic = "force-dynamic";

// GET /api/evaluaciones/public
// Endpoint público (sin auth) para el carrusel de testimonios del Home.
// Devuelve solo lo que feedback_visibility marcó como is_public=true, y solo
// rating + comentario — nunca fecha ni session_id, nada identificable.
//
// El total/promedio se calculan sobre TODAS las evaluaciones públicas
// (tengan comentario o no); el carrusel en cambio solo muestra las que sí
// tienen comentario (sin texto no hay nada que mostrar como testimonio) —
// así el resumen no queda sesgado por lo que el carrusel puede mostrar.

interface TestimonioPublico {
  rating: number;
  comment: string;
}

export async function GET() {
  const supabase = getSupabaseServerClient();

  const { data: visibles, error } = await supabase
    .from("feedback_visibility")
    .select("feedback_id")
    .eq("is_public", true);

  if (error) {
    console.error("Error cargando feedback_visibility pública:", error);
    return Response.json({ testimonios: [], total: 0, promedio: 0 });
  }

  const idsPublicos = (visibles ?? []).map((v) => v.feedback_id);
  if (idsPublicos.length === 0) {
    return Response.json({ testimonios: [], total: 0, promedio: 0 });
  }

  const { data: evaluaciones, error: evaluacionesError } = await supabase
    .from("feedback_sessions")
    .select("rating, comment")
    .in("id", idsPublicos);

  if (evaluacionesError) {
    console.error("Error cargando feedback_sessions públicas:", evaluacionesError);
    return Response.json({ testimonios: [], total: 0, promedio: 0 });
  }

  const total = evaluaciones?.length ?? 0;
  const promedio = total > 0 ? evaluaciones!.reduce((acc, e) => acc + e.rating, 0) / total : 0;

  const testimonios: TestimonioPublico[] = (evaluaciones ?? [])
    .filter(
      (e): e is { rating: number; comment: string } =>
        typeof e.comment === "string" && e.comment.trim().length > 0
    )
    .map((e) => ({ rating: e.rating, comment: e.comment.trim() }));

  return Response.json({ testimonios, total, promedio: Math.round(promedio * 10) / 10 });
}
