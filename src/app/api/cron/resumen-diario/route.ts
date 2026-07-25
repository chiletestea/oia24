import { enviarResumenDiarioLuis } from "@/lib/cron/resumen-diario-luis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Disparada por Vercel Cron (ver vercel.json — 02:00 UTC ≈ 22:00 CLT en
// horario estándar; revisar el offset si Chile vuelve a cambiar sus reglas
// de horario de verano). Vercel firma sus llamadas de cron con
// "Authorization: Bearer $CRON_SECRET" si esa env var está configurada.

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  try {
    await enviarResumenDiarioLuis();
    return Response.json({ success: true });
  } catch (err) {
    console.error("Error en cron resumen-diario:", err);
    const message = err instanceof Error ? err.message : "Error desconocido";
    return Response.json({ success: false, error: message }, { status: 502 });
  }
}
