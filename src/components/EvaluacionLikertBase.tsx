"use client";

import { useState } from "react";
import type { TipoEvaluacion } from "@/types/privacy";

// Renderizador compartido por EvaluacionGAD7 / EvaluacionBAI / EvaluacionOLBI
// — las tres son escalas Likert con la misma mecánica de UI (una pregunta a
// la vez, opciones como chips, barra de progreso, guardado al final). Lo
// único que cambia entre ellas son las preguntas, las etiquetas de la escala
// y el tipo. No se exporta como evaluación independiente: cada archivo
// público arma sus preguntas y llama a este componente.

export interface EvaluacionLikertBaseProps {
  tipo: TipoEvaluacion;
  titulo: string;
  preguntas: string[];
  opciones: { valor: number; etiqueta: string }[];
  usuarioId: string;
  programaId: string;
  moduloNumero?: number;
  onComplete: (score: number, respuestas: number[]) => void;
}

export default function EvaluacionLikertBase({
  tipo,
  titulo,
  preguntas,
  opciones,
  usuarioId,
  programaId,
  moduloNumero,
  onComplete,
}: EvaluacionLikertBaseProps) {
  const [respuestas, setRespuestas] = useState<number[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preguntaActual = respuestas.length;
  const terminado = preguntaActual >= preguntas.length;

  async function guardar(todasLasRespuestas: number[]) {
    const score = todasLasRespuestas.reduce((sum, v) => sum + v, 0);
    setEnviando(true);
    setError(null);

    try {
      const res = await fetch("/api/evaluaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario_id: usuarioId,
          programa_id: programaId,
          tipo,
          modulo_numero: moduloNumero ?? null,
          resultado: { respuestas: todasLasRespuestas, score },
        }),
      });
      if (!res.ok) throw new Error("No se pudo guardar la evaluación");
      onComplete(score, todasLasRespuestas);
    } catch {
      setError("No pudimos guardar tu evaluación. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  function responder(valor: number) {
    const nuevas = [...respuestas, valor];
    setRespuestas(nuevas);
    if (nuevas.length >= preguntas.length) {
      void guardar(nuevas);
    }
  }

  return (
    <div className="rounded-2xl border border-[#e3f3ee] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#1a4d4d]">{titulo}</h3>
        <span className="text-xs text-[#5a7d78]">
          {Math.min(preguntaActual + 1, preguntas.length)} de {preguntas.length}
        </span>
      </div>

      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-[rgba(29,158,117,0.1)]">
        <div
          className="h-full rounded-full bg-[#1D9E75] transition-all"
          style={{ width: `${(preguntaActual / preguntas.length) * 100}%` }}
        />
      </div>

      {terminado ? (
        <p className="text-sm text-[#5a7d78]">
          {enviando ? "Guardando tu evaluación..." : "¡Listo! Gracias por completarla."}
        </p>
      ) : (
        <>
          <p className="mb-4 text-sm text-[#1a4d4d]">{preguntas[preguntaActual]}</p>
          <div className="flex flex-col gap-2">
            {opciones.map((op) => (
              <button
                key={op.valor}
                type="button"
                onClick={() => responder(op.valor)}
                disabled={enviando}
                className="rounded-full border border-[#c7ebe0] bg-[rgba(29,158,117,0.06)] px-4 py-2 text-left text-sm text-[#1a4d4d] transition-colors hover:border-[#1D9E75] hover:bg-[rgba(29,158,117,0.12)] disabled:opacity-50"
              >
                {op.etiqueta}
              </button>
            ))}
          </div>
        </>
      )}

      {error && <p className="mt-3 text-xs text-[#b3453a]">{error}</p>}
    </div>
  );
}
