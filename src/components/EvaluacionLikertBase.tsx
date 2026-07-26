"use client";

import { useState } from "react";
import type { TipoEvaluacion } from "@/types/privacy";

// Renderizador compartido por EvaluacionGAD7 / EvaluacionBAI / EvaluacionOLBI
// — las tres son escalas Likert con la misma mecánica de UI (una pregunta a
// la vez, opciones como chips, barra de progreso, guardado al final). Lo
// único que cambia entre ellas son las preguntas, las etiquetas de la escala
// y el tipo. No se exporta como evaluación independiente: cada archivo
// público arma sus preguntas y llama a este componente.

export interface InterpretacionResultado {
  nivel: string;
  color: string;
}

export interface EvaluacionLikertBaseProps {
  tipo: TipoEvaluacion;
  titulo: string;
  preguntas: string[];
  opciones: { valor: number; etiqueta: string }[];
  usuarioId: string;
  programaId: string;
  moduloNumero?: number;
  onComplete: (score: number, respuestas: number[]) => void;
  /**
   * Si se entrega, al terminar se muestra una pantalla de resultados (score,
   * nivel, barra) con un botón "Continuar" antes de llamar a onComplete — en
   * vez de cerrar la evaluación de inmediato. Sin esta prop el componente se
   * comporta como antes (guarda y cierra).
   */
  interpretar?: (score: number) => InterpretacionResultado;
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
  interpretar,
}: EvaluacionLikertBaseProps) {
  const [respuestas, setRespuestas] = useState<number[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ score: number; respuestas: number[] } | null>(null);

  const preguntaActual = respuestas.length;
  const terminado = preguntaActual >= preguntas.length;
  const maxPorPregunta = Math.max(...opciones.map((op) => op.valor));
  const scoreMaximo = preguntas.length * maxPorPregunta;

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
      if (interpretar) {
        setResultado({ score, respuestas: todasLasRespuestas });
      } else {
        onComplete(score, todasLasRespuestas);
      }
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

  if (resultado && interpretar) {
    const { nivel, color } = interpretar(resultado.score);
    return (
      <div className="rounded-2xl border border-[#e3f3ee] bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-[#1a4d4d]">{titulo} · Resultado</h3>

        <p className="text-sm text-[#1a4d4d]">
          Tu puntaje: <span className="font-semibold">{resultado.score}</span> de {scoreMaximo}
        </p>
        <p className="mt-1 text-sm font-medium" style={{ color }}>
          {nivel}
        </p>

        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#e5e5e5]">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${(resultado.score / scoreMaximo) * 100}%`, background: color }}
          />
        </div>

        <p className="mt-3 text-xs text-[#5a7d78]">
          Recuerda: esto no es diagnóstico. Un profesional puede hacer una evaluación clínica completa.
        </p>

        <button
          type="button"
          onClick={() => onComplete(resultado.score, resultado.respuestas)}
          className="mt-4 w-full rounded-full bg-[#1D9E75] px-4 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Continuar
        </button>
      </div>
    );
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
