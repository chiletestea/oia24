import Anthropic from "@anthropic-ai/sdk";
import { parseEtiquetas, type Etiqueta } from "@/lib/etiquetas";
import { validarTokenAcceso } from "@/lib/middleware-token";
import { cerrarSesion } from "@/lib/cerrar-sesion";
import {
  contarModulosCompletados,
  crearSesion,
  decodificarMensajes,
  fetchPrograma,
  fetchSesionAbierta,
  fetchUltimaSesionCerrada,
  guardarMensajes,
  incrementarModuloActual,
  marcarModuloCompletado,
  marcarSesionComoCrisis,
} from "@/lib/o-chat-data";
import type { OChatMessage } from "@/types/privacy";

export const runtime = "nodejs";

// POST /api/programa-chat
// Endpoint real que usa la página /programa/[token]. Es funcionalmente muy
// parecido a /api/o-chat (construido en una fase anterior) — se dejan los
// dos por ahora porque el spec de este paso pidió explícitamente esta ruta
// nueva; avisar si se quiere retirar /api/o-chat para no mantener dos casi
// iguales.
//
// System prompt oficial "Ansiedad Bajo Control" — 9 reglas oro.

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CRISIS_SENTINEL = "[CRISIS]";

interface ProgramaChatBody {
  usuario_id?: string;
  programa_id?: string;
  modulo_numero: number;
  mensaje: string;
  token: string;
}

function buildSystemPrompt(params: {
  nombre: string | null;
  moduloActual: number;
  totalModulos: number;
  progreso: string;
  resumenUltimaSesion: string | null;
}): string {
  return `Eres O, guía digital de psicoeducación del programa "Ansiedad Bajo Control" de openia.cl.

IDENTIDAD CRÍTICA:
Soy una inteligencia artificial. Si preguntas quién soy, respondo: "Soy una IA".
No soy psicólogo, no soy terapeuta, soy un guía psicoeducativo.
Hablo español chileno auténtico: tuteo, directo, palabras como "bacán", "al tiro", "cachai", "po".
NUNCA uso markdown: sin **, sin ###, sin guiones, todo texto plano.

CONTEXTO DEL USUARIO:
Nombre: ${params.nombre || 'Usuario'}
Módulo actual: ${params.moduloActual}
Progreso: ${params.progreso}
Resumen última sesión: ${params.resumenUltimaSesion || 'Esta es tu primera sesión'}

=== 9 REGLAS ORO (INVIOLABLES) ===

REGLA 1 — NUNCA DIAGNOSTICO:
No puedo decir "tienes ansiedad generalizada", "esto es burnout", "parece psicosis".
Puedo describir síntomas, usar escalas como referencia.
Nunca hago etiqueta clínica.

REGLA 2 — NUNCA GARANTIZO RESULTADOS:
No puedo decir "vas a mejorar", "esto te va a curar", "en X semanas estarás bien".
Siempre respeto la incertidumbre.

REGLA 3 — NUNCA IGNORO RIESGO:
Si hay ideación suicida, autolesión, psicosis, crisis: DETENGO TODO.
Respondo EXACTAMENTE: ${CRISIS_SENTINEL}

REGLA 4 — NUNCA REEMPLAZO PSICÓLOGO:
Soy psicoeducación solo. No hago terapia, no interpreto inconsciente.
Si necesitas más: "Esto va más allá. Necesitas a Luis o un profesional".

REGLA 5 — NUNCA SALTO MÓDULOS:
La secuencia existe por razones clínicas.
Si piden saltar: explico POR QUÉ no es posible.

REGLA 6 — NUNCA CEDO A REASSURANCE:
Si buscan tranquilidad falsa: no lo hago.
Promociono tolerancia a incertidumbre.

REGLA 7 — NUNCA MIENTO MI NATURALEZA:
Si preguntan "¿eres IA?": "Sí, soy una inteligencia artificial".

REGLA 8 — NUNCA EXPONGO CONVERSACIONES:
Esto es PRIVADO. Luis puede revisar resúmenes ocasionalmente, nunca chats completos.

REGLA 9 — NUNCA USO MARKDOWN:
Sin **, sin ###, sin guiones. Todo texto plano.

=== ESTRUCTURA DE CADA SESIÓN ===
1. Aprender — psicoeducación breve
2. Reflexionar — pregunta de conexión personal
3. Practicar — ejercicio concreto guiado
4. Registrar — el usuario anota su experiencia
5. Evaluar — O pregunta cómo se sintió

=== INSTRUMENTOS (SOLO GAD-7) ===
Módulo 0 (inicio): [[INICIAR_GAD7]]
Módulo 8 (final): [[INICIAR_GAD7]]

=== CIERRE DE MÓDULO ===
Al completar hito:
[[MODULO_COMPLETADO:${params.moduloActual}]]
[HITO_COMPLETADO]

=== PRIVACIDAD ===
"Lo que conversamos aquí es privado. Luis no lee estos chats. Puede revisar ocasionalmente resúmenes — nunca el chat completo."

=== EMERGENCIA ===
Números: *4141 / 600 360 7777 / 800 200 818 / ${process.env.CRISIS_PHONE_LUIS || 'contacto profesional'}
`;
}

export async function POST(req: Request) {
  let body: ProgramaChatBody;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const { modulo_numero, mensaje, token } = body;
  if (!token || typeof modulo_numero !== "number" || typeof mensaje !== "string") {
    return new Response("Faltan campos: token, modulo_numero, mensaje", { status: 400 });
  }

  const { valido, usuario } = await validarTokenAcceso(token);
  if (!valido || !usuario || !usuario.programa_id) {
    return new Response("Token inválido o expirado", { status: 401 });
  }

  const programa = await fetchPrograma(usuario.programa_id);
  if (!programa) {
    return new Response("Programa no encontrado", { status: 404 });
  }

  const [sesionExistente, ultimaSesion, completados] = await Promise.all([
    fetchSesionAbierta(usuario.id, programa.id, modulo_numero),
    fetchUltimaSesionCerrada(usuario.id),
    contarModulosCompletados(usuario.id, programa.id),
  ]);

  const sesion = sesionExistente ?? (await crearSesion(usuario.id, programa.id, modulo_numero));
  const historial = decodificarMensajes(sesion);
  const mensajesConversacion: OChatMessage[] = [...historial, { role: "user", content: mensaje }];

  const system = buildSystemPrompt({
    nombre: usuario.nombre,
    moduloActual: modulo_numero,
    totalModulos: programa.modulos,
    progreso: `${completados} de ${programa.modulos}`,
    resumenUltimaSesion: ultimaSesion?.resumen_ia ?? null,
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

        mensajesConversacion.push({ role: "assistant", content: textoLimpio });
        await guardarMensajes(sesion.id, mensajesConversacion);

        const moduloCompletado = etiquetas.find((e: Etiqueta) => e.tipo === "MODULO_COMPLETADO");
        if (moduloCompletado?.numero !== undefined) {
          await marcarModuloCompletado(usuario.id, programa.id, moduloCompletado.numero);
          // Recargamos la sesión con los mensajes recién guardados para el resumen de cierre.
          const sesionParaResumen = await fetchSesionAbierta(
            usuario.id,
            programa.id,
            modulo_numero
          );
          if (sesionParaResumen) {
            await cerrarSesion(sesionParaResumen, usuario, programa);
          }
          await incrementarModuloActual(usuario.id, moduloCompletado.numero);
        }

        if (acciones.length > 0) {
          send({ type: "acciones", acciones, etiquetas });
        }

        send({ type: "done" });
      } catch (err) {
        console.error("Error en /api/programa-chat:", err);
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
