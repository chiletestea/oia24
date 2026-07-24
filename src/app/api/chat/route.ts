import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { Area, ChatMessage, ChatRequestBody, Program, Step } from "@/types/chat";

export const runtime = "nodejs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CRISIS_SENTINEL = "[CRISIS]";

const AREA_TO_PROGRAM_NAME: Record<Area, string> = {
  ansiedad: "Ansiedad Bajo Control",
  trabajo: "Respira en el Trabajo",
  mente: "Deja de Sobrepensar",
  urgente: "Regulación Express",
};

const SAFETY_AND_PERSONA_PROMPT = `Eres O, el asistente IA de openia.cl. Tu rol es entender en qué área quiere trabajar el usuario a través de 2 preguntas precisas y recomendarle exactamente el programa que necesita.
Hablas en español chileno. Usas vocabulario y tono natural de Chile (po, cachai, al tiro, bacán, etc.). Evitas acentos argentinos o españoles.

=== REGLA 1 — SEGURIDAD CLÍNICA (PRIORIDAD ABSOLUTA, NO NEGOCIABLE) ===
Antes que cualquier otra cosa, revisa todos los mensajes del usuario (el actual y los anteriores) en busca de señales de riesgo clínico: ideación suicida, autolesión, crisis severa, abuso o negligencia.
Si detectas cualquiera de estas señales, DETENTE por completo: no continúes con las preguntas de venta, no recomiendes ningún programa, no dés consejos clínicos ni números por tu cuenta.
En ese caso tu respuesta COMPLETA debe ser exactamente el siguiente texto, sin nada antes ni después, sin comillas y sin puntuación adicional:
${CRISIS_SENTINEL}
El sistema se encarga de mostrar los recursos de emergencia automáticamente al ver ese texto.

=== REGLAS ABSOLUTAS ===
- Nunca des diagnósticos ("tienes ansiedad", "no tienes nada").
- Nunca des garantías ("esto se te va a pasar", "esto te va a funcionar seguro").
- Lenguaje claro, empático y cercano, sin jerga clínica.
- Tono conversacional y natural, como un mensaje de chat real.
- Máximo 2-3 líneas por mensaje.
- No uses markdown (nada de **negritas**, ###, guiones de lista): solo texto plano.`;

function buildStepInstruction(step: Step, area?: Area, program?: Program | null): string {
  switch (step) {
    case "q1":
      return `Este es el inicio de la conversación; el usuario todavía no eligió nada. Salúdalo en una línea y pregúntale en qué área quiere trabajar hoy. No enumeres opciones: ya se muestran como botones en pantalla.`;

    case "q2": {
      if (area === "ansiedad") {
        return `El usuario acaba de decir que la ansiedad no lo deja vivir. Reconoce brevemente lo que compartió y pregúntale cuándo la siente más. No enumeres opciones: ya se muestran como botones en pantalla.`;
      }
      if (area === "trabajo") {
        return `El usuario acaba de decir que el trabajo lo tiene agotado. Reconoce brevemente lo que compartió y pregúntale si es más agotamiento crónico o estrés puntual. No enumeres opciones: ya se muestran como botones en pantalla.`;
      }
      if (area === "mente") {
        return `El usuario acaba de decir que su mente no para nunca. Reconoce brevemente lo que compartió y pregúntale si son pensamientos en bucle. No enumeres opciones: ya se muestran como botones en pantalla.`;
      }
      return `Reconoce brevemente lo que el usuario compartió y haz una pregunta de seguimiento breve para entender mejor su situación.`;
    }

    case "recommendation": {
      const nombre = program?.nombre ?? "el programa recomendado";
      return `El usuario ya respondió tus preguntas. Según lo que compartió, el programa que le corresponde es "${nombre}". Preséntaselo de forma cálida y personalizada en 2-3 líneas, conectándolo con lo que te contó y explicando brevemente para qué le sirve. No menciones el precio ni la cantidad de módulos en tu texto: ya se muestran en una tarjeta en pantalla. No incluyas un botón ni un enlace: el botón "Empezar" ya aparece en pantalla.`;
    }

    case "freeform":
    default:
      return `El usuario escribió un mensaje libre en vez de elegir una de las opciones visibles en pantalla. Respóndele en una línea de forma breve y empática, y guíalo con amabilidad a elegir una de las opciones visibles para continuar. No inventes un flujo nuevo.`;
  }
}

async function fetchProgram(area?: Area): Promise<Program | null> {
  if (!area) return null;
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("programas")
    .select("nombre, descripcion, precio, modulos, color");

  if (error || !data) return null;

  const targetName = AREA_TO_PROGRAM_NAME[area];
  return (data as Program[]).find((p) => p.nombre === targetName) ?? null;
}

export async function POST(req: Request) {
  let body: ChatRequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const { messages, step, area } = body;

  if (!Array.isArray(messages) || typeof step !== "string") {
    return new Response("Invalid request body", { status: 400 });
  }

  const program = step === "recommendation" ? await fetchProgram(area) : null;

  const system = `${SAFETY_AND_PERSONA_PROMPT}\n\n=== TU SIGUIENTE MENSAJE ===\n${buildStepInstruction(
    step,
    area,
    program
  )}`;

  const apiMessages: ChatMessage[] =
    messages.length > 0
      ? messages
      : [{ role: "user", content: "Hola, ¿en qué área quieres trabajar hoy?" }];

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        const claudeStream = anthropic.messages.stream({
          model: "claude-sonnet-5",
          max_tokens: 300,
          system,
          messages: apiMessages.map((m) => ({ role: m.role, content: m.content })),
        });

        claudeStream.on("text", (delta) => {
          send({ type: "text", text: delta });
        });

        const finalMessage = await claudeStream.finalMessage();
        const fullText = finalMessage.content
          .filter((block) => block.type === "text")
          .map((block) => (block.type === "text" ? block.text : ""))
          .join("")
          .trim();

        if (fullText === CRISIS_SENTINEL) {
          send({ type: "crisis" });
        } else if (program) {
          send({ type: "program", program });
        }

        send({ type: "done" });
      } catch (err) {
        console.error("Error en /api/chat:", err);
        send({ type: "error", message: "Hubo un problema. Intenta de nuevo en un momento." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
