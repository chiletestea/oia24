import { enviarEmail, type TipoEmail } from "@/lib/enviar-email";

export const runtime = "nodejs";

// Endpoint centralizado para TODOS los emails transaccionales de openia.cl.
// La lógica real vive en lib/enviar-email.ts — este archivo solo la expone
// como ruta HTTP para quien prefiera llamarla por fetch en vez de importarla.

interface EnviarEmailBody {
  tipo: TipoEmail;
  to: string;
  params: Record<string, unknown>;
}

export async function POST(req: Request) {
  let body: EnviarEmailBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!body.tipo || !body.to || !body.params) {
    return Response.json({ error: "Faltan campos: tipo, to, params" }, { status: 400 });
  }

  try {
    const result = await enviarEmail(body);
    return Response.json({ success: true, id: result.id });
  } catch (err) {
    console.error("Error en /api/emails/enviar:", err);
    const message = err instanceof Error ? err.message : "Error desconocido enviando el email";
    return Response.json({ success: false, error: message }, { status: 502 });
  }
}
