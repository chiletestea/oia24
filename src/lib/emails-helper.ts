import { generarForgetMeToken, guardarForgetMeToken } from "@/lib/forget-me";

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://openia.cl";
}

/**
 * Genera y persiste un nuevo forget-me token para este email, y devuelve el
 * link único que va en el footer del correo. Cada email lleva un token
 * distinto (de un solo uso, vence en 30 días).
 */
export async function crearForgetMeLink(email: string): Promise<string> {
  const token = generarForgetMeToken();
  await guardarForgetMeToken(token, email);
  return `${siteUrl()}/api/forget-me?token=${token}`;
}

/** Inserta el footer legal + link de olvido al final de un HTML de email. Aplicar a CADA email. */
export function insertarFooterOlvidarme(html: string, forgetMeLink: string): string {
  const footer = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;border-top:1px solid #e3f3ee;padding-top:16px;">
      <tr>
        <td style="font-family:sans-serif;font-size:12px;line-height:1.6;color:#5a7d78;">
          <p style="margin:0 0 8px;">
            openia.cl · Privacidad total · Ley 21.719. Tus datos nunca se comparten con terceros.
          </p>
          <p style="margin:0;">
            <a href="${forgetMeLink}" style="color:#1D9E75;">Eliminar permanentemente mis datos</a>
            — un click borra todo, sin necesidad de confirmar.
          </p>
        </td>
      </tr>
    </table>
  `;

  return `${html}\n${footer}`;
}
