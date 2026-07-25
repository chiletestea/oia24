import { validarTokenAcceso } from "@/lib/middleware-token";
import { contarModulosCompletados, fetchPrograma, fetchUltimaSesionCerrada } from "@/lib/o-chat-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/sesion/iniciar
// Body: { usuario_id, programa_id, token }
// El usuario_id/programa_id del body NO se confía a ciegas — se re-derivan
// del usuario dueño del token (evita que alguien con un token válido propio
// pida el contexto de otra cuenta pasando un usuario_id ajeno).

interface IniciarSesionBody {
  usuario_id?: string;
  programa_id?: string;
  token: string;
}

export async function POST(req: Request) {
  let body: IniciarSesionBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!body.token) {
    return Response.json({ error: "Falta el campo: token" }, { status: 400 });
  }

  const { valido, usuario } = await validarTokenAcceso(body.token);
  if (!valido || !usuario || !usuario.programa_id) {
    return Response.json({ error: "Token inválido o expirado" }, { status: 401 });
  }

  const [programa, ultimaSesion, completados] = await Promise.all([
    fetchPrograma(usuario.programa_id),
    fetchUltimaSesionCerrada(usuario.id),
    contarModulosCompletados(usuario.id, usuario.programa_id),
  ]);

  if (!programa) {
    return Response.json({ error: "Programa no encontrado" }, { status: 404 });
  }

  return Response.json({
    usuario: { id: usuario.id, programa_id: usuario.programa_id, nombre: usuario.nombre, modulo_actual: usuario.modulo_actual },
    contexto: {
      progreso: `${completados} de ${programa.modulos}`,
      resumen_ultima_sesion: ultimaSesion?.resumen_ia ?? null,
      fecha_ultima_sesion: ultimaSesion?.cerrada_en ?? null,
    },
  });
}
