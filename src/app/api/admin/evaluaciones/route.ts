import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, verificarTokenSesionAdmin } from "@/lib/admin-auth";
import { getEvaluaciones, type FiltroPeriodo, type FiltroVisibilidad } from "@/lib/admin-evaluaciones";

const PERIODOS = ["mes", "3meses", "todo"] as const;
const VISIBILIDADES = ["todas", "publica", "privada"] as const;

function esPeriodoValido(valor: string | null): valor is FiltroPeriodo {
  return PERIODOS.includes(valor as FiltroPeriodo);
}

function esVisibilidadValida(valor: string | null): valor is FiltroVisibilidad {
  return VISIBILIDADES.includes(valor as FiltroVisibilidad);
}

export async function GET(req: Request) {
  const token = cookies().get(ADMIN_COOKIE_NAME)?.value;
  if (!verificarTokenSesionAdmin(token)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const params = new URL(req.url).searchParams;

  const ratingParam = params.get("rating");
  const ratingNum = ratingParam ? Number(ratingParam) : NaN;
  const rating = Number.isInteger(ratingNum) && ratingNum >= 1 && ratingNum <= 5 ? ratingNum : undefined;

  const periodoParam = params.get("periodo");
  const periodo = esPeriodoValido(periodoParam) ? periodoParam : "todo";

  const visibilidadParam = params.get("visibilidad");
  const visibilidad = esVisibilidadValida(visibilidadParam) ? visibilidadParam : "todas";

  const { evaluaciones, error } = await getEvaluaciones({ rating, periodo, visibilidad });
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
  return NextResponse.json({ evaluaciones });
}
