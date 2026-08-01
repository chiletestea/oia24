import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { SYSTEM_PROMPT_PUBLICO } from "@/lib/prompts/o-sistema-publico";
import { createCrisisStreamFilter, CRISIS_SENTINEL } from "@/lib/crisis-filter";

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

// Detecta y oculta las etiquetas de ejercicios ([[INICIAR_...]]) que el
// modelo puede dejar en su respuesta — igual que con [CRISIS], pero sin
// renderizar nada al usuario.
function limpiarEtiquetas(texto: string): string {
  return texto
    .replace(/\[\[.*?\]\]/g, "")
    .replace(/\[CRISIS\]/g, "")
    .replace(/\[EJERCICIO_RESPIRACION_4_7_8\]/g, "")
    .replace(/\[EJERCICIO_GROUNDING_5_4_3_2_1\]/g, "")
    .replace(/\[EJERCICIO_PENDULACION\]/g, "")
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
      // El SDK de Anthropic puede emitir un último evento "text" ya iniciado
      // el cierre (una carrera entre el listener y el await de
      // finalMessage()) — eso hacía que controller.enqueue() lanzara
      // "Invalid state: Controller is already closed" DESPUÉS de que ya
      // habíamos mandado "done"/cerrado el stream. Como esa excepción no
      // quedaba atrapada por el try/catch de más abajo (ocurre en un tick
      // posterior), el cliente se quedaba esperando un evento que nunca
      // llegaba — de ahí el "escribiendo..." pegado sin respuesta. Con este
      // flag, cualquier envío tardío simplemente se ignora en vez de romper
      // el stream ya cerrado.
      let cerrado = false;
      const send = (event: object) => {
        if (cerrado) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          cerrado = true;
        }
      };
      const cerrar = () => {
        if (cerrado) return;
        cerrado = true;
        try {
          controller.close();
        } catch {
          // ya estaba cerrado por el lado del cliente/transporte — nada que hacer
        }
      };

      // Vigía de inactividad: si Anthropic se cuelga a mitad de stream sin
      // emitir texto ni error (una llamada colgada, no un error explícito),
      // antes esto dejaba el request abierto para siempre y el cliente
      // pegado en "escribiendo..." sin límite. Se rearma en cada delta de
      // texto recibido, así que una respuesta larga pero activa nunca se
      // corta — solo se corta si deja de llegar CUALQUIER dato por este
      // tiempo. 30s resultó demasiado agresivo: abortó una respuesta real de
      // Gottman comparado que solo era lenta (~7-8s es lo normal, pero hubo
      // una que necesitó más y el timeout la mató a los 30s en vez de
      // dejarla terminar). 60s da margen a picos de latencia normales sin
      // dejar de proteger contra un cuelgue de verdad indefinido.
      const IDLE_TIMEOUT_MS = 60_000;
      const abortController = new AbortController();
      let idleTimer: ReturnType<typeof setTimeout> | undefined;
      function rearmarIdleTimer() {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => abortController.abort(), IDLE_TIMEOUT_MS);
      }
      rearmarIdleTimer();

      try {
        const claudeStream = anthropic.messages.stream(
          {
            model: "claude-sonnet-5",
            // claude-sonnet-5 corre "adaptive thinking" por default incluso
            // sin pasar `thinking` — y max_tokens es un techo COMPARTIDO entre
            // el razonamiento invisible y el texto visible. En clasificaciones
            // más complejas (p. ej. Gottman comparado) el razonamiento por sí
            // solo llegó a consumir los 500 tokens completos, dejando la
            // respuesta visible vacía (finalMessage.content = solo un bloque
            // "thinking", stop_reason "max_tokens"). Esta app no usa tool use
            // estructurado, así que el riesgo conocido de desactivar thinking
            // (llamadas a herramientas colándose como texto plano) no aplica
            // acá — se desactiva para que TODO el presupuesto vaya al texto.
            thinking: { type: "disabled" },
            max_tokens: 800,
            system: SYSTEM_PROMPT_PUBLICO,
            messages: [...historial, { role: "user" as const, content: mensaje }],
          },
          { signal: abortController.signal }
        );

        // Este system prompt (a diferencia de los otros de la app) no exige
        // que la respuesta de crisis sea ÚNICAMENTE el sentinel — el modelo
        // puede seguir con texto propio (números, contención). El filtro
        // detecta [CRISIS] en CUALQUIER posición del stream (no solo si es
        // el primer carácter absoluto): si el modelo antepone aunque sea una
        // palabra antes del sentinel, antes esto ni activaba el modo crisis
        // ni dejaba de filtrar el tag — se veía "[CRISIS]" como texto plano.
        const crisisFilter = createCrisisStreamFilter();

        claudeStream.on("text", (delta) => {
          rearmarIdleTimer();
          const { safeText } = crisisFilter.push(delta);
          if (safeText) send({ type: "text", text: safeText });
        });

        const finalMessage = await claudeStream.finalMessage();
        clearTimeout(idleTimer);
        // Texto retenido que nunca llegó a completar el sentinel (falso
        // positivo de buffering) se libera recién acá.
        const leftover = crisisFilter.flush();
        if (leftover) send({ type: "text", text: leftover });

        const rawFullText = finalMessage.content
          .filter((block) => block.type === "text")
          .map((block) => (block.type === "text" ? block.text : ""))
          .join("")
          .trim();

        // Red de seguridad: si por lo que sea el filtro de streaming no lo
        // detectó pero el sentinel SÍ está en el texto crudo, igual lo
        // tratamos como crisis. Ojo: esta comprobación debe hacerse ANTES de
        // limpiarEtiquetas() — limpiarEtiquetas() borra "[CRISIS]" del texto,
        // así que revisar fullText ya limpio nunca podía detectar nada (el
        // fallback original tenía este bug).
        const esCrisis = crisisFilter.crisisDetected || rawFullText.includes(CRISIS_SENTINEL);
        const fullText = limpiarEtiquetas(rawFullText);

        // Diagnóstico temporal: ya van varios reportes de "Disculpa, no me
        // salió una respuesta" (el fallback de texto vacío en el cliente)
        // sin una causa de código identificada — esto captura la forma real
        // de la respuesta de Anthropic cuando pasa, para saber si es
        // stop_reason=max_tokens, bloques no-texto, o algo más.
        if (!esCrisis && !fullText) {
          console.error(
            "Respuesta vacía de Claude — stop_reason:",
            finalMessage.stop_reason,
            "| tipos de bloque:",
            finalMessage.content.map((b) => b.type),
            "| usage:",
            finalMessage.usage,
            "| mensaje del usuario:",
            mensaje
          );
        }

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
        clearTimeout(idleTimer);
        cerrar();
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
