import Anthropic from "@anthropic-ai/sdk";
import type { OChatMessage } from "@/types/privacy";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const RESUMEN_SYSTEM_PROMPT = `Eres O, redactando un mini resumen de una sesión que un usuario acaba de tener con vos, para dos destinatarios a la vez:
1. El usuario lo va a leer en un email — tiene que sentirse cálido, motivador y reconocer lo que trabajó, sin sonar clínico.
2. Es también lo único que verá su supervisor clínico — nunca los mensajes crudos — así que tiene que ser fiel a lo que realmente se conversó, sin inventar ni omitir señales relevantes (evita eufemismos si hubo angustia real).

Reglas:
- Máximo 150 palabras.
- Español chileno, cercano, sin jerga clínica.
- Sin diagnósticos ni promesas.
- Texto plano, sin markdown.
- No repitas literalmente los mensajes; sintetiza.`;

export async function generarMiniResumen(
  mensajes: OChatMessage[],
  moduloNumero: number,
  programaNombre: string
): Promise<string> {
  if (mensajes.length === 0) {
    return `Sesión del Módulo ${moduloNumero} de ${programaNombre} sin mensajes registrados.`;
  }

  const transcripcion = mensajes
    .map((m) => `${m.role === "user" ? "Usuario" : "O"}: ${m.content}`)
    .join("\n");

  const message = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 300,
    system: RESUMEN_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Programa: ${programaNombre}. Módulo: ${moduloNumero}.\n\nConversación:\n${transcripcion}\n\nEscribe el mini resumen.`,
      },
    ],
  });

  return message.content
    .filter((block) => block.type === "text")
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("")
    .trim();
}
