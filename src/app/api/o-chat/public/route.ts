import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { SYSTEM_PROMPT_PUBLICO } from "@/lib/prompts/o-sistema-publico";

export const runtime = "nodejs";

// POST /api/o-chat/public
// Chat anónimo de la home (sin login, sin usuario_id) — identificado solo
// por sesion_id (ver lib/sesion-anonima.ts). Pensado para el botón
// "Hablar con O ahora" del hero: una conversación libre de acompañamiento,
// sin funnel de ventas ni estructura de módulos (eso es /api/chat y
// /api/o-chat respectivamente, para usuarios con programa).
//
// Formato de streaming (SSE) idéntico al de /api/chat / /api/o-chat /
// /api/programa-chat — así el mismo streamChat() del frontend sirve para
// los cuatro sin cambios.
//
// Solo guarda mensaje + respuesta de este turno en la DB (no el historial
// completo — sin sesión de chat persistente server-side). Sí acepta
// `historial` opcional en el body para que el modelo tenga contexto de la
// conversación en curso; ese historial lo mantiene el frontend (no se
// persiste acá) y se manda de vuelta en cada request, igual que /api/chat.

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CRISIS_SENTINEL = "[CRISIS]";

// Detecta y oculta las etiquetas de ejercicios ([[INICIAR_...]]) que el
// modelo puede dejar en su respuesta — igual que con [CRISIS], pero sin
// renderizar nada al usuario.
function limpiarEtiquetas(texto: string): string {
  return texto
    .replace(/\[\[.*?\]\]/g, "")
    .replace(/\[CRISIS\]/g, "")
    .replace(/\[EJERCICIO_RESPIRACION_4_7_8\]/g, "")
    .replace(/\[EJERCICIO_GROUNDING_5_4_3_2_1\]/g, "")
    .trim();
}

interface HistorialMensaje {
  role: "user" | "assistant";
  content: string;
}

interface PublicChatBody {
  sesion_id?: string;
  mensaje?: string;
  historial?: HistorialMensaje[];
}

function detectarTemas(texto: string): string[] {
  const t = texto.toLowerCase();
  const temas: string[] = [];
  if (t.includes("ansiedad") || t.includes("ansioso") || t.includes("ansiosa")) temas.push("ansiedad");
  if (t.includes("pareja") || t.includes("relación")) temas.push("pareja");
  if (t.includes("estrés") || t.includes("estresad")) temas.push("estres");
  if (t.includes("depresión") || t.includes("triste")) temas.push("depresion");
  return temas;
}

export async function POST(req: Request) {
  let body: PublicChatBody;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const { sesion_id, mensaje } = body;
  if (!sesion_id || !mensaje) {
    return new Response("Faltan campos: sesion_id, mensaje", { status: 400 });
  }

  const historial = Array.isArray(body.historial)
    ? body.historial.filter(
        (m): m is HistorialMensaje =>
          (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
      )
    : [];

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        const claudeStream = anthropic.messages.stream({
          model: "claude-sonnet-5",
          max_tokens: 500,
          system: SYSTEM_PROMPT_PUBLICO,
          messages: [...historial, { role: "user" as const, content: mensaje }],
        });

        // Este system prompt (a diferencia de los otros de la app) no exige
        // que la respuesta de crisis sea ÚNICAMENTE el sentinel — el modelo
        // puede seguir con texto propio (números, contención). Por eso no
        // basta con comparar la respuesta completa contra el sentinel: en
        // cuanto el texto acumulado EMPIEZA con "[CRISIS]" quedamos en modo
        // crisis y dejamos de revelar cualquier cosa, para no filtrar nunca
        // el token crudo ni texto de crisis no auditado al usuario.
        let held = "";
        let revealed = false;
        let crisisConfirmada = false;

        claudeStream.on("text", (delta) => {
          if (crisisConfirmada) return;
          held += delta;

          if (revealed) {
            send({ type: "text", text: delta });
            return;
          }
          if (held.startsWith(CRISIS_SENTINEL)) {
            crisisConfirmada = true;
            return;
          }
          if (CRISIS_SENTINEL.startsWith(held)) return;
          revealed = true;
          send({ type: "text", text: held });
        });

        const finalMessage = await claudeStream.finalMessage();
        let fullText = finalMessage.content
          .filter((block) => block.type === "text")
          .map((block) => (block.type === "text" ? block.text : ""))
          .join("")
          .trim();

        fullText = limpiarEtiquetas(fullText);

        const esCrisis = crisisConfirmada || fullText.startsWith(CRISIS_SENTINEL);
        const supabase = getSupabaseServerClient();

        const { error: insertError } = await supabase.from("chat_public_anonymous").insert({
          sesion_id,
          usuario_mensaje: mensaje,
          o_respuesta: esCrisis ? CRISIS_SENTINEL : fullText,
          temas_detectados: detectarTemas(mensaje),
          es_crisis: esCrisis,
        });
        if (insertError) {
          console.error("No se pudo guardar el turno en chat_public_anonymous:", insertError);
        }

        if (esCrisis) {
          send({ type: "crisis" });
          send({ type: "done" });
          return;
        }

        send({ type: "done" });
      } catch (err) {
        console.error("Error en /api/o-chat/public:", err);
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
