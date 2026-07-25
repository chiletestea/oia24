import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { EvaluacionResultado, TipoEvaluacion } from "@/types/privacy";

export const runtime = "nodejs";

// POST /api/evaluaciones
// Endpoint de soporte para los componentes EvaluacionGAD7/BAI/OLBI/SUDSSlider
// (ninguno de ellos puede hablar directo con Supabase usando el service role
// desde el navegador). No estaba en la lista original de rutas — se agregó
// porque "guarda resultado en DB" en esos componentes lo requiere.

interface EvaluacionBody {
  usuario_id: string;
  programa_id: string;
  tipo: TipoEvaluacion;
  modulo_numero: number | null;
  resultado: EvaluacionResultado;
}

const TIPOS_VALIDOS: TipoEvaluacion[] = ["GAD7", "BAI", "OLBI", "SUDS"];

export async function POST(req: Request) {
  let body: EvaluacionBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (
    !body.usuario_id ||
    !body.programa_id ||
    !TIPOS_VALIDOS.includes(body.tipo) ||
    !body.resultado ||
    !Array.isArray(body.resultado.respuestas)
  ) {
    return Response.json({ error: "Cuerpo de solicitud inválido" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("evaluaciones").insert({
    usuario_id: body.usuario_id,
    programa_id: body.programa_id,
    tipo: body.tipo,
    modulo_numero: body.modulo_numero,
    resultado: body.resultado,
  });

  if (error) {
    console.error("Error guardando evaluación:", error);
    return Response.json({ error: "No se pudo guardar la evaluación" }, { status: 500 });
  }

  return Response.json({ success: true });
}
