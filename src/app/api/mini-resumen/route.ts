import { generarMiniResumen } from "@/lib/mini-resumen";
import type { OChatMessage } from "@/types/privacy";

export const runtime = "nodejs";

interface MiniResumenBody {
  mensajes: OChatMessage[];
  modulo_numero: number;
  programa_nombre: string;
}

export async function POST(req: Request) {
  let body: MiniResumenBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!Array.isArray(body.mensajes) || !body.modulo_numero || !body.programa_nombre) {
    return Response.json(
      { error: "Faltan campos: mensajes, modulo_numero, programa_nombre" },
      { status: 400 }
    );
  }

  try {
    const resumen = await generarMiniResumen(
      body.mensajes,
      body.modulo_numero,
      body.programa_nombre
    );
    return Response.json({ resumen });
  } catch (err) {
    console.error("Error en /api/mini-resumen:", err);
    return Response.json({ error: "No se pudo generar el resumen" }, { status: 502 });
  }
}
