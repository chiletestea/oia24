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

interface SalesBotProps {
  open: boolean;
  onClose: () => void;
}

export default function SalesBot({ open, onClose }: SalesBotProps) {
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
    if (!open || initialized.current) return;
    initialized.current = true;
    void askBot([], "q1", undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
            onClick={onClose}
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
              <div
                className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                  msg.role === "user"
                    ? "rounded-br-sm bg-[#e2e8f0] text-[#1a4d4d]"
                    : "rounded-bl-sm bg-[#1D9E75] text-white"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                <span
                  className={`mt-1 block text-[10px] ${
                    msg.role === "user" ? "text-right text-[#1a4d4d]/50" : "text-left text-white/70"
                  }`}
                >
                  {msg.time}
                </span>
              </div>
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

          {crisis && (
            <div className="mb-3 animate-fade-in rounded-2xl border border-[#f3c8be] bg-[#fff5f2] p-3.5 shadow-sm">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[#b3453a]">
                <span className="text-base">😟</span> Esto suena serio, y tu seguridad es lo primero.
              </p>
              <p className="mb-3 text-xs leading-relaxed text-[#8a4a41]">
                Si estás en riesgo o necesitas ayuda inmediata, contacta ahora a:
              </p>
              <ul className="mb-3 space-y-1 text-xs text-[#4a2e29]">
                <li>
                  <span className="font-semibold text-[#b3453a]">Emergencia:</span> *4141 (ambulancia)
                </li>
                <li>
                  <span className="font-semibold text-[#b3453a]">Salud Responde:</span> 600 360 7777
                </li>
                <li>
                  <span className="font-semibold text-[#b3453a]">DAMS (Drogas/Alcohol):</span> 800 200 818
                </li>
              </ul>
              <p className="mb-3 text-xs leading-relaxed text-[#8a4a41]">
                También puedes escribir directamente a Luis, psicólogo clínico supervisor:{" "}
                <span className="font-semibold text-[#4a2e29]">+56 9 7862 1403</span>.
              </p>
              <button
                type="button"
                onClick={handleConfirmSafety}
                className="rounded-full border border-[#b3453a] px-3 py-1.5 text-xs font-medium text-[#b3453a] transition-colors hover:bg-[#b3453a] hover:text-white"
              >
                Estoy a salvo, continuar
              </button>
            </div>
          )}

          {program && !crisis && (
            <div className="mb-3 animate-fade-in rounded-2xl border border-[#e3f3ee] bg-white p-3.5 shadow-sm">
              <span className="text-[11px] font-semibold" style={{ color: program.color }}>
                PROGRAMA RECOMENDADO
              </span>
              <h3 className="mt-1.5 text-sm font-medium text-[#1a4d4d]">{program.nombre}</h3>
              <p className="mt-1 text-xs text-[#5a7d78]">{program.modulos} módulos · IA</p>
              <p className="mt-2 text-sm font-semibold" style={{ color: program.color }}>
                ${program.precio.toLocaleString("es-CL")}
              </p>
              <button
                type="button"
                className="mt-3 w-full rounded-full py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: program.color }}
              >
                Empezar →
              </button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Chips de respuesta rápida */}
        {(showQ1Chips || showQ2Chips) && (
          <div className="flex flex-wrap gap-2 border-t border-[#e3f3ee] bg-white px-3.5 pt-3">
            {showQ1Chips &&
              Q1_CHIPS.map((chip) => (
                <button
                  key={chip.text}
                  type="button"
                  onClick={() => handleQ1Chip(chip)}
                  className="rounded-full border border-[#c7ebe0] bg-[rgba(29,158,117,0.06)] px-3 py-1.5 text-xs text-[#1a4d4d] transition-colors hover:border-[#1D9E75] hover:bg-[rgba(29,158,117,0.12)]"
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
                  className="rounded-full border border-[#c7ebe0] bg-[rgba(29,158,117,0.06)] px-3 py-1.5 text-xs text-[#1a4d4d] transition-colors hover:border-[#1D9E75] hover:bg-[rgba(29,158,117,0.12)]"
                >
                  {text}
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
    </div>
  );
}
