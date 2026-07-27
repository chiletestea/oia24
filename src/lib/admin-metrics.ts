import { getSupabaseServerClient } from "@/lib/supabase-server";

type Periodo = "hoy" | "semana" | "mes" | "todo";

function getFechaFiltro(periodo: Periodo): string {
  const ahora = new Date();
  switch (periodo) {
    case "hoy":
      return ahora.toISOString().split("T")[0] + "T00:00:00";
    case "semana": {
      const hace7 = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);
      return hace7.toISOString();
    }
    case "mes": {
      const hace30 = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000);
      return hace30.toISOString();
    }
    case "todo":
      return "2020-01-01T00:00:00";
  }
}

export async function getMetricas(periodo: Periodo = "hoy") {
  const fechaFiltro = getFechaFiltro(periodo);
  const supabase = getSupabaseServerClient();

  // sesion_id + created_at de cada turno en el período — sirve tanto para
  // usuarios únicos como para la duración por sesión (no existe una columna
  // duracion_segundos en chat_public_anonymous; se deriva de created_at).
  const { data: chats } = await supabase
    .from("chat_public_anonymous")
    .select("sesion_id, created_at")
    .gte("created_at", fechaFiltro);

  const usuariosUnicos = new Set(chats?.map((c) => c.sesion_id) ?? []).size;
  const totalMensajes = chats?.length ?? 0;

  const rangoPorSesion = new Map<string, { min: number; max: number }>();
  chats?.forEach((c) => {
    const t = new Date(c.created_at).getTime();
    const rango = rangoPorSesion.get(c.sesion_id);
    if (!rango) {
      rangoPorSesion.set(c.sesion_id, { min: t, max: t });
    } else {
      rango.min = Math.min(rango.min, t);
      rango.max = Math.max(rango.max, t);
    }
  });

  const duracionesSegundos = Array.from(rangoPorSesion.values()).map(
    (r) => (r.max - r.min) / 1000
  );
  const promedioDuracion =
    duracionesSegundos.length > 0
      ? Math.round(
          duracionesSegundos.reduce((a, b) => a + b, 0) / duracionesSegundos.length / 60
        )
      : 0;

  // Total crisis — head:true evita traer filas, solo cuenta.
  const { count: totalCrisis } = await supabase
    .from("chat_public_anonymous")
    .select("*", { count: "exact", head: true })
    .eq("es_crisis", true)
    .gte("created_at", fechaFiltro);

  // Temas detectados
  const { data: temas } = await supabase
    .from("chat_public_anonymous")
    .select("temas_detectados")
    .gte("created_at", fechaFiltro);

  const temasMap = new Map<string, number>();
  temas?.forEach((t) => {
    t.temas_detectados?.forEach((tema: string) => {
      temasMap.set(tema, (temasMap.get(tema) ?? 0) + 1);
    });
  });

  const temasTop = Array.from(temasMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tema, count]) => ({ tema, count }));

  return {
    usuariosUnicos,
    totalCrisis: totalCrisis ?? 0,
    promedioDuracion,
    totalMensajes,
    temasTop,
    periodo,
  };
}

export type Metricas = Awaited<ReturnType<typeof getMetricas>>;
