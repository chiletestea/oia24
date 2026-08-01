import { getSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

// POST /api/feedback/create
// Guarda la evaluación opcional que deja el usuario al cerrar SalesBot
// (ver criterio de elegibilidad en components/SalesBot.tsx). Identificado
// solo por session_id (localStorage, ver lib/sesion-anonima.ts).
//
// Además de guardar el rating/comentario, clasifica automáticamente la
// visibilidad en feedback_visibility: 4-5 estrellas quedan visibles en el
// Home por default, 3 o menos quedan ocultas hasta que el admin las
// visibilice manualmente desde /admin/dashboard.

interface FeedbackBody {
  session_id: string;
  rating: number;
  comment?: string | null;
}

export async function POST(req: Request) {
  let body: FeedbackBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (
    !body.session_id ||
    typeof body.rating !== "number" ||
    !Number.isInteger(body.rating) ||
    body.rating < 1 ||
    body.rating > 5
  ) {
    return Response.json({ error: "Cuerpo de solicitud inválido" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data: feedback, error } = await supabase
    .from("feedback_sessions")
    .insert({
      session_id: body.session_id,
      rating: body.rating,
      comment: typeof body.comment === "string" ? body.comment.trim() || null : null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error guardando feedback:", error);
    return Response.json({ error: "No se pudo guardar el feedback" }, { status: 500 });
  }

  // Clasificación automática de visibilidad. Si esto falla (p. ej. la tabla
  // feedback_visibility todavía no existe), no hacemos fallar el feedback en
  // sí — el rating/comentario ya quedó guardado, y el admin puede
  // visibilizarla manualmente después desde /admin/dashboard.
  const { error: visibilidadError } = await supabase.from("feedback_visibility").insert({
    feedback_id: feedback.id,
    is_public: body.rating >= 4,
  });

  if (visibilidadError) {
    console.error("Error clasificando visibilidad de feedback:", visibilidadError);
  }

  return Response.json({ success: true });
}
