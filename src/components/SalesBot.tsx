"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import OFace, { type Emotion } from "@/components/OFace";
import CrisisCard from "@/components/CrisisCard";
import EjercicioRespiracion from "@/components/EjercicioRespiracion";
import EjercicioGrounding from "@/components/EjercicioGrounding";
import EjercicioPendulacion from "@/components/EjercicioPendulacion";
import EjercicioCuadrada from "@/components/EjercicioCuadrada";
import EjercicioGottman, { type GottmanResultado, type GottmanScores } from "@/components/EjercicioGottman";
import LuisContactCard from "@/components/LuisContactCard";
import FeedbackModal from "@/components/FeedbackModal";
import { obtenerSesionAnonima } from "@/lib/sesion-anonima";
import type { ChatMessage, ChatStreamEvent, Step } from "@/types/chat";

const SALUDO_INICIAL =
  "Hola, soy O. Estoy aquí para escucharte, sin apuro y sin juicios. ¿Qué tienes en mente?";

const EJERCICIO_RESPIRACION_SENTINEL = "[EJERCICIO_RESPIRACION_4_7_8]";
const EJERCICIO_GROUNDING_SENTINEL = "[EJERCICIO_GROUNDING_5_4_3_2_1]";
const EJERCICIO_PENDULACION_SENTINEL = "[EJERCICIO_PENDULACION]";
const EJERCICIO_CUADRADA_SENTINEL = "[EJERCICIO_RESPIRACION_CUADRADA]";
const EJERCICIO_GOTTMAN_SENTINEL = "[EJERCICIO_GOTTMAN]";
// CONTACTO_LUIS: O ya tiene el "sí" (el usuario lo pidió directo) -> tarjeta
// inmediata. PREGUNTA_LUIS: O quiere sugerirlo por su cuenta -> primero
// pregunta y espera confirmación explícita antes de mostrar la tarjeta.
const CONTACTO_LUIS_SENTINEL = "[CONTACTO_LUIS]";
const PREGUNTA_LUIS_SENTINEL = "[PREGUNTA_LUIS]";

function limpiarEtiquetas(texto: string): string {
  return texto
    .replace(EJERCICIO_RESPIRACION_SENTINEL, "")
    .replace(EJERCICIO_GROUNDING_SENTINEL, "")
    .replace(EJERCICIO_PENDULACION_SENTINEL, "")
    .replace(EJERCICIO_CUADRADA_SENTINEL, "")
    .replace(EJERCICIO_GOTTMAN_SENTINEL, "")
    .replace(CONTACTO_LUIS_SENTINEL, "")
    .replace(PREGUNTA_LUIS_SENTINEL, "")
    .trim();
}

// Si O propuso un ejercicio directamente vía sentinel en su respuesta (en vez
// de vía detección de síntomas), igual queremos mostrar la tarjeta de
// elección con COMENZAR + alternativas en lugar de saltar directo a pantalla
// completa. Esto identifica cuál ejercicio corresponde al sentinel presente.
function detectarEjercicioPorSentinel(texto: string): ExerciseKey | null {
  if (texto.includes(EJERCICIO_RESPIRACION_SENTINEL)) return "respiracion";
  if (texto.includes(EJERCICIO_GROUNDING_SENTINEL)) return "grounding";
  if (texto.includes(EJERCICIO_CUADRADA_SENTINEL)) return "cuadrada";
  if (texto.includes(EJERCICIO_PENDULACION_SENTINEL)) return "pendulacion";
  if (texto.includes(EJERCICIO_GOTTMAN_SENTINEL)) return "gottman";
  return null;
}

const WORRIED_PATTERN = /ansiedad|estr[eé]s|preocupad/i;
const CRISIS_KEYWORD_PATTERN = /urgente|ayuda|crisis/i;

// Capa de recomendación: sugiere un ejercicio en base a palabras clave del
// último mensaje del usuario. Es puramente aditiva — no reemplaza ni altera
// las etiquetas [EJERCICIO_*] que O puede emitir directamente vía el prompt.
type ExerciseKey = "respiracion" | "grounding" | "cuadrada" | "pendulacion" | "gottman";

interface ExerciseInfo {
  nombre: string;
  minutos: number;
  emoji: string;
  tag: string;
}

const EXERCISE_INFO: Record<ExerciseKey, ExerciseInfo> = {
  respiracion: { nombre: "Respiración 4-7-8", minutos: 5, emoji: "🫁", tag: EJERCICIO_RESPIRACION_SENTINEL },
  grounding: { nombre: "Grounding 5-4-3-2-1", minutos: 3, emoji: "🧭", tag: EJERCICIO_GROUNDING_SENTINEL },
  cuadrada: { nombre: "Respiración Cuadrada", minutos: 2, emoji: "🟦", tag: EJERCICIO_CUADRADA_SENTINEL },
  pendulacion: { nombre: "Pendulación", minutos: 4, emoji: "🌊", tag: EJERCICIO_PENDULACION_SENTINEL },
  gottman: { nombre: "Inventario Gottman", minutos: 10, emoji: "💞", tag: EJERCICIO_GOTTMAN_SENTINEL },
};

// Antiespam de ofertas: O no debe combinar dos tipos de oferta en el mismo
// mensaje (ejercicio + inventario, etc.) ni ofrecer nada nuevo antes de que
// pasen 7 mensajes desde la última oferta — sin importar si es la misma
// categoría u otra. "program" no tiene disparador propio todavía (el prompt
// público tiene prohibido vender programas), pero se deja tipado para que
// el gating quede completo si en el futuro se agrega esa oferta.
type TipoOferta = "exercise" | "inventory" | "program" | "luis";

const CATEGORIA_OFERTA: Record<ExerciseKey, TipoOferta> = {
  respiracion: "exercise",
  grounding: "exercise",
  cuadrada: "exercise",
  pendulacion: "exercise",
  gottman: "inventory",
};

// Alternativas de una tarjeta de oferta: solo de la MISMA categoría que la
// principal, nunca mezclando ejercicio + inventario en el mismo mensaje.
function alternativasDe(exercise: ExerciseKey): ExerciseKey[] {
  return (Object.keys(EXERCISE_INFO) as ExerciseKey[]).filter(
    (k) => k !== exercise && CATEGORIA_OFERTA[k] === CATEGORIA_OFERTA[exercise]
  );
}

// 1) Máxima prioridad: el usuario pide un ejercicio específico por nombre.
const NOMBRE_RULES: { pattern: RegExp; exercise: ExerciseKey }[] = [
  { pattern: /cuadrada|cuadrado/i, exercise: "cuadrada" },
  { pattern: /4-7-8|4\s*7\s*8|cuatro siete ocho/i, exercise: "respiracion" },
  { pattern: /grounding|5-4-3-2-1|cinco cuatro tres dos uno/i, exercise: "grounding" },
  { pattern: /pendulaci[oó]n|bilateral/i, exercise: "pendulacion" },
  { pattern: /gottman|4 jinetes|cuatro jinetes|inventario de pareja/i, exercise: "gottman" },
];

// 2) El usuario pide un ejercicio/técnica de forma genérica, sin decir cuál.
const GENERICO_PATTERN =
  /dame un ejercicio|quiero hacer un ejercicio|tengo un ejercicio|hazme un ejercicio|recomi?[ée]ndame un ejercicio|una t[eé]cnica de respiraci[oó]n|una t[eé]cnica/i;

// 3) Única inferencia PROACTIVA que queda del lado del cliente: pareja ->
// Gottman. Antes había un array de "síntomas corporales" (ansiedad,
// disociación, estrés, llorar) que adivinaba EN PARALELO a Claude cuál
// ejercicio ofrecer mirando solo el último mensaje — sin el contexto
// completo que Claude sí tiene. Cuando un mensaje mencionaba pareja Y
// también una palabra de esa lista (p. ej. "nervios"), el orden del array
// decidía por síntoma corporal, desconectado de lo que Claude conversaba.
// Se eliminó esa capa: ofrecer respiración/grounding/cuadrada/pendulación
// por iniciativa propia es ahora exclusivamente decisión de Claude (vía
// sentinel [EJERCICIO_*], ver detectarEjercicioPorSentinel) — el cliente ya
// no compite adivinando. Pareja/Gottman se mantiene como regla propia,
// aislada, porque el usuario pidió que ese gate sea explícito y confiable.
const PAREJA_PATTERN =
  /pareja|parejas|celos|relaci[oó]n amorosa|discutimos|peleamos|nuestra relaci[oó]n|mi (novio|novia|esposo|esposa)/i;

// O a veces ofrece una técnica en texto conversacional plano, sin sentinel
// (p. ej. "Tengo una técnica que baja la ansiedad rápido... ¿la intentamos?")
// y solo emite el [EJERCICIO_*] recién cuando el usuario confirma. Si no
// detectamos esto, nuestra propia pregunta de confirmación (PASO 1) se
// dispara encima de la que O ya hizo, duplicando la oferta.
const OFRECE_TECNICA_PATTERN = /t[eé]cnica|ejercicio/i;

// esExplicito distingue si el usuario PIDIÓ el ejercicio (por nombre o de
// forma genérica) de si es la única inferencia implícita que queda
// (pareja -> Gottman). Solo esta última respeta el límite de una oferta
// proactiva por sesión (ver ofertaProactivaHechaRef más abajo) — un pedido
// explícito del usuario siempre se atiende, sin importar el estado previo.
function detectarEjercicioRecomendado(
  texto: string
): { exercise: ExerciseKey; razon: string; esExplicito: boolean } | null {
  for (const regla of NOMBRE_RULES) {
    if (regla.pattern.test(texto)) {
      return {
        exercise: regla.exercise,
        razon: `elegiste ${EXERCISE_INFO[regla.exercise].nombre}`,
        esExplicito: true,
      };
    }
  }

  if (GENERICO_PATTERN.test(texto)) {
    return { exercise: "cuadrada", razon: "es una técnica simple y efectiva para empezar", esExplicito: true };
  }

  if (PAREJA_PATTERN.test(texto)) {
    return {
      exercise: "gottman",
      razon: "te ayuda a identificar los patrones de conflicto en tu relación",
      esExplicito: false,
    };
  }

  return null;
}

/**
 * Heurística puramente visual para la expresión de O: no reemplaza la
 * detección real de riesgo clínico (esa la hace Claude vía el sentinel
 * [CRISIS] server-side). Solo ajusta la cara según el último mensaje.
 */
function detectEmotionFromText(text: string): Emotion {
  if (CRISIS_KEYWORD_PATTERN.test(text)) return "crisis";
  if (WORRIED_PATTERN.test(text)) return "worried";
  return "normal";
}

const FRASES_INICIALES = [
  "La ansiedad no me deja vivir",
  "El trabajo me tiene agotado",
  "Mi mente no para nunca",
  "Necesito herramientas rápidas",
  "No logro dormir bien",
  "Siento pánico sin razón aparente",
  "No puedo dejar de pensar en eso",
  "Tengo miedo al futuro",
  "Mis relaciones son complicadas",
  "Mi pareja y yo discutimos mucho",
  "Me siento solo y ansioso",
  "No confío en mis decisiones",
  "Nada me calma cuando me activo",
  "Me cuesta controlar la preocupación",
  "Quisiera entender qué me pasa",
  "Necesito regulación emocional",
];

function obtenerFrasesAleatorias() {
  // Fisher-Yates real: .sort(() => Math.random() - 0.5) está sesgado y en la
  // práctica casi nunca reordena los primeros elementos del array original.
  const shuffled = [...FRASES_INICIALES];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, 4);
}

interface DisplayMessage extends ChatMessage {
  time: string;
  recomendacion?: {
    principal: ExerciseKey;
    alternativas: ExerciseKey[];
  };
  contactoLuis?: boolean;
}

function formatearScoresGottman(scores: GottmanScores): string {
  return `Crítica ${scores.critica}, Desprecio ${scores.desprecio}, Defensividad ${scores.defensividad}, Obstruccionismo ${scores.obstruccionismo}`;
}

function nowTime(): string {
  return new Date().toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function makeMessage(role: ChatMessage["role"], content: string): DisplayMessage {
  return { role, content, time: nowTime() };
}

// Un bloque que no termina en puntuación de cierre (. ! ? … " ' )) quedó
// cortado a mitad de una idea — no es un final de pensamiento coherente.
const CIERRE_DE_IDEA_PATTERN = /[.!?…"'”)]\s*$/;

// Red de seguridad contra sobre-división: el prompt le pide al modelo que
// SOLO divida en varias burbujas si la respuesta completa no cabe en 5-7
// líneas — pero si no sigue esa instrucción al pie de la letra y igual
// separa una respuesta corta con líneas en blanco, antes el cliente confiaba
// ciegamente en esa división. UMBRAL_UNIFICAR_CHARS aproxima ese mismo
// límite (~5-7 líneas cortas) para deshacer una división innecesaria.
const UMBRAL_UNIFICAR_CHARS = 220;
// Tope dado por el propio prompt ("no te excedas de 3 burbujas por turno").
const MAX_BURBUJAS = 3;

// O separa ideas completas con línea en blanco cuando su respuesta es larga
// (ver o-sistema-publico.ts) — cada bloque se muestra como una burbuja propia
// en vez de un párrafo gigante en una sola burbuja. Si igual llega un corte a
// mitad de una idea (el modelo no siguió la instrucción al pie de la letra),
// lo fusionamos con el bloque siguiente en vez de mostrar un fragmento suelto
// que no tiene sentido por sí solo.
function dividirEnMensajes(texto: string): string[] {
  const crudas = texto
    .split(/\n{2,}/)
    .map((parte) => parte.trim())
    .filter(Boolean);

  const partes: string[] = [];
  for (const parte of crudas) {
    const anteriorIncompleta = partes.length > 0 && !CIERRE_DE_IDEA_PATTERN.test(partes[partes.length - 1]);
    if (anteriorIncompleta) {
      partes[partes.length - 1] = `${partes[partes.length - 1]} ${parte}`;
    } else {
      partes.push(parte);
    }
  }

  // Si el total de la respuesta es corto, no debería haberse dividido en
  // primer lugar — se unifica en una sola burbuja, sin importar cuántos
  // saltos de línea haya usado el modelo.
  const totalChars = partes.reduce((acc, parte) => acc + parte.length, 0);
  if (partes.length > 1 && totalChars <= UMBRAL_UNIFICAR_CHARS) {
    return [partes.join(" ")];
  }

  // Si aun así quedan demasiadas burbujas, se fusionan los bloques sobrantes
  // en el último en vez de saturar al usuario de mensajes separados.
  if (partes.length > MAX_BURBUJAS) {
    const inicio = partes.slice(0, MAX_BURBUJAS - 1);
    const resto = partes.slice(MAX_BURBUJAS - 1).join(" ");
    return [...inicio, resto];
  }

  return partes;
}

// Flujo en dos pasos: primero se pregunta de forma genérica si O puede
// proponer un ejercicio o instrumento (sin revelar cuál todavía); solo si el
// usuario confirma se muestra la tarjeta con la opción y sus alternativas.
// Gottman es un INSTRUMENTO de evaluación, no una técnica de regulación —
// usa su propio texto para no llamarlo "técnica" incorrectamente.
function preguntaConfirmacion(exercise: ExerciseKey): string {
  if (exercise === "gottman") {
    return "Tengo un instrumento que puede evaluar cómo están como pareja, no te tomará más de 5 minutos. ¿Te parece lo aplicamos?";
  }
  return "Tengo una técnica que puede ayudarte en esto. No te tomará más de 5 minutos. ¿Te parece?";
}

// \b en JS solo reconoce [A-Za-z0-9_] como caracter de palabra, así que "sí"
// (con tilde) no genera un límite de palabra después de la í y el patrón no
// matchea. Se normaliza (quitando tildes) antes de comparar.
function normalizarTexto(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const AFIRMATIVO_PATTERN = /\b(si|claro|dale|ok(?:ay)?|bueno|vamos)\b/i;
const NEGATIVO_PATTERN = /\bno\b/i;

function makeConfirmacionEjercicioMessage(exercise: ExerciseKey): DisplayMessage {
  const info = EXERCISE_INFO[exercise];
  // Gottman no tiene alternativas (es la única entrada de su categoría, ver
  // alternativasDe) y es un instrumento, no una técnica — evita ofrecer
  // "otra técnica" cuando no hay ninguna otra opción que mostrar.
  const contenido =
    exercise === "gottman"
      ? `Perfecto, apliquemos: ${info.emoji} ${info.nombre} (~${info.minutos} min).`
      : `Perfecto, te propongo: ${info.emoji} ${info.nombre} (~${info.minutos} min). O si prefieres, puedes probar otra técnica:`;
  return {
    ...makeMessage("assistant", contenido),
    recomendacion: {
      principal: exercise,
      alternativas: alternativasDe(exercise),
    },
  };
}

interface StreamHandlers {
  onText: (delta: string) => void;
  onCrisis: () => void;
  onDone: () => void;
  onError: (message: string) => void;
}

// /api/o-chat/public no tiene sesión de chat persistente server-side: cada
// request manda el mensaje actual + el historial previo (sin el mensaje
// actual) para que O tenga contexto de la conversación en curso.
async function streamChat(
  mensaje: string,
  historial: ChatMessage[],
  sesionId: string,
  handlers: StreamHandlers
) {
  // Vigía de inactividad: si el servidor se cuelga a mitad de stream sin
  // emitir ni un byte (p. ej. Anthropic no responde y el propio timeout del
  // servidor no llega a dispararse por algún motivo), antes esto dejaba el
  // fetch abierto para siempre y la UI pegada en "escribiendo..." sin límite
  // ni error visible. Se rearma en cada chunk recibido — una respuesta larga
  // pero activa nunca se corta, solo si deja de llegar CUALQUIER dato.
  const IDLE_TIMEOUT_MS = 65_000; // algo mayor al timeout del servidor (60s) para no competir con él
  const abortController = new AbortController();
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  function rearmarIdleTimer() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => abortController.abort(), IDLE_TIMEOUT_MS);
  }
  rearmarIdleTimer();

  let res: Response;
  try {
    res = await fetch("/api/o-chat/public", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sesion_id: sesionId, mensaje, historial }),
      signal: abortController.signal,
    });
  } catch {
    // Antes, si el fetch en sí fallaba (red caída, o nuestro propio abort
    // por inactividad), esto no estaba atrapado en ningún try/catch: la
    // promesa de streamChat() rechazaba sin manejar y la UI quedaba pegada
    // en "escribiendo" para siempre, sin ni siquiera un mensaje de error.
    clearTimeout(idleTimer);
    handlers.onError("No se pudo conectar con el asistente. Intenta de nuevo.");
    return;
  }

  if (!res.ok || !res.body) {
    clearTimeout(idleTimer);
    handlers.onError("No se pudo conectar con el asistente. Intenta de nuevo.");
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  // Si el stream se corta (red, o el backend se cae a mitad de camino) sin
  // haber mandado "done"/"crisis"/"error", antes esto dejaba la UI pegada
  // para siempre en "escribiendo" — sin ningún error visible. Este flag
  // asegura que SIEMPRE resolvamos a algo: la respuesta real, o un error.
  let eventoFinalRecibido = false;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      rearmarIdleTimer();
      buffer += decoder.decode(value, { stream: true });

      let separatorIndex: number;
      while ((separatorIndex = buffer.indexOf("\n\n")) !== -1) {
        const rawEvent = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);

        const line = rawEvent.split("\n").find((l) => l.startsWith("data: "));
        if (!line) continue;

        try {
          const event = JSON.parse(line.slice("data: ".length)) as ChatStreamEvent;
          if (event.type === "text") handlers.onText(event.text);
          else if (event.type === "crisis") {
            eventoFinalRecibido = true;
            handlers.onCrisis();
          } else if (event.type === "done") {
            eventoFinalRecibido = true;
            handlers.onDone();
          } else if (event.type === "error") {
            eventoFinalRecibido = true;
            handlers.onError(event.message);
          }
        } catch {
          // chunk parcial o malformado: se ignora
        }
      }
    }
  } catch {
    // el stream se cortó a mitad de camino (red, timeout de inactividad, o el servidor se cayó)
  } finally {
    clearTimeout(idleTimer);
  }

  if (!eventoFinalRecibido) {
    handlers.onError("No recibimos la respuesta completa. Intenta de nuevo.");
  }
}

interface SalesBotProps {
  open: boolean;
  onClose: () => void;
}

export default function SalesBot({ open, onClose }: SalesBotProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [step, setStep] = useState<Step>("q1");
  const [crisis, setCrisis] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingText, setPendingText] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [frasesHoy] = useState(() => obtenerFrasesAleatorias());
  const [ejercicioCerradoIndex, setEjercicioCerradoIndex] = useState<number | null>(null);
  const [esperandoConfirmacionEjercicio, setEsperandoConfirmacionEjercicio] = useState<ExerciseKey | null>(
    null
  );
  // Igual que esperandoConfirmacionEjercicio, pero para la oferta de Luis:
  // O pregunta primero ("¿quieres que te recomiende...?"), y solo si el
  // usuario confirma explícitamente se muestra la tarjeta de contacto.
  const [esperandoConfirmacionLuis, setEsperandoConfirmacionLuis] = useState(false);
  const [ejercicioCompletado, setEjercicioCompletado] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);

  // Antiespam de ofertas (ejercicio / inventario Tu Brújula / Luis): UNA sola
  // oferta proactiva por sesión, sin importar la categoría. A diferencia del
  // cooldown de 7 mensajes que había antes (que "revivía" la oferta pasado un
  // tiempo, incluso si el usuario la había rechazado), esto es un pestillo
  // permanente — una vez que O ofrece algo por su cuenta, no vuelve a ofrecer
  // nada más el resto de la sesión. Un pedido EXPLÍCITO del usuario (por
  // nombre o genérico, ver esExplicito) siempre bypasea este pestillo.
  // Usamos useRef (no useState): el valor se lee y escribe dentro del mismo
  // callback (p. ej. registrarOferta seguido de un askBot vía setTimeout), y
  // con useState ese askBot quedaría con el valor viejo por closure stale —
  // el re-render con el estado nuevo llega demasiado tarde. El ref siempre
  // expone el valor más reciente sin depender de en qué render se leyó.
  const ofertaProactivaHechaRef = useRef(false);

  function puedeOfrecerAhora(): boolean {
    return !ofertaProactivaHechaRef.current;
  }

  // El pestillo es global (no importa la categoría — ejercicio, inventario o
  // Luis cuentan igual), así que no necesita saber qué se ofreció.
  function registrarOfertaProactiva() {
    ofertaProactivaHechaRef.current = true;
  }

  // Criterio de elegibilidad para pedir feedback al cerrar: conversación con
  // sustancia (7+ mensajes del usuario) o que haya completado un ejercicio.
  const messagesCount = messages.filter((m) => m.role === "user").length;
  const elegibleParaFeedback = messagesCount >= 7 || ejercicioCompletado;

  function handleSolicitarCierre() {
    if (elegibleParaFeedback) {
      setFeedbackModalOpen(true);
    } else {
      onClose();
    }
  }

  function handleFeedbackFinalizado() {
    setFeedbackModalOpen(false);
    onClose();
  }

  const router = useRouter();
  const searchParams = useSearchParams();
  const exerciseParam = searchParams.get('exercise');

  function handleEjercicioClose() {
    // Si se llegó directo desde landing con ?exercise=..., la X vuelve a landing.
    // Si el ejercicio se activó dentro de un chat normal, la X solo cierra el
    // overlay y vuelve al chat.
    if (exerciseParam) {
      router.push('/');
    } else {
      setEjercicioCerradoIndex(messages.length - 1);
    }
  }

  const initialized = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wasStreamingRef = useRef(false);

  // La cara de O refleja el estado del chat: 'crisis' confirmado por el
  // servidor siempre gana; mientras O está generando una respuesta se ve
  // 'listening'; en reposo, el tono del último mensaje del usuario define
  // si se ve 'worried', 'crisis' (leve, cosmético) o 'normal'.
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const emotion: Emotion = crisis
    ? "crisis"
    : isStreaming
    ? "listening"
    : detectEmotionFromText(lastUserMessage);

  useEffect(() => {
    obtenerSesionAnonima();
  }, []);

  useEffect(() => {
    if (!open || initialized.current) return;
    initialized.current = true;
    // Saludo estático: no hay un "mensaje" real que mandar a /api/o-chat/public
    // en el primer turno, así que O abre la conversación sin llamar a la API.
    setMessages([makeMessage("assistant", SALUDO_INICIAL)]);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pendingText, crisis]);

  // Auto-focus silencioso: solo en desktop y solo justo cuando O termina de
  // responder (transición isStreaming true -> false), sin mover la página.
  useEffect(() => {
    const veniaStreaming = wasStreamingRef.current;
    wasStreamingRef.current = isStreaming;
    if (veniaStreaming && !isStreaming && !crisis && window.innerWidth > 768) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [isStreaming, crisis]);

  useEffect(() => {
    if (exerciseParam && messages.length === 0) {
      const ejercicioMap: { [key: string]: string } = {
        'respiracion': '[EJERCICIO_RESPIRACION_4_7_8]',
        'grounding': '[EJERCICIO_GROUNDING_5_4_3_2_1]',
        'pendulacion': '[EJERCICIO_PENDULACION]',
        'cuadrada': '[EJERCICIO_RESPIRACION_CUADRADA]',
        'gottman': '[EJERCICIO_GOTTMAN]'
      };

      if (ejercicioMap[exerciseParam]) {
        const tag = ejercicioMap[exerciseParam];
        const initialMsg = makeMessage('assistant', `Vamos a hacer el ejercicio. ${tag}`);
        setMessages([initialMsg]);
        setStep("freeform");
      }
    }
  }, [exerciseParam]);

  // Ref con la versión más reciente de handleSolicitarCierre para que el
  // listener de popstate (montado una sola vez mientras el chat está abierto)
  // siempre evalúe la elegibilidad de feedback actual, no la del momento en
  // que se registró el listener.
  const handleSolicitarCierreRef = useRef(handleSolicitarCierre);
  handleSolicitarCierreRef.current = handleSolicitarCierre;

  // Interceptor de navegación "atrás" en celular: al presionar back, en vez
  // de salir de la app, se dispara el mismo flujo que la X de desktop
  // (feedback si es elegible, si no cierre directo). Como el evento
  // popstate no es cancelable, se "atrapa" reinsertando un estado en el
  // historial antes de correr el flujo de cierre.
  useEffect(() => {
    if (!open) return;

    window.history.pushState({ salesBotOpen: true }, "");

    function handlePopState() {
      window.history.pushState({ salesBotOpen: true }, "");
      handleSolicitarCierreRef.current();
    }

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [open]);

  async function askBot(history: ChatMessage[]) {
    setIsStreaming(true);
    setPendingText("");

    const mensajeActual = history[history.length - 1]?.content ?? "";
    const historialPrevio = history.slice(0, -1).map(({ role, content }) => ({ role, content }));

    let finalText = "";
    let crisisTriggered = false;

    const sesionId = obtenerSesionAnonima();
    await streamChat(mensajeActual, historialPrevio, sesionId, {
      // El servidor (api/o-chat/public/route.ts) ya filtra "[CRISIS]" antes
      // de emitir cualquier evento "text" — nunca llega al cliente texto
      // crudo que contenga el sentinel, así que acá no hace falta un
      // segundo buffer retenedor (antes había uno duplicado que nunca podía
      // dispararse en la práctica).
      onText: (delta) => {
        finalText += delta;
        setPendingText((prev) => prev + delta);
      },
      onCrisis: () => {
        crisisTriggered = true;
        setCrisis(true);
        setPendingText("");
      },
      onDone: () => {
        setIsStreaming(false);
        setPendingText("");
        const text = finalText.trim();
        if (!crisisTriggered && text) {
          // Si O propuso un ejercicio directamente vía sentinel, no lo
          // lanzamos a pantalla completa de inmediato: mostramos su mensaje
          // junto con la misma tarjeta de elección (COMENZAR + alternativas)
          // que usa la detección por síntomas, para que el usuario decida.
          const ejercicioPropuesto = detectarEjercicioPorSentinel(text);

          if (ejercicioPropuesto) {
            const contenidoLimpio = limpiarEtiquetas(text);
            const partes = dividirEnMensajes(contenidoLimpio || "Te propongo un ejercicio.");
            const previas = partes.slice(0, -1).map((p) => makeMessage("assistant", p));
            const ultima = partes[partes.length - 1];

            // Si el usuario mismo pidió justo este ejercicio en su último
            // mensaje (por nombre o de forma genérica), el sentinel de O es
            // una respuesta a un pedido explícito, no una oferta proactiva —
            // no debe consumir el límite de una oferta por sesión ni
            // respetarlo. Si Claude lo propone por su cuenta (sin que el
            // usuario lo pidiera), sí es proactivo y respeta el límite.
            const previaDeteccion = detectarEjercicioRecomendado(mensajeActual);
            const usuarioLoPidioExplicito =
              previaDeteccion !== null && previaDeteccion.esExplicito && previaDeteccion.exercise === ejercicioPropuesto;

            if (!usuarioLoPidioExplicito && !puedeOfrecerAhora()) {
              setMessages((prev) => [...prev, ...previas, makeMessage("assistant", ultima)]);
            } else {
              if (!usuarioLoPidioExplicito) registrarOfertaProactiva();
              setMessages((prev) => [
                ...prev,
                ...previas,
                {
                  ...makeMessage("assistant", ultima),
                  recomendacion: {
                    principal: ejercicioPropuesto,
                    alternativas: alternativasDe(ejercicioPropuesto),
                  },
                },
              ]);
            }
          } else {
            // CONTACTO_LUIS: el usuario ya pidió el contacto directo (O lo
            // detectó en su propio mensaje) -> tarjeta inmediata.
            // PREGUNTA_LUIS: O quiere sugerirlo por iniciativa propia -> solo
            // deja la pregunta, la tarjeta espera confirmación explícita.
            const ofreceLuisDirecto = text.includes(CONTACTO_LUIS_SENTINEL);
            const preguntaLuis = !ofreceLuisDirecto && text.includes(PREGUNTA_LUIS_SENTINEL);
            const contenidoLimpio = limpiarEtiquetas(text);
            const partes = dividirEnMensajes(contenidoLimpio);
            setMessages((prev) => [...prev, ...partes.map((p) => makeMessage("assistant", p))]);

            if (ofreceLuisDirecto) {
              // Tarjeta destacada aparte, después del texto conversacional de
              // O — nunca se combina con la oferta de un ejercicio (regla del
              // prompt), así que acá no corremos detectarEjercicioRecomendado.
              setMessages((prev) => [...prev, { ...makeMessage("assistant", ""), contactoLuis: true }]);
            } else if (preguntaLuis) {
              // PREGUNTA_LUIS siempre es iniciativa de O (a diferencia de
              // CONTACTO_LUIS, que solo se emite cuando el usuario ya lo
              // pidió) — por eso, a diferencia de esa rama, acá sí aplica el
              // límite de una oferta proactiva por sesión, igual que con los
              // ejercicios. Antes esto no se aplicaba nunca (el prompt
              // afirmaba que el frontend ya lo bloqueaba, pero no era
              // cierto para Luis).
              if (puedeOfrecerAhora()) {
                registrarOfertaProactiva();
                // Queda esperando el "sí"/"no" del usuario en
                // handleFreeformSubmit — no se ofrece nada más mientras tanto.
                setEsperandoConfirmacionLuis(true);
              }
              // Si está bloqueado, el texto de O (la pregunta) ya se mostró
              // arriba igual — no podemos "des-mostrar" lo que ya escribió —
              // pero al no activar esperandoConfirmacionLuis, un eventual
              // "sí" del usuario no dispara la tarjeta.
            } else {
              // Si O ya ofreció una técnica en su propia respuesta (aunque sea
              // sin sentinel todavía), no la ofrecemos otra vez nosotros.
              const oYaOfrecioTecnica = OFRECE_TECNICA_PATTERN.test(text);
              const deteccion = detectarEjercicioRecomendado(mensajeActual);
              // Un pedido EXPLÍCITO del usuario (por nombre o genérico)
              // siempre se atiende, incluso si O ya hizo su única oferta
              // proactiva de la sesión. Solo la inferencia implícita (pareja
              // -> Gottman) respeta ese límite.
              const bloqueadoPorLimiteSesion = deteccion !== null && !deteccion.esExplicito && !puedeOfrecerAhora();
              const recomendacion = oYaOfrecioTecnica || bloqueadoPorLimiteSesion ? null : deteccion;
              if (recomendacion) {
                // Solo la inferencia implícita consume el límite de una
                // oferta proactiva por sesión — un pedido explícito no
                // debería impedir que O ayude proactivamente más adelante.
                if (!recomendacion.esExplicito) registrarOfertaProactiva();
                // Paso 1: preguntar de forma genérica antes de mostrar las
                // opciones — recién en el paso 2 (confirmación del usuario)
                // se revela cuál técnica y sus alternativas.
                setEsperandoConfirmacionEjercicio(recomendacion.exercise);
                setMessages((prev) => [...prev, makeMessage("assistant", preguntaConfirmacion(recomendacion.exercise))]);
              }
            }
          }
        } else if (!crisisTriggered) {
          // El modelo devolvió una respuesta vacía tras limpiar etiquetas
          // (poco común, pero puede pasar). Antes esto no mostraba nada: el
          // indicador de "escribiendo" desaparecía y no quedaba ningún
          // mensaje ni error — se veía exactamente como un silencio de O.
          setMessages((prev) => [
            ...prev,
            makeMessage("assistant", "Disculpa, no me salió una respuesta. ¿Puedes repetir lo último que me contabas?"),
          ]);
        }
      },
      onError: (message) => {
        setIsStreaming(false);
        setPendingText("");
        setMessages((prev) => [...prev, makeMessage("assistant", message)]);
      },
    });
  }

  function handleChipClick(frase: string) {
    if (isStreaming || crisis) return;
    const history = [...messages, makeMessage("user", frase)];
    setMessages(history);
    // Igual que el input libre: la frase va directo a O vía API, sin pasar
    // por el flujo guiado Q2/recomendación.
    setStep("freeform");
    void askBot(history);
  }

  function handleFreeformSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isStreaming || crisis) return;

    const history = [...messages, makeMessage("user", trimmed)];
    setMessages(history);
    setInputValue("");
    // Si el usuario escribe su propio mensaje en vez de usar un chip, sale
    // del flujo guiado — los chips de q1/q2 no deben seguir mostrándose.
    setStep("freeform");

    // Rechazo explícito de una tarjeta ya mostrada (con el ejercicio nombrado
    // y sus alternativas visibles): si el usuario responde "no" en texto
    // libre en vez de tocar un botón, registramos el rechazo para no volver a
    // sugerir esa categoría por iniciativa propia en el resto de la sesión.
    // Paso 2 del flujo de confirmación: si le habíamos preguntado "¿te
    // parece?" y el usuario confirma, mostramos ahora la tarjeta con el
    // ejercicio y sus alternativas — sin pasar por O. Si rechaza o responde
    // algo neutral, seguimos la conversación normal con O. Ya no hace falta
    // registrar el rechazo: el límite de una oferta proactiva por sesión
    // (ofertaProactivaHechaRef) ya impide cualquier nueva oferta espontánea
    // de acá en adelante, la haya rechazado o no.
    if (esperandoConfirmacionEjercicio) {
      const ejercicioPendiente = esperandoConfirmacionEjercicio;
      setEsperandoConfirmacionEjercicio(null);
      const normalizado = normalizarTexto(trimmed);
      if (!NEGATIVO_PATTERN.test(normalizado) && AFIRMATIVO_PATTERN.test(normalizado)) {
        setMessages((prev) => [...prev, makeConfirmacionEjercicioMessage(ejercicioPendiente)]);
        return;
      }
    }

    // Mismo patrón para la oferta de Luis: solo si el usuario confirma
    // explícitamente ("sí") se muestra la tarjeta. Si dice "no" o responde
    // cualquier otra cosa (ignora la pregunta, cambia de tema), seguimos la
    // conversación normal con O y la tarjeta no aparece.
    if (esperandoConfirmacionLuis) {
      setEsperandoConfirmacionLuis(false);
      const normalizado = normalizarTexto(trimmed);
      if (!NEGATIVO_PATTERN.test(normalizado) && AFIRMATIVO_PATTERN.test(normalizado)) {
        setMessages((prev) => [...prev, { ...makeMessage("assistant", ""), contactoLuis: true }]);
        return;
      }
    }

    void askBot(history);
  }

  function handleRecomendacionClick(exercise: ExerciseKey) {
    if (isStreaming || crisis) return;
    const tag = EXERCISE_INFO[exercise].tag;
    // Mismo patrón que el useEffect de ?exercise=...: un mensaje de O con el
    // sentinel embebido dispara el overlay del ejercicio correspondiente.
    const history = [...messages, makeMessage("assistant", `Vamos a hacer el ejercicio. ${tag}`)];
    setMessages(history);
    setStep("freeform");
  }

  function handleConfirmSafety() {
    setCrisis(false);

    // Agregar mensaje automático de refuerzo de O
    const refuerzo = makeMessage(
      "assistant",
      "Me alivia saber que estás a salvo. Tu seguridad es lo primero. Si vuelves a sentirte en peligro o con ganas de hacerte daño, no dudes en pedir ayuda. ¿Cómo sigues con lo que me contabas?"
    );
    setMessages((prev) => [...prev, refuerzo]);
  }

  const showQ1Chips = step === "q1" && !isStreaming && !crisis;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0b2e26]/40 backdrop-blur-sm sm:items-center">
      <div className="flex h-[100dvh] w-full max-w-md animate-modal-in flex-col overflow-hidden bg-white shadow-2xl sm:h-[85vh] sm:rounded-3xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e3f3ee] bg-gradient-to-r from-[#f0f9f7] to-[#dff8f4] px-4 py-3">
          <div className="flex items-center gap-2.5">
            <OFace emotion={emotion} size={40} />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-[#1a4d4d]">O · Asistente</span>
              <span className="flex items-center gap-1.5 text-xs text-[#1D9E75]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#1D9E75] opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#1D9E75]" />
                </span>
                En línea
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSolicitarCierre}
            aria-label="Cerrar chat"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#1a4d4d]/60 transition-colors hover:bg-[rgba(29,158,117,0.1)] hover:text-[#1a4d4d]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Historial de mensajes estilo WhatsApp */}
        <div className="flex-1 overflow-y-auto bg-[#f7fdfb] px-3.5 py-3">
          {step === "freeform" &&
            messages.length > 0 &&
            messages[messages.length - 1].role === "assistant" &&
            messages[messages.length - 1].content.includes(EJERCICIO_RESPIRACION_SENTINEL) &&
            ejercicioCerradoIndex !== messages.length - 1 && (
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  background: "white",
                  zIndex: 9999,
                  overflow: "auto",
                }}
              >
                <EjercicioRespiracion
                  onCalmaResponse={(valor) => {
                    setEjercicioCompletado(true);
                    const respuestaTexto = `He llegado a un ${valor} de calma (0-10)`;
                    const nuevosMensajes = [...messages, makeMessage("user", respuestaTexto)];
                    setMessages(nuevosMensajes);
                    // Cuenta como la oferta proactiva de la sesión (por si se
                    // llegó acá vía deep-link ?exercise=... sin pasar por el
                    // flujo normal de oferta) — O no propone nada más solo.
                    registrarOfertaProactiva();

                    // O responde automáticamente con refuerzo personalizado
                    setTimeout(() => {
                      void askBot(nuevosMensajes);
                    }, 500);
                  }}
                  onClose={handleEjercicioClose}
                />
              </div>
            )}

          {step === "freeform" &&
            messages.length > 0 &&
            messages[messages.length - 1].role === "assistant" &&
            messages[messages.length - 1].content.includes(EJERCICIO_GROUNDING_SENTINEL) &&
            ejercicioCerradoIndex !== messages.length - 1 && (
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  background: "white",
                  zIndex: 9999,
                  overflow: "auto",
                }}
              >
                <EjercicioGrounding
                  onPresenciaResponse={(valor) => {
                    setEjercicioCompletado(true);
                    const respuestaTexto = `He llegado a un ${valor} de presencia (0-10)`;
                    const nuevosMensajes = [...messages, makeMessage("user", respuestaTexto)];
                    setMessages(nuevosMensajes);
                    registrarOfertaProactiva();
                    setTimeout(() => {
                      void askBot(nuevosMensajes);
                    }, 500);
                  }}
                  onClose={handleEjercicioClose}
                />
              </div>
            )}

          {step === "freeform" &&
            messages.length > 0 &&
            messages[messages.length - 1].role === "assistant" &&
            messages[messages.length - 1].content.includes(EJERCICIO_PENDULACION_SENTINEL) &&
            ejercicioCerradoIndex !== messages.length - 1 && (
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  background: "white",
                  zIndex: 9999,
                  overflow: "auto",
                }}
              >
                <EjercicioPendulacion
                  onCalmaResponse={(valor) => {
                    setEjercicioCompletado(true);
                    const respuestaTexto = `He llegado a un ${valor} de calma (0-10)`;
                    const nuevosMensajes = [...messages, makeMessage("user", respuestaTexto)];
                    setMessages(nuevosMensajes);
                    registrarOfertaProactiva();
                    setTimeout(() => {
                      void askBot(nuevosMensajes);
                    }, 500);
                  }}
                  onClose={handleEjercicioClose}
                />
              </div>
            )}

          {step === "freeform" &&
            messages.length > 0 &&
            messages[messages.length - 1].role === "assistant" &&
            messages[messages.length - 1].content.includes(EJERCICIO_CUADRADA_SENTINEL) &&
            ejercicioCerradoIndex !== messages.length - 1 && (
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  background: "white",
                  zIndex: 9999,
                  overflow: "auto",
                }}
              >
                <EjercicioCuadrada
                  onCalmaResponse={(valor) => {
                    setEjercicioCompletado(true);
                    const respuestaTexto = `He llegado a un ${valor} de calma (0-10)`;
                    const nuevosMensajes = [...messages, makeMessage("user", respuestaTexto)];
                    setMessages(nuevosMensajes);
                    registrarOfertaProactiva();
                    setTimeout(() => {
                      void askBot(nuevosMensajes);
                    }, 500);
                  }}
                  onClose={handleEjercicioClose}
                />
              </div>
            )}

          {step === "freeform" &&
            messages.length > 0 &&
            messages[messages.length - 1].role === "assistant" &&
            messages[messages.length - 1].content.includes(EJERCICIO_GOTTMAN_SENTINEL) &&
            ejercicioCerradoIndex !== messages.length - 1 && (
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  background: "white",
                  zIndex: 9999,
                  overflow: "auto",
                }}
              >
                <EjercicioGottman
                  onResultado={(resultado: GottmanResultado) => {
                    setEjercicioCompletado(true);
                    const respuestaTexto =
                      resultado.comparado && resultado.scoresB
                        ? `Completamos el Inventario Gottman en pareja (escala 4-20 por variable). Mis resultados: ${formatearScoresGottman(
                            resultado.scoresA
                          )}. Resultados de mi pareja: ${formatearScoresGottman(resultado.scoresB)}.`
                        : `Completé el Inventario Gottman (escala 4-20 por variable). Mis resultados: ${formatearScoresGottman(
                            resultado.scoresA
                          )}.`;
                    const nuevosMensajes = [...messages, makeMessage("user", respuestaTexto)];
                    setMessages(nuevosMensajes);
                    registrarOfertaProactiva();
                    setTimeout(() => {
                      void askBot(nuevosMensajes);
                    }, 500);
                  }}
                  onClose={handleEjercicioClose}
                />
              </div>
            )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`mb-3 flex animate-fade-in ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="mr-1.5 flex h-6 w-6 shrink-0 items-end">
                  <OFace emotion="normal" size={24} />
                </div>
              )}
              {msg.contactoLuis ? (
                <LuisContactCard />
              ) : (
              <div
                className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                  msg.role === "user"
                    ? "rounded-br-sm bg-[#e2e8f0] text-[#1a4d4d]"
                    : "rounded-bl-sm bg-[#1D9E75] text-white"
                }`}
              >
                <p className="whitespace-pre-wrap">{limpiarEtiquetas(msg.content)}</p>
                {msg.recomendacion && (
                  <div className="mt-2 flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleRecomendacionClick(msg.recomendacion!.principal)}
                      disabled={isStreaming || crisis}
                      className="rounded-xl border border-white/80 bg-white/15 px-3 py-2 text-left text-xs font-medium text-white transition-colors hover:bg-white/25 disabled:opacity-50"
                    >
                      ▶ Comenzar: {EXERCISE_INFO[msg.recomendacion.principal].emoji}{" "}
                      {EXERCISE_INFO[msg.recomendacion.principal].nombre} (
                      {EXERCISE_INFO[msg.recomendacion.principal].minutos} min)
                    </button>
                    {msg.recomendacion.alternativas.length > 0 && (
                      <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-white/70">
                        u otras opciones
                      </span>
                    )}
                    {msg.recomendacion.alternativas.map((ex) => (
                      <button
                        key={ex}
                        type="button"
                        onClick={() => handleRecomendacionClick(ex)}
                        disabled={isStreaming || crisis}
                        className="rounded-xl border border-white/40 bg-white/5 px-3 py-2 text-left text-xs text-white/90 transition-colors hover:bg-white/15 disabled:opacity-50"
                      >
                        {EXERCISE_INFO[ex].emoji} {EXERCISE_INFO[ex].nombre} ({EXERCISE_INFO[ex].minutos} min)
                      </button>
                    ))}
                  </div>
                )}
                <span
                  className={`mt-1 block text-[10px] ${
                    msg.role === "user" ? "text-right text-[#1a4d4d]/50" : "text-left text-white/70"
                  }`}
                >
                  {msg.time}
                </span>
              </div>
              )}
            </div>
          ))}

          {isStreaming && (
            <div className="mb-3 flex animate-fade-in justify-start">
              <div className="mr-1.5 flex h-6 w-6 shrink-0 items-end">
                <OFace emotion="listening" size={24} />
              </div>
              <div className="max-w-[78%] rounded-2xl rounded-bl-sm bg-[#1D9E75] px-3 py-2 text-sm text-white shadow-sm">
                {pendingText ? (
                  <p className="whitespace-pre-wrap">{pendingText}</p>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/80">O está escribiendo</span>
                    <span className="flex items-center gap-1">
                      <span
                        className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-white/80"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-white/80"
                        style={{ animationDelay: "200ms" }}
                      />
                      <span
                        className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-white/80"
                        style={{ animationDelay: "400ms" }}
                      />
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {crisis && <CrisisCard onConfirmSafety={handleConfirmSafety} />}

          <div ref={bottomRef} />
        </div>

        {/* Chips de respuesta rápida */}
        {showQ1Chips && (
          <div className="flex flex-wrap gap-2 border-t border-[#e3f3ee] bg-white px-3.5 pt-3">
            {frasesHoy.map((frase) => (
              <button
                key={frase}
                type="button"
                onClick={() => handleChipClick(frase)}
                className="rounded-full border border-[#c7ebe0] bg-[rgba(29,158,117,0.06)] px-3 py-1.5 text-xs text-[#1a4d4d] transition-colors hover:border-[#1D9E75] hover:bg-[rgba(29,158,117,0.12)]"
              >
                {frase}
              </button>
            ))}
          </div>
        )}

        {/* Input estilo WhatsApp */}
        <form
          className="flex items-center gap-2 border-t border-[#e3f3ee] bg-white px-3.5 py-3"
          onSubmit={handleFreeformSubmit}
        >
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Escribe tu mensaje..."
            disabled={isStreaming || crisis}
            className="flex-1 rounded-full border border-[#e3f3ee] bg-[#f7fdfb] px-4 py-2.5 text-sm text-[#1a4d4d] placeholder-[#8fb3ac] outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isStreaming || crisis || !inputValue.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1D9E75] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            aria-label="Enviar mensaje"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2 11 13" />
              <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
            </svg>
          </button>
        </form>
      </div>

      {feedbackModalOpen && (
        <FeedbackModal sessionId={obtenerSesionAnonima()} onFinish={handleFeedbackFinalizado} />
      )}
    </div>
  );
}
