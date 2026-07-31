"use client";

// Modal de feedback simple mostrado al cerrar SalesBot, solo cuando el
// usuario es elegible (ver criterio en SalesBot.tsx). No bloquea el cierre:
// tanto "Enviar" como "Evaluar después" terminan navegando a home.

import { useState } from "react";

interface FeedbackModalProps {
  sessionId: string;
  onFinish: () => void;
}

export default function FeedbackModal({ sessionId, onFinish }: FeedbackModalProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function handleEnviar() {
    if (rating === 0 || enviando) return;
    setEnviando(true);
    try {
      await fetch("/api/feedback/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          rating,
          comment: comment.trim() || null,
        }),
      });
    } catch {
      // No bloqueamos la salida del usuario por un error de red al guardar.
    } finally {
      onFinish();
    }
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#0b2e26]/50 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm animate-modal-in rounded-2xl bg-white p-5 shadow-2xl">
        <p className="mb-1 text-base font-semibold text-[#1a4d4d]">¡Espera! ¿Cómo te fue?</p>
        <p className="mb-4 text-xs text-[#5a7a75]">Tu opinión nos ayuda a mejorar O.</p>

        <div className="mb-4 flex justify-center gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHoverRating(n)}
              onMouseLeave={() => setHoverRating(0)}
              aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
              className="text-3xl leading-none transition-transform hover:scale-110"
            >
              <span className={(hoverRating || rating) >= n ? "text-[#f5b93d]" : "text-[#e3f3ee]"}>★</span>
            </button>
          ))}
        </div>

        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="¿Qué te pareció O? (opcional)"
          disabled={enviando}
          className="mb-4 w-full rounded-full border border-[#e3f3ee] bg-[#f7fdfb] px-4 py-2.5 text-sm text-[#1a4d4d] placeholder-[#8fb3ac] outline-none disabled:opacity-50"
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onFinish}
            disabled={enviando}
            className="flex-1 rounded-full border border-[#e3f3ee] px-3 py-2.5 text-sm font-medium text-[#5a7a75] transition-colors hover:bg-[#f7fdfb] disabled:opacity-50"
          >
            Evaluar después
          </button>
          <button
            type="button"
            onClick={handleEnviar}
            disabled={rating === 0 || enviando}
            className="flex-1 rounded-full bg-[#1D9E75] px-3 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {enviando ? "Enviando..." : "Enviar"}
          </button>
        </div>
      </div>
    </div>
  );
}
