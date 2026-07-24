"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import OFace, { type Emotion } from "@/components/OFace";
import type { Area, ChatMessage, ChatStreamEvent, Program, Step } from "@/types/chat";

const CRISIS_SENTINEL = "[CRISIS]";

const WORRIED_PATTERN = /ansiedad|estr[eé]s|preocupad/i;
const CRISIS_KEYWORD_PATTERN = /urgente|ayuda|crisis/i;

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

const Q1_CHIPS: { text: string; area: Area }[] = [
  { text: "La ansiedad no me deja vivir", area: "ansiedad" },
  { text: "El trabajo me tiene agotado", area: "trabajo" },
  { text: "Mi mente no para nunca", area: "mente" },
  { text: "Necesito herramientas rápidas", area: "urgente" },
];

const Q2_CHIPS: Record<"ansiedad" | "trabajo" | "mente", string[]> = {
  ansiedad: ["Todo el día", "Por las noches", "En situaciones", "No sé"],
  trabajo: ["Agotamiento crónico", "Crisis puntuales", "Ambos", "No estoy seguro"],
  mente: ["Sí, rumiación constante", "Más bien ansiedad", "Bloqueos mentales", "No sé"],
};

interface DisplayMessage extends ChatMessage {
  time: string;
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

interface StreamHandlers {
  onText: (delta: string) => void;
  onProgram: (program: Program) => void;
  onCrisis: () => void;
  onDone: () => void;
  onError: (message: string) => void;
}

async function streamChat(
  messages: ChatMessage[],
  step: Step,
  area: Area | undefined,
  handlers: StreamHandlers
) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, step, area }),
  });

  if (!res.ok || !res.body) {
    handlers.onError("No se pudo conectar con el asistente. Intenta de nuevo.");
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
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
        else if (event.type === "program") handlers.onProgram(event.program);
        else if (event.type === "crisis") handlers.onCrisis();
        else if (event.type === "done") handlers.onDone();
        else if (event.type === "error") handlers.onError(event.message);
      } catch {
        // chunk parcial o malformado: se ignora
      }
    }
  }
}

export default function SalesBot() {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [step, setStep] = useState<Step>("q1");
  const [area, setArea] = useState<Area | undefined>(undefined);
  const [program, setProgram] = useState<Program | null>(null);
  const [crisis, setCrisis] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingText, setPendingText] = useState("");
  const [inputValue, setInputValue] = useState("");

  const initialized = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

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
    if (initialized.current) return;
    initialized.current = true;
    void askBot([], "q1", undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pendingText, program, crisis]);

  async function askBot(history: ChatMessage[], nextStep: Step, nextArea: Area | undefined) {
    setIsStreaming(true);
    setPendingText("");

    let held = "";
    let finalText = "";
    let revealed = false;
    let crisisTriggered = false;

    await streamChat(history, nextStep, nextArea, {
      onText: (delta) => {
        finalText += delta;
        if (revealed) {
          setPendingText((prev) => prev + delta);
          return;
        }
        held += delta;
        // Mientras el texto acumulado siga siendo un posible prefijo del
        // sentinel de crisis, lo retenemos sin mostrarlo — así nunca se
        // alcanza a ver "[CRI..." en pantalla si termina siendo una crisis.
        if (CRISIS_SENTINEL.startsWith(held)) return;
        revealed = true;
        setPendingText(held);
      },
      onProgram: (p) => setProgram(p),
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
          setMessages((prev) => [...prev, makeMessage("assistant", text)]);
        }
      },
      onError: (message) => {
        setIsStreaming(false);
        setPendingText("");
        setMessages((prev) => [...prev, makeMessage("assistant", message)]);
      },
    });
  }

  function handleQ1Chip(chip: { text: string; area: Area }) {
    if (isStreaming || crisis) return;
    const history = [...messages, makeMessage("user", chip.text)];
    setMessages(history);
    setArea(chip.area);

    if (chip.area === "urgente") {
      setStep("recommendation");
      void askBot(history, "recommendation", "urgente");
    } else {
      setStep("q2");
      void askBot(history, "q2", chip.area);
    }
  }

  function handleQ2Chip(text: string) {
    if (isStreaming || crisis || !area) return;
    const history = [...messages, makeMessage("user", text)];
    setMessages(history);
    setStep("recommendation");
    void askBot(history, "recommendation", area);
  }

  function handleFreeformSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isStreaming || crisis) return;

    const history = [...messages, makeMessage("user", trimmed)];
    setMessages(history);
    setInputValue("");
    void askBot(history, "freeform", area);
  }

  function handleConfirmSafety() {
    setCrisis(false);
    setMessages([]);
    setProgram(null);
    setArea(undefined);
    setStep("q1");
    void askBot([], "q1", undefined);
  }

  const showQ1Chips = step === "q1" && !isStreaming && !crisis;
  const showQ2Chips =
    step === "q2" && !isStreaming && !crisis && area && area !== "urgente";

  return (
    <div className="rounded-2xl border border-[#1a2035] bg-[#0d1117] p-3.5">
      {/* Avatar flotante + estado */}
      <div className="mb-3 flex items-center gap-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-full shadow-[0_0_16px_-2px_rgba(127,119,221,0.55)]">
          <OFace emotion={emotion} size={40} />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-white">O · Asistente openia</span>
          <span className="flex items-center gap-1.5 text-xs text-[#94a3b8]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#1D9E75] opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#1D9E75]" />
            </span>
            En línea
          </span>
        </div>
      </div>

      {/* Avatar grande de bienvenida — la misma cara, en grande, siempre visible */}
      <div className="mb-4 flex flex-col items-center gap-2 py-2">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-b from-[#7F77DD]/20 to-transparent shadow-[0_0_32px_-4px_rgba(127,119,221,0.5)]">
          <OFace emotion={emotion} size={88} />
        </div>
        <p className="text-xs text-[#94a3b8]">Aprende con quien sabe de verdad.</p>
      </div>

      {/* Historial de mensajes estilo WhatsApp */}
      <div className="mb-3 max-h-[420px] overflow-y-auto pr-1">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`mb-3 flex animate-fade-in ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm text-white ${
                msg.role === "user"
                  ? "rounded-br-sm bg-[#334155]"
                  : "rounded-bl-sm bg-[#7F77DD]"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              <span
                className={`mt-1 block text-[10px] text-white/60 ${
                  msg.role === "user" ? "text-right" : "text-left"
                }`}
              >
                {msg.time}
              </span>
            </div>
          </div>
        ))}

        {isStreaming && (
          <div className="mb-3 flex animate-fade-in justify-start">
            <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-[#7F77DD] px-3 py-2 text-sm text-white">
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

        {crisis && (
          <div className="mb-3 animate-fade-in rounded-2xl border border-[#B3453A] bg-[#2a0f0d] p-3.5">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[#ff8a80]">
              <span className="text-base">😟</span> Esto suena serio, y tu seguridad es lo primero.
            </p>
            <p className="mb-3 text-xs leading-relaxed text-[#f1c2bd]">
              Si estás en riesgo o necesitas ayuda inmediata, contacta ahora a:
            </p>
            <ul className="mb-3 space-y-1 text-xs text-white">
              <li>
                <span className="font-semibold text-[#ff8a80]">Emergencia:</span> *4141 (ambulancia)
              </li>
              <li>
                <span className="font-semibold text-[#ff8a80]">Salud Responde:</span> 600 360 7777
              </li>
              <li>
                <span className="font-semibold text-[#ff8a80]">DAMS (Drogas/Alcohol):</span> 800 200 818
              </li>
            </ul>
            <p className="mb-3 text-xs leading-relaxed text-[#f1c2bd]">
              También puedes escribir directamente a Luis, psicólogo clínico supervisor: {" "}
              <span className="font-semibold text-white">+56 9 7862 1403</span>.
            </p>
            <button
              type="button"
              onClick={handleConfirmSafety}
              className="rounded-full border border-[#ff8a80] px-3 py-1.5 text-xs text-[#ff8a80]"
            >
              Estoy a salvo, continuar
            </button>
          </div>
        )}

        {program && !crisis && (
          <div className="mb-3 animate-fade-in rounded-2xl border border-[#1a2035] bg-[#0d1117] p-3.5">
            <span className="text-[11px] font-semibold" style={{ color: program.color }}>
              PROGRAMA RECOMENDADO
            </span>
            <h3 className="mt-1.5 text-sm font-medium text-white">{program.nombre}</h3>
            <p className="mt-1 text-xs text-[#94a3b8]">{program.modulos} módulos · IA</p>
            <p className="mt-2 text-sm font-semibold" style={{ color: program.color }}>
              ${program.precio.toLocaleString("es-CL")}
            </p>
            <button
              type="button"
              className="mt-3 w-full rounded-full py-2 text-sm font-medium text-white"
              style={{ backgroundColor: program.color }}
            >
              Empezar →
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form className="flex items-center gap-2" onSubmit={handleFreeformSubmit}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Escribe tu duda..."
          disabled={isStreaming || crisis}
          className="flex-1 rounded-full border border-[#1a2035] bg-[#080c15] px-4 py-2 text-sm text-white placeholder-[#4a5568] outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isStreaming || crisis || !inputValue.trim()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#7F77DD] text-white disabled:opacity-50"
        >
          →
        </button>
      </form>

      {/* Chips de respuesta rápida, debajo del input */}
      {(showQ1Chips || showQ2Chips) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {showQ1Chips &&
            Q1_CHIPS.map((chip) => (
              <button
                key={chip.text}
                type="button"
                onClick={() => handleQ1Chip(chip)}
                className="rounded-full border border-[#1a2035] px-3 py-1.5 text-xs text-[#94a3b8] transition-colors hover:border-[#7F77DD] hover:text-[#7F77DD]"
              >
                {chip.text}
              </button>
            ))}
          {showQ2Chips &&
            area &&
            Q2_CHIPS[area].map((text) => (
              <button
                key={text}
                type="button"
                onClick={() => handleQ2Chip(text)}
                className="rounded-full border border-[#1a2035] px-3 py-1.5 text-xs text-[#94a3b8] transition-colors hover:border-[#7F77DD] hover:text-[#7F77DD]"
              >
                {text}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
