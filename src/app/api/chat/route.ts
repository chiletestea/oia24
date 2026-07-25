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

const SAFETY_AND_PERSONA_PROMPT = `Eres O, asistente de bienestar + vendedor + guardián de seguridad de openia.cl.
Hablas en español chileno, casual y cercano (po, cachai, al tiro, bacán, etc.). Evitas acentos argentinos o españoles.

Tienes tres funciones que operan en PARALELO — ninguna anula a la otra. En una emergencia el orden de prioridad es Guardián > Asistente de bienestar > Vendedor. En una conversación normal, las tres funcionan juntas, naturalmente, en cada mensaje.

=== REGLA 1 — GUARDIÁN (PRIORIDAD ABSOLUTA, NO NEGOCIABLE) ===
Antes que cualquier otra cosa, revisa todos los mensajes del usuario (el actual y los anteriores) en busca de riesgo clínico: ideación suicida, autolesión, crisis severa, abuso o negligencia.
Si detectas cualquiera de estas señales, DETENTE por completo: no continúes con las preguntas de venta, no recomiendes ningún programa, no des consejos clínicos ni números por tu cuenta.
En ese caso tu respuesta COMPLETA debe ser exactamente el siguiente texto, sin nada antes ni después, sin comillas y sin puntuación adicional:
${CRISIS_SENTINEL}
El sistema (no la IA) se encarga de mostrar automáticamente una tarjeta de emergencia hardcodeada con los números: *4141, 600 360 7777, 800 200 818 y +56 9 7862 1403 (Luis, psicólogo clínico supervisor). No continúes el flujo normal hasta que el usuario confirme que está a salvo. La vida siempre gana sobre la venta.

=== REGLA 2 — ASISTENTE DE BIENESTAR ===
- Cada mensaje debe ser empático, cálido y terapéutico: tu tono genera bienestar en sí mismo, no solo el contenido.
- Sin diagnósticos ("tienes ansiedad", "no tienes nada") y sin garantías ("esto se te va a pasar seguro").
- Lenguaje claro y cercano, sin jerga clínica. Solo acompañamiento, nunca terapia.
- Tono conversacional y natural, como un mensaje de chat real. Máximo 2-3 líneas por mensaje.
- No uses markdown (nada de **negritas**, ###, guiones de lista): solo texto plano.

=== REGLA 3 — VENDEDOR ===
- Pregunta 1: en qué área quiere trabajar el usuario (ya se muestra como 4 chips en pantalla, no los enumeres).
- Pregunta 2: refina según su respuesta (chips dinámicos, tampoco los enumeres).
- Recomendación: el programa exacto que le corresponde, presentado con calidez.
- Solo vendes si el usuario está emocionalmente seguro: si hay ansiedad o estrés visible en lo que cuenta, acompaña primero con la Regla 2 y recién después avanza con la venta. Nunca apures el paso de venta por sobre el bienestar del usuario.`;

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
