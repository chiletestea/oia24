import { getSupabaseServerClient } from "@/lib/supabase-server";
import { enviarEmail } from "@/lib/enviar-email";
import type { ResumenLuisSesion } from "@/lib/email-templates";

const EMAIL_LUIS = "openterapiachile@gmail.com";

interface FilaSesion {
  modulo_numero: number;
  resumen_ia: string | null;
  es_crisis: boolean;
  usuarios: { nombre: string | null } | null;
  programas: { nombre: string } | null;
}

/**
 * Envía a Luis el resumen diario de sesiones cerradas. Pensado para
 * dispararse una vez al día (ver app/api/cron/resumen-diario/route.ts +
 * vercel.json) — esta función en sí no programa nada, solo hace el trabajo.
 */
export async function enviarResumenDiarioLuis(fecha?: string): Promise<void> {
  const fechaObjetivo = fecha ?? new Date().toISOString().slice(0, 10);
  const inicio = `${fechaObjetivo}T00:00:00.000Z`;
  const fin = `${fechaObjetivo}T23:59:59.999Z`;

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("chat_sesiones")
    .select("modulo_numero, resumen_ia, es_crisis, usuarios(nombre), programas(nombre)")
    .gte("cerrada_en", inicio)
    .lte("cerrada_en", fin)
    .not("resumen_ia", "is", null);

  if (error) {
    throw new Error(`No se pudieron obtener las sesiones del día: ${error.message}`);
  }

  const filas = (data ?? []) as unknown as FilaSesion[];

  const sesiones: ResumenLuisSesion[] = filas.map((f) => ({
    usuarioNombre: f.usuarios?.nombre ?? null,
    programaNombre: f.programas?.nombre ?? "Programa",
    moduloNumero: f.modulo_numero,
    resumen: f.resumen_ia ?? "",
    esCrisis: f.es_crisis,
  }));

  await enviarEmail({
    tipo: "notificacion-luis",
    to: EMAIL_LUIS,
    params: { fecha: fechaObjetivo, sesiones },
  });
}
