import { getSupabaseServerClient } from "@/lib/supabase-server";
import { desencriptarJSON, encriptarJSON } from "@/lib/encriptacion";
import type { ChatSesion, OChatMessage, Usuario } from "@/types/privacy";

// Acceso a datos compartido entre /api/o-chat, /api/mini-resumen,
// /api/sesion/cerrar y /api/sesion/iniciar — todas manipulan las mismas
// filas de chat_sesiones (y necesitan desencriptar/re-encriptar el mismo
// modo). Vive en lib/ para no duplicar esta lógica en cada route.ts.

export interface ProgramaInfo {
  id: string;
  nombre: string;
  modulos: number;
}

export async function fetchPrograma(programaId: string): Promise<ProgramaInfo | null> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("programas")
    .select("id, nombre, modulos")
    .eq("id", programaId)
    .maybeSingle();

  return (data as ProgramaInfo | null) ?? null;
}

export async function fetchUsuario(usuarioId: string): Promise<Usuario | null> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", usuarioId)
    .maybeSingle();

  return (data as Usuario | null) ?? null;
}

/** Sesión de chat abierta (sin cerrar) para este módulo, si existe. */
export async function fetchSesionAbierta(
  usuarioId: string,
  programaId: string,
  moduloNumero: number
): Promise<ChatSesion | null> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("chat_sesiones")
    .select("*")
    .eq("usuario_id", usuarioId)
    .eq("programa_id", programaId)
    .eq("modulo_numero", moduloNumero)
    .is("cerrada_en", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as ChatSesion | null) ?? null;
}

/** La última sesión CERRADA del usuario (de cualquier módulo) — para el saludo de reinicio. */
export async function fetchUltimaSesionCerrada(usuarioId: string): Promise<ChatSesion | null> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("chat_sesiones")
    .select("*")
    .eq("usuario_id", usuarioId)
    .not("cerrada_en", "is", null)
    .order("cerrada_en", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as ChatSesion | null) ?? null;
}

export async function crearSesion(
  usuarioId: string,
  programaId: string,
  moduloNumero: number
): Promise<ChatSesion> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("chat_sesiones")
    .insert({
      usuario_id: usuarioId,
      programa_id: programaId,
      modulo_numero: moduloNumero,
      mensajes: encriptarJSON([] satisfies OChatMessage[]),
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`No se pudo crear la sesión de chat: ${error?.message}`);
  }

  return data as ChatSesion;
}

export function decodificarMensajes(sesion: ChatSesion): OChatMessage[] {
  try {
    return desencriptarJSON<OChatMessage[]>(sesion.mensajes);
  } catch {
    return [];
  }
}

/** Avanza usuarios.modulo_actual al siguiente módulo (solo si es mayor al actual — nunca retrocede). */
export async function incrementarModuloActual(
  usuarioId: string,
  moduloCompletado: number
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("usuarios")
    .select("modulo_actual")
    .eq("id", usuarioId)
    .maybeSingle();

  const siguiente = moduloCompletado + 1;
  if ((data?.modulo_actual ?? 0) >= siguiente) return;

  await supabase.from("usuarios").update({ modulo_actual: siguiente }).eq("id", usuarioId);
}

export async function marcarSesionComoCrisis(sesionId: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  await supabase.from("chat_sesiones").update({ es_crisis: true }).eq("id", sesionId);
}

export async function guardarMensajes(
  sesionId: string,
  mensajes: OChatMessage[]
): Promise<void> {
  const supabase = getSupabaseServerClient();
  await supabase
    .from("chat_sesiones")
    .update({ mensajes: encriptarJSON(mensajes) })
    .eq("id", sesionId);
}

export async function contarModulosCompletados(
  usuarioId: string,
  programaId: string
): Promise<number> {
  const supabase = getSupabaseServerClient();
  const { count } = await supabase
    .from("modulos")
    .select("id", { count: "exact", head: true })
    .eq("usuario_id", usuarioId)
    .eq("programa_id", programaId)
    .eq("completado", true);

  return count ?? 0;
}

export async function marcarModuloCompletado(
  usuarioId: string,
  programaId: string,
  numero: number
): Promise<void> {
  const supabase = getSupabaseServerClient();
  await supabase.from("modulos").upsert(
    {
      usuario_id: usuarioId,
      programa_id: programaId,
      numero,
      completado: true,
      fecha_completado: new Date().toISOString(),
    },
    { onConflict: "usuario_id,programa_id,numero" }
  );
}
