import { cerrarSesion } from "@/lib/cerrar-sesion";
import { fetchPrograma, fetchSesionAbierta, fetchUsuario } from "@/lib/o-chat-data";

export const runtime = "nodejs";

interface CerrarSesionBody {
  usuario_id: string;
  programa_id: string;
  modulo_numero: number;
}

export async function POST(req: Request) {
  let body: CerrarSesionBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { usuario_id, programa_id, modulo_numero } = body;
  if (!usuario_id || !programa_id || typeof modulo_numero !== "number") {
    return Response.json(
      { error: "Faltan campos: usuario_id, programa_id, modulo_numero" },
      { status: 400 }
    );
  }

  const [usuario, programa, sesion] = await Promise.all([
    fetchUsuario(usuario_id),
    fetchPrograma(programa_id),
    fetchSesionAbierta(usuario_id, programa_id, modulo_numero),
  ]);

  if (!usuario || !programa) {
    return Response.json({ error: "Usuario o programa no encontrado" }, { status: 404 });
  }
  if (!sesion) {
    return Response.json({ error: "No hay una sesión abierta para cerrar" }, { status: 404 });
  }

  const resultado = await cerrarSesion(sesion, usuario, programa);

  return Response.json({
    success: true,
    resumen: resultado.resumen,
    email_enviado: resultado.emailEnviado,
  });
}
