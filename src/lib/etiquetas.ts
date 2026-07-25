// Sistema de etiquetas: O (el modelo) inserta marcadores de control dentro de
// su texto para disparar acciones de UI. parseEtiquetas() las extrae, las
// quita del texto visible, y le dice al frontend qué componente renderizar.
//
// Formatos soportados:
//   [[MODULO_COMPLETADO:N]]      — el usuario terminó el módulo N
//   [[SOLICITAR_EVALUACION:N]]   — sugerir una evaluación tras el módulo N
//   [[INICIAR_GAD7]]             — renderizar <EvaluacionGAD7 />
//   [[INICIAR_BAI]]              — renderizar <EvaluacionBAI />
//   [[INICIAR_OLBI]]             — renderizar <EvaluacionOLBI />
//   [HITO_COMPLETADO]            — celebrar un hito (sin número asociado)

export type EtiquetaTipo =
  | "MODULO_COMPLETADO"
  | "SOLICITAR_EVALUACION"
  | "INICIAR_GAD7"
  | "INICIAR_BAI"
  | "INICIAR_OLBI"
  | "HITO_COMPLETADO";

export interface Etiqueta {
  tipo: EtiquetaTipo;
  /** Número de módulo asociado, solo presente en MODULO_COMPLETADO y SOLICITAR_EVALUACION. */
  numero?: number;
}

export interface ParseEtiquetasResult {
  /** El texto original sin las etiquetas, listo para mostrarle al usuario. */
  textoLimpio: string;
  /** Todas las etiquetas detectadas, en el orden en que aparecieron. */
  etiquetas: Etiqueta[];
  /** Tipos únicos detectados — el frontend los usa para decidir qué renderizar. */
  acciones: EtiquetaTipo[];
}

const CON_NUMERO = /\[\[(MODULO_COMPLETADO|SOLICITAR_EVALUACION):(\d+)\]\]/g;
const SIN_NUMERO_DOBLE = /\[\[(INICIAR_GAD7|INICIAR_BAI|INICIAR_OLBI)\]\]/g;
const HITO = /\[HITO_COMPLETADO\]/g;

export function parseEtiquetas(texto: string): ParseEtiquetasResult {
  const etiquetas: Etiqueta[] = [];

  let textoLimpio = texto
    .replace(CON_NUMERO, (_match, tipo: EtiquetaTipo, numero: string) => {
      etiquetas.push({ tipo, numero: Number(numero) });
      return "";
    })
    .replace(SIN_NUMERO_DOBLE, (_match, tipo: EtiquetaTipo) => {
      etiquetas.push({ tipo });
      return "";
    })
    .replace(HITO, () => {
      etiquetas.push({ tipo: "HITO_COMPLETADO" });
      return "";
    });

  textoLimpio = textoLimpio.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();

  const acciones = Array.from(new Set(etiquetas.map((e) => e.tipo)));

  return { textoLimpio, etiquetas, acciones };
}

/** Atajo: ¿el texto contiene alguna etiqueta de esta lista? */
export function tieneEtiqueta(resultado: ParseEtiquetasResult, tipo: EtiquetaTipo): boolean {
  return resultado.acciones.includes(tipo);
}

export function numeroDeEtiqueta(
  resultado: ParseEtiquetasResult,
  tipo: "MODULO_COMPLETADO" | "SOLICITAR_EVALUACION"
): number | undefined {
  return resultado.etiquetas.find((e) => e.tipo === tipo)?.numero;
}
