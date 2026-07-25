"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import CrisisCard from "@/components/CrisisCard";
import ModuloCompleted from "@/components/ModuloCompleted";
import EvaluacionGAD7 from "@/components/EvaluacionGAD7";
import EvaluacionBAI from "@/components/EvaluacionBAI";
import type { EtiquetaTipo } from "@/lib/etiquetas";

const CRISIS_SENTINEL = "[CRISIS]";

interface UsuarioProp {
  id: string;
  nombre: string | null;
  modulo_actual: number;
}

interface ProgramaProp {
  id: string;
  nombre: string;
  modulos: number;
}

interface ProgramaChatUIProps {
  token: string;
  usuario: UsuarioProp;
  programa: ProgramaProp;
}

interface DisplayMessage {
  role: "user" | "assistant";
  content: string;
  time: string;
  hito?: boolean;
}

interface Contexto {
  progreso: string;
  resumen_ultima_sesion: string | null;
  fecha_ultima_sesion: string | null;
}

type ChatStreamEvent =
  | { type: "text"; text: string }
  | { type: "acciones"; acciones: EtiquetaTipo[]; etiquetas: { tipo: EtiquetaTipo; numero?: number }[] }
  | { type: "crisis" }
  | { type: "done" }
  | { type: "error"; message: string };

function nowTime(): string {
  return new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false });
}

async function streamProgramaChat(
  params: { token: string; moduloNumero: number; mensaje: string; usuarioId: string; programaId: string },
  handlers: {
    onText: (delta: string) => void;
    onAcciones: (acciones: EtiquetaTipo[], etiquetas: { tipo: EtiquetaTipo; numero?: number }[]) => void;
    onCrisis: () => void;
    onDone: () => void;
    onError: (message: string) => void;
  }
) {
  const res = await fetch("/api/programa-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      usuario_id: params.usuarioId,
      programa_id: params.programaId,
      modulo_numero: params.moduloNumero,
      mensaje: params.mensaje,
      token: params.token,
    }),
  });

  if (!res.ok || !res.body) {
    handlers.onError("No se pudo conectar con O. Intenta de nuevo.");
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
        else if (event.type === "acciones") handlers.onAcciones(event.acciones, event.etiquetas);
        else if (event.type === "crisis") handlers.onCrisis();
        else if (event.type === "done") handlers.onDone();
        else if (event.type === "error") handlers.onError(event.message);
      } catch {
        // chunk parcial: se ignora
      }
    }
  }
}

export default function ProgramaChatUI({ token, usuario, programa }: ProgramaChatUIProps) {
  const router = useRouter();

  const [moduloActual, setModuloActual] = useState(usuario.modulo_actual);
  const [contexto, setContexto] = useState<Contexto | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingText, setPendingText] = useState("");
  const [crisis, setCrisis] = useState(false);
  const [moduloCompletadoNumero, setModuloCompletadoNumero] = useState<number | null>(null);
  const [evaluacionActiva, setEvaluacionActiva] = useState<"GAD7" | "BAI" | null>(null);
  const [saliendo, setSaliendo] = useState(false);

  const initialized = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    void (async () => {
      const res = await fetch("/api/sesion/iniciar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario_id: usuario.id, programa_id: programa.id, token }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { contexto: Contexto };
      setContexto(data.contexto);

      const nombre = usuario.nombre ?? "";
      const saludo = nombre ? `Hola ${nombre}, bueno verte de nuevo po.` : "Hola, bueno verte de nuevo po.";
      const ultimaSesion = data.contexto.resumen_ultima_sesion
        ? ` Última vez: ${data.contexto.resumen_ultima_sesion}.`
        : "";
      const mensajeInicial = `${saludo} Estás en Módulo ${usuario.modulo_actual}.${ultimaSesion} ¿Listo para continuar?`;

      setMessages([{ role: "assistant", content: mensajeInicial, time: nowTime() }]);
    })();
  }, [token, usuario.id, usuario.nombre, usuario.modulo_actual, programa.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pendingText, crisis, moduloCompletadoNumero, evaluacionActiva]);

  async function enviarMensaje(mensaje: string) {
    setMessages((prev) => [...prev, { role: "user", content: mensaje, time: nowTime() }]);
    setIsStreaming(true);
    setPendingText("");

    let held = "";
    let finalText = "";
    let revealed = false;
    let crisisTriggered = false;
    let hitoDetectado = false;

    await streamProgramaChat(
      { token, moduloNumero: moduloActual, mensaje, usuarioId: usuario.id, programaId: programa.id },
      {
        onText: (delta) => {
          finalText += delta;
          if (revealed) {
            setPendingText((prev) => prev + delta);
            return;
          }
          held += delta;
          if (CRISIS_SENTINEL.startsWith(held)) return;
          revealed = true;
          setPendingText(held);
        },
        onAcciones: (acciones, etiquetas) => {
          if (acciones.includes("HITO_COMPLETADO")) hitoDetectado = true;
          if (acciones.includes("INICIAR_GAD7")) setEvaluacionActiva("GAD7");
          if (acciones.includes("INICIAR_BAI")) setEvaluacionActiva("BAI");
          const completado = etiquetas.find((e) => e.tipo === "MODULO_COMPLETADO");
          if (completado?.numero !== undefined) {
            setModuloCompletadoNumero(completado.numero);
          }
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
            setMessages((prev) => [...prev, { role: "assistant", content: text, time: nowTime(), hito: hitoDetectado }]);
          }
        },
        onError: (message) => {
          setIsStreaming(false);
          setPendingText("");
          setMessages((prev) => [...prev, { role: "assistant", content: message, time: nowTime() }]);
        },
      }
    );
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isStreaming || crisis || moduloCompletadoNumero !== null) return;
    setInputValue("");
    void enviarMensaje(trimmed);
  }

  function handleContinuarSiguienteModulo() {
    if (moduloCompletadoNumero === null) return;
    setModuloActual(moduloCompletadoNumero + 1);
    setModuloCompletadoNumero(null);
    setMessages([]);
    // El effect de saludo inicial solo corre una vez (guardado por
    // initialized.current) — lo desarmamos para que se repita con el
    // usuario.modulo_actual actualizado que trae el refresh del server component.
    initialized.current = false;
    router.refresh();
  }

  async function handleSalir() {
    setSaliendo(true);
    try {
      await fetch("/api/sesion/cerrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario_id: usuario.id, programa_id: programa.id, modulo_numero: moduloActual }),
      });
    } catch {
      // si falla el cierre, igual dejamos salir — no bloqueamos al usuario por un error de red
    } finally {
      router.push("/");
    }
  }

  return (
    <div className="flex min-h-screen flex-col text-[#1a4d4d]" style={{ backgroundColor: "#f0f9f7" }}>
      {/* Header */}
      <header className="flex items-center justify-between border-b border-[#e3f3ee] px-4 py-3" style={{ backgroundColor: "#f0f9f7" }}>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-[#1a4d4d]">O — {programa.nombre}</span>
          <span className="flex items-center gap-1.5 text-xs text-[#1D9E75]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#1D9E75] opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#1D9E75]" />
            </span>
            en línea{usuario.nombre ? ` · ${usuario.nombre}` : ""}
          </span>
        </div>
        <button
          type="button"
          onClick={handleSalir}
          disabled={saliendo}
          className="rounded-full border border-[#c7ebe0] px-3 py-1.5 text-xs font-medium text-[#1a4d4d] transition-colors hover:bg-white disabled:opacity-50"
        >
          Salir
        </button>
      </header>

      {/* Progress bar */}
      <div className="border-b border-[#e3f3ee] bg-white/60 px-4 py-2.5">
        <div className="mb-1.5 flex items-center justify-between text-xs text-[#5a7d78]">
          <span>Progreso</span>
          <span>
            {contexto ? contexto.progreso.replace(" de ", " / ") : `${moduloActual} / ${programa.modulos}`}
          </span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: programa.modulos }, (_, i) => i).map((n) => (
            <span
              key={n}
              className={`h-1.5 flex-1 rounded-full ${n < moduloActual ? "bg-[#1D9E75]" : "bg-[rgba(29,158,117,0.15)]"}`}
            />
          ))}
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.map((msg, i) => (
          <div key={i} className={`mb-3 flex animate-fade-in ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm"
              style={
                msg.role === "user"
                  ? { backgroundColor: "#f5f5f5", color: "#1a4d4d", borderBottomRightRadius: "4px" }
                  : { backgroundColor: "#1D9E75", color: "#ffffff", borderBottomLeftRadius: "4px" }
              }
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.hito && <p className="mt-1 text-xs text-white/90">🎉 ¡Hito alcanzado!</p>}
              <span
                className="mt-1 block text-[10px]"
                style={{ color: msg.role === "user" ? "rgba(26,77,77,0.5)" : "rgba(255,255,255,0.7)" }}
              >
                {msg.time}
              </span>
            </div>
          </div>
        ))}

        {isStreaming && (
          <div className="mb-3 flex animate-fade-in justify-start">
            <div className="max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm text-white shadow-sm" style={{ backgroundColor: "#1D9E75", borderBottomLeftRadius: "4px" }}>
              {pendingText ? (
                <p className="whitespace-pre-wrap">{pendingText}</p>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/80">O está escribiendo</span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-white/80" style={{ animationDelay: "0ms" }} />
                    <span className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-white/80" style={{ animationDelay: "200ms" }} />
                    <span className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-white/80" style={{ animationDelay: "400ms" }} />
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {crisis && (
          <CrisisCard
            onConfirmSafety={() => {
              setCrisis(false);
            }}
          />
        )}

        {evaluacionActiva === "GAD7" && (
          <EvaluacionGAD7
            usuarioId={usuario.id}
            programaId={programa.id}
            moduloNumero={moduloActual}
            onComplete={() => setEvaluacionActiva(null)}
          />
        )}
        {evaluacionActiva === "BAI" && (
          <EvaluacionBAI
            usuarioId={usuario.id}
            programaId={programa.id}
            moduloNumero={moduloActual}
            onComplete={() => setEvaluacionActiva(null)}
          />
        )}

        {moduloCompletadoNumero !== null && (
          <ModuloCompleted
            moduloNumero={moduloCompletadoNumero + 1}
            totalModulos={programa.modulos}
            onContinuar={handleContinuarSiguienteModulo}
          />
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-[#e3f3ee] bg-white px-4 py-3">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Escribe tu mensaje..."
          disabled={isStreaming || crisis || moduloCompletadoNumero !== null}
          className="flex-1 rounded-full border border-[#e3f3ee] bg-[#f7fdfb] px-4 py-2.5 text-sm text-[#1a4d4d] placeholder-[#8fb3ac] outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isStreaming || crisis || moduloCompletadoNumero !== null || !inputValue.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1D9E75] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          aria-label="Enviar mensaje"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2 11 13" />
            <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
          </svg>
        </button>
      </form>

      {/* Footer */}
      <footer className="border-t border-[#e3f3ee] bg-white px-4 py-2.5 text-center">
        <button
          type="button"
          onClick={handleSalir}
          disabled={saliendo}
          className="text-xs font-medium text-[#5a7d78] hover:text-[#1a4d4d] disabled:opacity-50"
        >
          {saliendo ? "Guardando sesión..." : "Salir"}
        </button>
      </footer>
    </div>
  );
}
