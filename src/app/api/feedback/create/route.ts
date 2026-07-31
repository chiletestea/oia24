import { getSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

// POST /api/feedback/create
// Guarda la evaluación opcional que deja el usuario al cerrar SalesBot
// (ver criterio de elegibilidad en components/SalesBot.tsx). Identificado
// solo por session_id (localStorage, ver lib/sesion-anonima.ts).

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
  const { error } = await supabase.from("feedback_sessions").insert({
    session_id: body.session_id,
    rating: body.rating,
    comment: typeof body.comment === "string" ? body.comment.trim() || null : null,
  });

  if (error) {
    console.error("Error guardando feedback:", error);
    return Response.json({ error: "No se pudo guardar el feedback" }, { status: 500 });
  }

  return Response.json({ success: true });
}
