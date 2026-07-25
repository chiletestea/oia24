export interface Usuario {
  id: string;
  email: string;
  nombre: string | null;
  programa_id: string | null;
  token: string;
  fecha_pago: string;
  fecha_vencimiento: string;
  modulo_actual: number;
  activo: boolean;
  consentimiento: Consentimiento;
  created_at: string;
  deleted_at: string | null;
}

export interface Consentimiento {
  acepta_terminos: boolean;
  fecha_aceptacion: string | null;
  version: string;
}

export interface Modulo {
  id: string;
  usuario_id: string;
  programa_id: string;
  numero: number;
  completado: boolean;
  fecha_completado: string | null;
  created_at: string;
}

export interface ChatSesion {
  id: string;
  usuario_id: string;
  programa_id: string;
  modulo_numero: number;
  mensajes: string; // blob encriptado (ver lib/encriptacion.ts)
  resumen_ia: string | null;
  cerrada_en: string | null;
  email_enviado: boolean;
  email_enviado_en: string | null;
  visto_por_supervisor: boolean;
  visto_en: string | null;
  es_crisis: boolean;
  created_at: string;
}

export type TipoEvaluacion = "GAD7" | "BAI" | "OLBI" | "SUDS";

export interface Evaluacion {
  id: string;
  usuario_id: string;
  programa_id: string;
  tipo: TipoEvaluacion;
  modulo_numero: number | null;
  resultado: EvaluacionResultado;
  visto_por_supervisor: boolean;
  created_at: string;
}

export interface EvaluacionResultado {
  respuestas: number[];
  score: number;
}

/** Mensaje de chat en texto plano, previo a encriptar/guardar. */
export interface OChatMessage {
  role: "user" | "assistant";
  content: string;
}
