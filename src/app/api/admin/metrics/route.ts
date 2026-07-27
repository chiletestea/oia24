import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, verificarTokenSesionAdmin } from "@/lib/admin-auth";
import { getMetricas } from "@/lib/admin-metrics";

const PERIODOS = ["hoy", "semana", "mes", "todo"] as const;
type Periodo = (typeof PERIODOS)[number];

function esPeriodoValido(valor: string | null): valor is Periodo {
  return PERIODOS.includes(valor as Periodo);
}

export async function GET(req: Request) {
  const token = cookies().get(ADMIN_COOKIE_NAME)?.value;
  if (!verificarTokenSesionAdmin(token)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const periodoParam = new URL(req.url).searchParams.get("periodo");
  const periodo = esPeriodoValido(periodoParam) ? periodoParam : "hoy";

  const metricas = await getMetricas(periodo);
  return NextResponse.json(metricas);
}
