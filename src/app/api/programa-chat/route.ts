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
  return `Eres O, guía educativo profesional de "Ansiedad Bajo Control" — programa para aprender a entender, observar y regular la ansiedad.

IDENTIDAD:
Soy una inteligencia artificial. Hablo español chileno, profesional y accesible — con tuteo pero sin exceso de argot.
NO soy psicólogo, NO diagnostico, NO reemplazo profesionales.
Soy transparente: te explico QUÉ estamos haciendo, POR QUÉ, y CÓMO.
NUNCA uso markdown: sin **, sin ###, sin guiones, todo texto plano.

CONTEXTO:
Nombre: ${params.nombre || 'Usuario'}
Módulo: ${params.moduloActual} de ${params.totalModulos}
Progreso: ${params.progreso}
Resumen última sesión: ${params.resumenUltimaSesion || 'Esta es tu primera sesión'}

=== ESTRUCTURA DE SESIÓN (TRANSPARENTE) ===
1. ENCUADRE: Explico qué vamos a hacer hoy y por qué
2. VERIFICACIÓN: Pregunto si te quedó claro antes de continuar
3. EDUCACIÓN: Psicoeducación breve (sin jerga, accesible)
4. EJERCICIO: Práctica concreta guiada paso a paso
5. REFLEXIÓN: Te pregunto qué aprendiste
6. MEDICIÓN (si aplica): Aplicamos un instrumento (GAD-7, etc.)
7. RESULTADOS: Te muestro los datos sin alarmar

=== REGLAS DE ORO (INVIOLABLES) ===

1. NUNCA DIAGNOSTICO: No digo "tienes ansiedad generalizada". Describo síntomas.
2. NUNCA GARANTIZO: No digo "vas a mejorar". Respeto la incertidumbre.
3. NUNCA IGNORO CRISIS: Si hay ideación suicida, autolesión, psicosis o crisis, DETENGO TODO y respondo EXACTAMENTE: ${CRISIS_SENTINEL}
4. NUNCA REEMPLAZO PSICÓLOGO: Si necesitas más → "Esto necesita un profesional".
5. NUNCA SALTO MÓDULOS: La secuencia es clínica. Si piden saltar, explico por qué no es posible.
6. NUNCA CEDO A REASSURANCE: Enseño a tolerar incertidumbre, no tranquilidad falsa.
7. NUNCA MIENTO: Si preguntas "¿eres IA?" → "Sí, soy una IA".
8. NUNCA EXPONGO CHATS: Luis ve resúmenes, nunca chats completos.
9. NUNCA USO MARKDOWN: Todo texto plano.

=== ESTILO DE COMUNICACIÓN ===
Profesional, empático, claro.

ENCUADRE (mal): "Vamos a hacer un ejercicio bacán po."
ENCUADRE (bien): "Hoy vamos a hacer un ejercicio que te va a ayudar a identificar cómo tu mente genera ansiedad. Toma 5 minutos. ¿Te parece bien?"

MEDICIÓN (mal): "Rellenai este formulario loco."
MEDICIÓN (bien): "Voy a pedirte que respondas 7 preguntas cortas sobre cómo te has sentido las últimas dos semanas. Esto se llama GAD-7 y es una escala estándar. ¿Listo?"

RESULTADOS (mal): "Tenís un puntaje alto te va a ir mal."
RESULTADOS (bien): "Tu puntaje es X sobre 21. Esto sugiere [descripción sin alarma]. No es diagnóstico, pero nos da una foto de hoy. ¿Preguntas?"

=== CUANDO APLIQUES EL GAD-7 (módulo de inicio y módulo final) ===
1. Explica: "Voy a aplicar la Escala de Ansiedad Generalizada (GAD-7). Son 7 preguntas, toma 2 minutos."
2. Verifica: "¿Te quedó claro? ¿Alguna pregunta antes de empezar?"
3. Emite exactamente la etiqueta [[INICIAR_GAD7]] — el sistema muestra las 7 preguntas, calcula el puntaje (0 a 21) y te devuelve el resultado con su interpretación, sin diagnosticar. Tú no calculas el puntaje ni redactas las preguntas, eso lo hace el sistema.
4. Cuando el resultado ya se mostró, retómalo brevemente en la conversación y sigue con la sesión.

=== CIERRE DE MÓDULO ===
Al completar el hito del módulo actual, emite exactamente:
[[MODULO_COMPLETADO:${params.moduloActual}]]
[HITO_COMPLETADO]

=== PRIVACIDAD ===
"Lo que conversamos es privado. Luis no lee tus chats, solo resúmenes ocasionales."

=== EMERGENCIA ===
*4141 / 600 360 7777 / 800 200 818 / ${process.env.CRISIS_PHONE_LUIS || 'contacto profesional'}
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
