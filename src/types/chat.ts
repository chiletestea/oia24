export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export type Area = "ansiedad" | "trabajo" | "mente" | "urgente";

export type Step = "q1" | "q2" | "recommendation" | "freeform";

export interface Program {
  nombre: string;
  descripcion: string | null;
  precio: number;
  modulos: number;
  color: string;
}

export interface ChatRequestBody {
  messages: ChatMessage[];
  step: Step;
  area?: Area;
}

export type ChatStreamEvent =
  | { type: "text"; text: string }
  | { type: "program"; program: Program }
  | { type: "crisis" }
  | { type: "done" }
  | { type: "error"; message: string };
