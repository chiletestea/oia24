import { Resend } from "resend";
import { crearForgetMeLink, insertarFooterOlvidarme } from "@/lib/emails-helper";
import {
  bienvenida,
  miniResumenSesion,
  notificacionLuisDiaria,
  type ResumenLuisSesion,
} from "@/lib/email-templates";

// Función centralizada de envío — úsala en vez de llamar a Resend
// directamente, así el footer de "olvidarme" queda garantizado en todos los
// emails. /api/emails/enviar la expone como endpoint HTTP; otras rutas
// server-side (p.ej. sesion/cerrar, el cron diario) la importan directo.

export type TipoEmail = "bienvenida" | "resumen" | "notificacion-luis";

export interface EnviarEmailParams {
  tipo: TipoEmail;
  to: string;
  params: Record<string, unknown>;
}

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Falta RESEND_API_KEY en el entorno. Agrégala en .env.local.");
  }
  return new Resend(apiKey);
}

export async function enviarEmail({
  tipo,
  to,
  params,
}: EnviarEmailParams): Promise<{ id: string | null }> {
  let content: { subject: string; html: string };

  switch (tipo) {
    case "bienvenida":
      content = bienvenida(
        params as { nombre: string | null; programaNombre: string; continuarUrl: string }
      );
      break;
    case "resumen":
      content = miniResumenSesion(
        params as {
          nombre: string | null;
          moduloNumero: number;
          totalModulos: number;
          modulosCompletados: number;
          resumen: string;
          continuarUrl: string;
        }
      );
      break;
    case "notificacion-luis":
      content = notificacionLuisDiaria(
        params as { fecha: string; sesiones: ResumenLuisSesion[] }
      );
      break;
    default:
      throw new Error(`Tipo de email desconocido: ${tipo}`);
  }

  const forgetMeLink = await crearForgetMeLink(to);
  const html = insertarFooterOlvidarme(content.html, forgetMeLink);

  const resend = getResendClient();
  const from = process.env.EMAIL_FROM ?? "openia.cl <hola@openia.cl>";

  const { data, error } = await resend.emails.send({ from, to, subject: content.subject, html });

  if (error) {
    throw new Error(`Resend rechazó el envío: ${error.message}`);
  }

  return { id: data?.id ?? null };
}
