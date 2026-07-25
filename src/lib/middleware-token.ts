import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { Usuario } from "@/types/privacy";

// Valida el token de acceso usado en las rutas /[programa]/[token]. No es un
// middleware.ts de Next.js (edge) — es un validador server-side que las
// páginas/rutas de esos módulos llaman explícitamente, porque necesita
// consultar Supabase con el service role (bypassea RLS, que solo permite
// leer con auth.uid()).

export type TokenInvalidoMotivo =
  | "no_encontrado"
  | "eliminado"
  | "inactivo"
  | "vencido"
  | "programa_no_coincide";

export interface ValidacionToken {
  valido: boolean;
  usuario?: Usuario;
  motivo?: TokenInvalidoMotivo;
}

/**
 * @param token UUID de acceso (segmento [token] de la URL).
 * @param programaId Si se pasa, además exige que sea el programa contratado por el usuario.
 */
export async function validarTokenAcceso(
  token: string,
  programaId?: string
): Promise<ValidacionToken> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (error || !data) {
    return { valido: false, motivo: "no_encontrado" };
  }

  const usuario = data as Usuario;

  if (usuario.deleted_at) {
    return { valido: false, motivo: "eliminado" };
  }
  if (!usuario.activo) {
    return { valido: false, motivo: "inactivo" };
  }
  if (new Date(usuario.fecha_vencimiento).getTime() <= Date.now()) {
    return { valido: false, motivo: "vencido" };
  }
  if (programaId && usuario.programa_id !== programaId) {
    return { valido: false, motivo: "programa_no_coincide" };
  }

  return { valido: true, usuario };
}
