"use client";

import EvaluacionLikertBase from "@/components/EvaluacionLikertBase";

// OLBI (Oldenburg Burnout Inventory) — 16 ítems, escala 1-4, dos subescalas
// (agotamiento y desconexión), con ítems redactados en ambos sentidos.
// Se renderiza solo con la etiqueta [[INICIAR_OLBI]] (ver lib/etiquetas.ts).
//
// IMPORTANTE: este componente guarda las 16 respuestas CRUDAS (1-4, en el
// orden de PREGUNTAS) — no aplica la inversión de puntaje de los ítems
// marcados en ITEMS_INVERTIDOS. Cualquier análisis posterior (dashboard de
// supervisión, etc.) debe invertir esos ítems (valor_invertido = 5 - valor)
// antes de sumar las subescalas. Redacción y puntos de corte deben ser
// validados por Luis (supervisor clínico) antes de producción.

const PREGUNTAS = [
  "Siempre encuentro nuevos aspectos interesantes en mi trabajo/programa", // desconexión, invertido
  "Con el tiempo, uno se puede desconectar de este tipo de trabajo", // desconexión
  "Cada vez hay más ocasiones en las que hablo de mi trabajo de forma negativa", // desconexión
  "Después del trabajo, suelo tener suficiente energía para mis actividades de ocio", // agotamiento, invertido
  "Cada vez me siento con menos compromiso con mi trabajo", // desconexión
  "Con el tiempo, uno se puede volver insensible a lo que pasa en el trabajo", // desconexión
  "Este tipo de trabajo mengua progresivamente mi energía", // agotamiento
  "Después de trabajar, tengo suficiente energía para mi vida familiar y social", // agotamiento, invertido
  "Después del trabajo, usualmente me siento agotado/a", // agotamiento
  "Usualmente puedo manejar bien la cantidad de trabajo", // agotamiento, invertido
  "Cuando trabajo, usualmente me siento con energía", // agotamiento, invertido
  "Frecuentemente hablo de mi trabajo de forma negativa con otros", // desconexión
  "Tiendo a pensar poco en las consecuencias de mis decisiones al trabajar", // desconexión
  "Encuentro mi trabajo un desafío positivo", // desconexión, invertido
  "Durante mi trabajo, a veces me siento emocionalmente exhausto/a", // agotamiento
  "Con el tiempo, uno se puede sentir cada vez más comprometido con su trabajo", // desconexión, invertido
];

/** Índices (0-based) de ítems redactados en sentido inverso — ver nota arriba. */
export const OLBI_ITEMS_INVERTIDOS = [0, 3, 7, 9, 10, 13, 15];

const OPCIONES = [
  { valor: 1, etiqueta: "Totalmente de acuerdo" },
  { valor: 2, etiqueta: "De acuerdo" },
  { valor: 3, etiqueta: "En desacuerdo" },
  { valor: 4, etiqueta: "Totalmente en desacuerdo" },
];

interface EvaluacionOLBIProps {
  usuarioId: string;
  programaId: string;
  moduloNumero?: number;
  onComplete: (score: number, respuestas: number[]) => void;
}

export default function EvaluacionOLBI({
  usuarioId,
  programaId,
  moduloNumero,
  onComplete,
}: EvaluacionOLBIProps) {
  return (
    <EvaluacionLikertBase
      tipo="OLBI"
      titulo="Evaluación OLBI · Desgaste laboral"
      preguntas={PREGUNTAS}
      opciones={OPCIONES}
      usuarioId={usuarioId}
      programaId={programaId}
      moduloNumero={moduloNumero}
      onComplete={onComplete}
    />
  );
}
