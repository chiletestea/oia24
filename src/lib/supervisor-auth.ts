// Las rutas /api/supervisor/* exponen resúmenes clínicos (y alertas de
// crisis) — no había ningún mecanismo de autenticación definido para Luis
// en el spec original, así que se agregó esta protección mínima por clave
// compartida. No es un login real: es un secreto (SUPERVISOR_API_KEY) que
// Luis pega en la URL o en un header al acceder. Suficiente para MVP, pero
// vale la pena reemplazarlo por Supabase Auth + rol "supervisor" más adelante.

export function verificarAccesoSupervisor(req: Request): Response | null {
  const expected = process.env.SUPERVISOR_API_KEY;
  if (!expected) {
    return Response.json(
      { error: "SUPERVISOR_API_KEY no está configurada en el servidor." },
      { status: 500 }
    );
  }

  const url = new URL(req.url);
  const provided = req.headers.get("x-supervisor-key") ?? url.searchParams.get("key");

  if (provided !== expected) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  return null;
}
