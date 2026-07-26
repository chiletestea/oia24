"use client";

import EvaluacionLikertBase, { type InterpretacionResultado } from "@/components/EvaluacionLikertBase";

// GAD-7 (Generalized Anxiety Disorder 7-item scale) — instrumento de
// tamizaje público y validado. Score 0-21 (suma directa, sin ítems inversos).
// Se renderiza solo cuando O emite la etiqueta [[INICIAR_GAD7]] (ver
// lib/etiquetas.ts) — el componente padre decide cuándo montarlo.
//
// NOTA CLÍNICA: esto es un tamizaje, no un diagnóstico. La redacción exacta
// y los puntos de corte deben ser validados por Luis (supervisor clínico)
// antes de usarse en producción.

const PREGUNTAS = [
  "Sentirte nervioso/a, ansioso/a o con los nervios de punta",
  "No ser capaz de parar o controlar la preocupación",
  "Preocuparte demasiado por diferentes cosas",
  "Dificultad para relajarte",
  "Estar tan inquieto/a que te es difícil quedarte quieto/a",
  "Volverte fácilmente molesto/a o irritable",
  "Sentir miedo, como si algo terrible fuera a pasar",
];

const OPCIONES = [
  { valor: 0, etiqueta: "Nunca" },
  { valor: 1, etiqueta: "Varios días" },
  { valor: 2, etiqueta: "Más de la mitad de los días" },
  { valor: 3, etiqueta: "Casi todos los días" },
];

// Puntos de corte estándar del GAD-7 (0-21): 0-4 mínimo, 5-9 leve,
// 10-14 moderado, 15-21 significativo.
function interpretarGAD7(score: number): InterpretacionResultado {
  if (score <= 4) return { nivel: "Síntomas mínimos", color: "#1D9E75" };
  if (score <= 9) return { nivel: "Síntomas leves", color: "#1D9E75" };
  if (score <= 14) return { nivel: "Síntomas moderados", color: "#FFC107" };
  return { nivel: "Síntomas significativos", color: "#F44336" };
}

interface EvaluacionGAD7Props {
  usuarioId: string;
  programaId: string;
  moduloNumero?: number;
  onComplete: (score: number, respuestas: number[]) => void;
}

export default function EvaluacionGAD7({
  usuarioId,
  programaId,
  moduloNumero,
  onComplete,
}: EvaluacionGAD7Props) {
  return (
    <EvaluacionLikertBase
      tipo="GAD7"
      titulo="Evaluación GAD-7 · Ansiedad"
      preguntas={PREGUNTAS}
      opciones={OPCIONES}
      usuarioId={usuarioId}
      programaId={programaId}
      moduloNumero={moduloNumero}
      onComplete={onComplete}
      interpretar={interpretarGAD7}
    />
  );
}
