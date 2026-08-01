import { getSupabaseServerClient } from "@/lib/supabase-server";

// Gestión admin de evaluaciones (feedback_sessions + feedback_visibility).
// feedback_sessions no se toca — feedback_visibility es una tabla aparte que
// solo agrega si cada evaluación es pública en el Home, sin usuario_id ni
// login (mismo enfoque anónimo del resto de la app).

export type FiltroVisibilidad = "todas" | "publica" | "privada";
export type FiltroPeriodo = "mes" | "3meses" | "todo";

export interface EvaluacionRow {
  id: string;
  session_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  is_public: boolean;
  admin_notes: string | null;
}

interface FiltrosEvaluaciones {
  rating?: number;
  visibilidad?: FiltroVisibilidad;
  periodo?: FiltroPeriodo;
}

function getFechaFiltro(periodo: FiltroPeriodo): string | null {
  if (periodo === "todo") return null;
  const ahora = new Date();
  const dias = periodo === "mes" ? 30 : 90;
  return new Date(ahora.getTime() - dias * 24 * 60 * 60 * 1000).toISOString();
}

export interface ResultadoEvaluaciones {
  evaluaciones: EvaluacionRow[];
  // Distingue "de verdad no hay evaluaciones" de "la consulta falló" — antes
  // un error de Supabase (p. ej. la tabla no existe todavía) se tragaba en
  // silencio y devolvía una lista vacía, mostrando "Sin evaluaciones" en vez
  // de un error real.
  error: string | null;
}

export async function getEvaluaciones(filtros: FiltrosEvaluaciones): Promise<ResultadoEvaluaciones> {
  const supabase = getSupabaseServerClient();

  let query = supabase
    .from("feedback_sessions")
    .select("id, session_id, rating, comment, created_at")
    .order("created_at", { ascending: false });

  if (filtros.rating) {
    query = query.eq("rating", filtros.rating);
  }
  const fechaFiltro = filtros.periodo ? getFechaFiltro(filtros.periodo) : null;
  if (fechaFiltro) {
    query = query.gte("created_at", fechaFiltro);
  }

  const { data: feedback, error: feedbackError } = await query;
  if (feedbackError) {
    console.error("Error cargando feedback_sessions:", feedbackError);
    return { evaluaciones: [], error: feedbackError.message };
  }
  if (!feedback || feedback.length === 0) return { evaluaciones: [], error: null };

  // Segunda consulta (no un join embebido de PostgREST): la mayoría de las
  // evaluaciones todavía no tiene fila en feedback_visibility (default
  // is_public=false), y mergear en JS evita depender de que PostgREST
  // detecte la relación como uno-a-uno.
  const { data: visibilidad, error: visibilidadError } = await supabase
    .from("feedback_visibility")
    .select("feedback_id, is_public, admin_notes")
    .in(
      "feedback_id",
      feedback.map((f) => f.id)
    );

  if (visibilidadError) {
    console.error("Error cargando feedback_visibility:", visibilidadError);
  }

  const visibilidadPorId = new Map((visibilidad ?? []).map((v) => [v.feedback_id, v]));

  const evaluaciones: EvaluacionRow[] = feedback.map((f) => {
    const v = visibilidadPorId.get(f.id);
    return {
      ...f,
      is_public: v?.is_public ?? false,
      admin_notes: v?.admin_notes ?? null,
    };
  });

  if (filtros.visibilidad && filtros.visibilidad !== "todas") {
    const quierePublica = filtros.visibilidad === "publica";
    return { evaluaciones: evaluaciones.filter((e) => e.is_public === quierePublica), error: null };
  }

  return { evaluaciones, error: null };
}

export async function setVisibilidadEvaluacion(
  feedbackId: string,
  isPublic: boolean
): Promise<{ error: string | null }> {
  const supabase = getSupabaseServerClient();

  // No usamos upsert(onConflict:"feedback_id") — requiere que la constraint
  // unique de la migración 006 haya quedado aplicada tal cual, y en la
  // práctica no siempre es así (p. ej. si la tabla ya existía de un intento
  // previo, "create table if not exists" no la vuelve a crear con la
  // constraint). Buscar y luego insertar/actualizar no depende de eso.
  const { data: existente, error: buscarError } = await supabase
    .from("feedback_visibility")
    .select("id")
    .eq("feedback_id", feedbackId)
    .maybeSingle();

  if (buscarError) {
    console.error("Error buscando feedback_visibility:", buscarError);
    return { error: "No se pudo actualizar la visibilidad" };
  }

  const { error } = existente
    ? await supabase.from("feedback_visibility").update({ is_public: isPublic }).eq("feedback_id", feedbackId)
    : await supabase.from("feedback_visibility").insert({ feedback_id: feedbackId, is_public: isPublic });

  if (error) {
    console.error("Error actualizando feedback_visibility:", error);
    return { error: "No se pudo actualizar la visibilidad" };
  }
  return { error: null };
}
