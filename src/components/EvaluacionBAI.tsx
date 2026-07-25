"use client";

import EvaluacionLikertBase from "@/components/EvaluacionLikertBase";

// BAI (Beck Anxiety Inventory) — 21 ítems, escala 0-3, score 0-63 (suma
// directa). Instrumento público y validado. Se renderiza solo con la
// etiqueta [[INICIAR_BAI]] (ver lib/etiquetas.ts).
//
// NOTA CLÍNICA: tamizaje, no diagnóstico. Redacción y puntos de corte deben
// ser validados por Luis (supervisor clínico) antes de producción.

const PREGUNTAS = [
  "Entumecimiento u hormigueo",
  "Sensación de calor",
  "Temblor en las piernas",
  "Incapacidad de relajarte",
  "Miedo a que pase lo peor",
  "Mareo o aturdimiento",
  "Palpitaciones o taquicardia",
  "Sensación de inestabilidad",
  "Terror",
  "Nerviosismo",
  "Sensación de ahogo",
  "Temblor de manos",
  "Temblor generalizado del cuerpo",
  "Miedo a perder el control",
  "Dificultad para respirar",
  "Miedo a morir",
  "Sensación de miedo o susto repentino",
  "Problemas digestivos o molestias abdominales",
  "Sensación de desmayo",
  "Rubor facial (enrojecimiento)",
  "Sudoración no debida al calor",
];

const OPCIONES = [
  { valor: 0, etiqueta: "Nada" },
  { valor: 1, etiqueta: "Levemente — no me molestó mucho" },
  { valor: 2, etiqueta: "Moderadamente — fue muy desagradable, pero pude soportarlo" },
  { valor: 3, etiqueta: "Severamente — casi no pude soportarlo" },
];

interface EvaluacionBAIProps {
  usuarioId: string;
  programaId: string;
  moduloNumero?: number;
  onComplete: (score: number, respuestas: number[]) => void;
}

export default function EvaluacionBAI({
  usuarioId,
  programaId,
  moduloNumero,
  onComplete,
}: EvaluacionBAIProps) {
  return (
    <EvaluacionLikertBase
      tipo="BAI"
      titulo="Evaluación BAI · Ansiedad"
      preguntas={PREGUNTAS}
      opciones={OPCIONES}
      usuarioId={usuarioId}
      programaId={programaId}
      moduloNumero={moduloNumero}
      onComplete={onComplete}
    />
  );
}
