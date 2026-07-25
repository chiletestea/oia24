// Currículum de "Ansiedad Bajo Control" — módulos 0 a 8 (9 en total).
//
// PLACEHOLDER: son nombres/descripciones razonables para un programa
// CBT + mindfulness de ansiedad, pero no fueron provistos por el spec ni
// validados clínicamente. Luis (supervisor clínico) debería revisarlos
// antes de que el programa se use con usuarios reales.

export interface ModuloInfo {
  numero: number;
  nombre: string;
  descripcion: string;
}

export const ANSIEDAD_MODULOS: ModuloInfo[] = [
  {
    numero: 0,
    nombre: "Bienvenida",
    descripcion: "Cómo funciona tu programa y qué esperar de O.",
  },
  {
    numero: 1,
    nombre: "Entendiendo tu ansiedad",
    descripcion: "Qué es la ansiedad y por qué aparece.",
  },
  {
    numero: 2,
    nombre: "Tu cerebro ante el miedo",
    descripcion: "Cómo funciona la respuesta de alarma del cuerpo.",
  },
  {
    numero: 3,
    nombre: "Respiración y regulación",
    descripcion: "Herramientas para calmar el cuerpo en el momento.",
  },
  {
    numero: 4,
    nombre: "Observar tus pensamientos",
    descripcion: "Aprende a mirar tus pensamientos sin fusionarte con ellos.",
  },
  {
    numero: 5,
    nombre: "Identificar tus gatillantes",
    descripcion: "Qué situaciones activan tu ansiedad y por qué.",
  },
  {
    numero: 6,
    nombre: "Herramientas para el momento agudo",
    descripcion: "Qué hacer cuando la ansiedad sube fuerte y rápido.",
  },
  {
    numero: 7,
    nombre: "Exposición gradual",
    descripcion: "Enfrentar de a poco lo que evitas, a tu ritmo.",
  },
  {
    numero: 8,
    nombre: "Integración y plan a futuro",
    descripcion: "Cierre del programa y cómo sostener lo aprendido.",
  },
];
