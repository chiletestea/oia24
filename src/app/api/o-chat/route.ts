import Anthropic from "@anthropic-ai/sdk";
import { parseEtiquetas, type Etiqueta } from "@/lib/etiquetas";
import { resumenContextoReinicio } from "@/lib/email-templates";
import { TONO_CHILENO } from "@/lib/prompts/o-tono";
import {
  crearSesion,
  decodificarMensajes,
  fetchPrograma,
  fetchSesionAbierta,
  fetchUltimaSesionCerrada,
  fetchUsuario,
  guardarMensajes,
  marcarModuloCompletado,
  marcarSesionComoCrisis,
} from "@/lib/o-chat-data";
import type { OChatMessage } from "@/types/privacy";

export const runtime = "nodejs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CRISIS_SENTINEL = "[CRISIS]";

interface OChatBody {
  usuario_id: string;
  programa_id: string;
  modulo: number;
  mensaje: string;
}

function buildSystemPrompt(params: {
  programaNombre: string;
  moduloNumero: number;
  totalModulos: number;
  contextoReinicio: string | null;
}): string {
  const { programaNombre, moduloNumero, totalModulos, contextoReinicio } = params;

  return `Eres O, guía de bienestar de openia.cl. Acompañas a alguien que ya compró el programa "${programaNombre}" y está trabajando el Módulo ${moduloNumero} de ${totalModulos}.
${TONO_CHILENO}

Tienes dos funciones en PARALELO — ninguna anula a la otra. En una emergencia el orden de prioridad es Guardián > Guía de bienestar.

=== REGLA 1 — GUARDIÁN (PRIORIDAD ABSOLUTA, NO NEGOCIABLE) ===
Antes que cualquier otra cosa, revisa todos los mensajes del usuario (el actual y los anteriores) en busca de riesgo clínico: ideación suicida, autolesión, crisis severa, abuso o negligencia.
Si detectas cualquiera de estas señales, DETENTE por completo: no sigas guiando el módulo, no emitas ninguna otra etiqueta.
En ese caso tu respuesta COMPLETA debe ser exactamente el siguiente texto, sin nada antes ni después, sin comillas y sin puntuación adicional:
${CRISIS_SENTINEL}
El sistema (no la IA) se encarga de mostrar automáticamente una tarjeta de emergencia hardcodeada. No continúes el flujo normal hasta que el usuario confirme que está a salvo. La vida siempre gana sobre el programa.

=== REGLA 2 — GUÍA DE BIENESTAR Y DEL MÓDULO ===
- Cada mensaje debe ser empático, cálido y terapéutico: tu tono genera bienestar en sí mismo.
- Sin diagnósticos ni garantías. Lenguaje claro y cercano, sin jerga clínica. Solo acompañamiento, nunca terapia.
- Tono conversacional, como un mensaje de chat real. Máximo 2-4 líneas por mensaje. Sin markdown.
- Guía al usuario a través del Módulo ${moduloNumero} a su ritmo, con preguntas y ejercicios breves — no le sueltes teoría en bloque.
- Cuando el usuario haya trabajado lo central del módulo y esté listo para avanzar, incluye en tu respuesta (al final, no lo menciones en el texto) el marcador [[MODULO_COMPLETADO:${moduloNumero}]].
- Si te parece valioso medir su ansiedad o desgaste con un instrumento validado, incluye [[SOLICITAR_EVALUACION:${moduloNumero}]] y el marcador específico correspondiente: [[INICIAR_GAD7]] (ansiedad general), [[INICIAR_BAI]] (síntomas de ansiedad física) o [[INICIAR_OLBI]] (desgaste/burnout laboral) — el que mejor calce con lo que está contando.
- Para celebrar un logro significativo (no necesariamente el cierre del módulo) puedes usar [HITO_COMPLETADO].
- Estos marcadores son invisibles para el usuario — el sistema los procesa y los quita antes de mostrarle el mensaje. Nunca los expliques ni los menciones en tu texto.
${contextoReinicio ? `\n=== CONTEXTO DE REINICIO ===\n${contextoReinicio}` : ""}`;
}

export async function POST(req: Request) {
  let body: OChatBody;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const { usuario_id, programa_id, modulo, mensaje } = body;
  if (!usuario_id || !programa_id || typeof modulo !== "number" || typeof mensaje !== "string") {
    return new Response("Faltan campos: usuario_id, programa_id, modulo, mensaje", {
      status: 400,
    });
  }

  const [usuario, programa, sesionExistente] = await Promise.all([
    fetchUsuario(usuario_id),
    fetchPrograma(programa_id),
    fetchSesionAbierta(usuario_id, programa_id, modulo),
  ]);

  if (!usuario || !programa) {
    return new Response("Usuario o programa no encontrado", { status: 404 });
  }

  const esSesionNueva = !sesionExistente;
  const sesion = sesionExistente ?? (await crearSesion(usuario_id, programa_id, modulo));

  const historial = decodificarMensajes(sesion);
  const contextoReinicio = esSesionNueva
    ? resumenContextoReinicio({
        nombre: usuario.nombre,
        moduloNumero: modulo,
        resumenAnterior: (await fetchUltimaSesionCerrada(usuario_id))?.resumen_ia ?? null,
      })
    : null;

  const mensajesConversacion: OChatMessage[] = [...historial, { role: "user", content: mensaje }];

  const system = buildSystemPrompt({
    programaNombre: programa.nombre,
    moduloNumero: modulo,
    totalModulos: programa.modulos,
    contextoReinicio,
  });

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
          system,
          messages: mensajesConversacion.map((m) => ({ role: m.role, content: m.content })),
        });

        let held = "";
        let revealed = false;

        claudeStream.on("text", (delta) => {
          held += delta;
          if (revealed) {
            send({ type: "text", text: delta });
            return;
          }
          // Retenemos mientras el texto acumulado sea un posible prefijo del
          // sentinel de crisis, para nunca mostrar "[CRI..." en pantalla.
          if (CRISIS_SENTINEL.startsWith(held)) return;
          revealed = true;
          send({ type: "text", text: held });
        });

        const finalMessage = await claudeStream.finalMessage();
        const fullText = finalMessage.content
          .filter((block) => block.type === "text")
          .map((block) => (block.type === "text" ? block.text : ""))
          .join("")
          .trim();

        if (fullText === CRISIS_SENTINEL) {
          send({ type: "crisis" });
          mensajesConversacion.push({ role: "assistant", content: CRISIS_SENTINEL });
          await guardarMensajes(sesion.id, mensajesConversacion);
          await marcarSesionComoCrisis(sesion.id);
          send({ type: "done" });
          return;
        }

        const { textoLimpio, etiquetas, acciones } = parseEtiquetas(fullText);

        const moduloCompletado = etiquetas.find((e: Etiqueta) => e.tipo === "MODULO_COMPLETADO");
        if (moduloCompletado?.numero !== undefined) {
          await marcarModuloCompletado(usuario_id, programa_id, moduloCompletado.numero);
        }

        mensajesConversacion.push({ role: "assistant", content: textoLimpio });
        await guardarMensajes(sesion.id, mensajesConversacion);

        if (acciones.length > 0) {
          send({ type: "acciones", acciones, etiquetas });
        }

        send({ type: "done" });
      } catch (err) {
        console.error("Error en /api/o-chat:", err);
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
