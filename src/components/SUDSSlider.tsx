"use client";

import { useState } from "react";

// SUDS (Subjective Units of Distress Scale) — 0 (calma total) a 10 (angustia
// máxima). A diferencia de las evaluaciones Likert, es una sola pregunta con
// un slider, así que no usa EvaluacionLikertBase.

interface SUDSSliderProps {
  usuarioId: string;
  programaId: string;
  moduloNumero?: number;
  onComplete: (valor: number) => void;
}

const ETIQUETAS: Record<number, string> = {
  0: "Calma total",
  5: "Malestar moderado",
  10: "Angustia máxima",
};

export default function SUDSSlider({
  usuarioId,
  programaId,
  moduloNumero,
  onComplete,
}: SUDSSliderProps) {
  const [valor, setValor] = useState(5);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    setEnviando(true);
    setError(null);

    try {
      const res = await fetch("/api/evaluaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario_id: usuarioId,
          programa_id: programaId,
          tipo: "SUDS",
          modulo_numero: moduloNumero ?? null,
          resultado: { respuestas: [valor], score: valor },
        }),
      });
      if (!res.ok) throw new Error("No se pudo guardar");
      setEnviado(true);
      onComplete(valor);
    } catch {
      setError("No pudimos guardar tu respuesta. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[#e3f3ee] bg-white p-4 shadow-sm">
      <h3 className="mb-1 text-sm font-semibold text-[#1a4d4d]">
        ¿Qué tan intenso sientes el malestar ahora?
      </h3>
      <p className="mb-4 text-xs text-[#5a7d78]">0 = calma total · 10 = angustia máxima</p>

      {enviado ? (
        <p className="text-sm text-[#5a7d78]">Gracias, quedó registrado.</p>
      ) : (
        <>
          <div className="mb-2 flex items-center justify-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1D9E75] text-lg font-semibold text-white">
              {valor}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={valor}
            onChange={(e) => setValor(Number(e.target.value))}
            disabled={enviando}
            className="w-full accent-[#1D9E75]"
          />
          <div className="mt-1 flex justify-between text-[10px] text-[#5a7d78]">
            <span>{ETIQUETAS[0]}</span>
            <span>{ETIQUETAS[5]}</span>
            <span>{ETIQUETAS[10]}</span>
          </div>

          <button
            type="button"
            onClick={guardar}
            disabled={enviando}
            className="mt-4 w-full rounded-full bg-[#1D9E75] py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {enviando ? "Guardando..." : "Confirmar"}
          </button>
        </>
      )}

      {error && <p className="mt-3 text-xs text-[#b3453a]">{error}</p>}
    </div>
  );
}
