import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, verificarTokenSesionAdmin } from "@/lib/admin-auth";
import { setVisibilidadEvaluacion } from "@/lib/admin-evaluaciones";

interface ToggleBody {
  feedback_id?: string;
  is_public?: boolean;
}

export async function POST(req: Request) {
  const token = cookies().get(ADMIN_COOKIE_NAME)?.value;
  if (!verificarTokenSesionAdmin(token)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body: ToggleBody | null = await req.json().catch(() => null);
  if (!body || typeof body.feedback_id !== "string" || typeof body.is_public !== "boolean") {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido" }, { status: 400 });
  }

  const { error } = await setVisibilidadEvaluacion(body.feedback_id, body.is_public);
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
