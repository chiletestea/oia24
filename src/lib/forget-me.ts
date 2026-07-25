import { createHash, randomBytes } from "crypto";
import { getSupabaseServerClient } from "@/lib/supabase-server";

// Flujo de "derecho al olvido": el link en cada email lleva un token de un
// solo uso. Al hacer click, se borran permanentemente los datos del usuario
// sin pedir confirmación adicional (el consentimiento ya se dio al hacer
// click en el link del email).
//
// Ni el token en texto plano ni el email en texto plano se guardan en
// forget_me_tokens — solo sus hashes. usuarios.email_hash (columna generada
// por la DB, ver supabase/002_privacidad_supervision.sql) usa el mismo
// algoritmo para poder emparejarlos.

const TOKEN_TTL_DIAS = 30;

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/** Hash determinístico del email — debe coincidir con usuarios.email_hash. */
export function hashearEmail(email: string): string {
  return sha256Hex(email.trim().toLowerCase());
}

/** Genera un token aleatorio de un solo uso (el que va en el link del email). */
export function generarForgetMeToken(): string {
  return randomBytes(32).toString("hex");
}

/** Hash del token — es lo único que se persiste en la tabla. */
export function hashForgetMeToken(token: string): string {
  return sha256Hex(token);
}

/** Guarda el token (hasheado) asociado al email (hasheado), con vigencia de 30 días. */
export async function guardarForgetMeToken(token: string, email: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_DIAS * 24 * 60 * 60 * 1000);

  const { error } = await supabase.from("forget_me_tokens").insert({
    token_hash: hashForgetMeToken(token),
    email_hasheado: hashearEmail(email),
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    throw new Error(`No se pudo guardar el forget-me token: ${error.message}`);
  }
}

export interface ForgetMeValidacion {
  valido: boolean;
  emailHasheado?: string;
}

/** Valida vigencia del token. No lo consume — quien llame debe borrarlo tras usarlo. */
export async function validarForgetMeToken(token: string): Promise<ForgetMeValidacion> {
  const supabase = getSupabaseServerClient();
  const tokenHash = hashForgetMeToken(token);

  const { data, error } = await supabase
    .from("forget_me_tokens")
    .select("email_hasheado, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !data) return { valido: false };
  if (new Date(data.expires_at).getTime() < Date.now()) return { valido: false };

  return { valido: true, emailHasheado: data.email_hasheado };
}

/** Borra el token tras usarlo (o al expirar), para que sea estrictamente de un solo uso. */
export async function consumirForgetMeToken(token: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  await supabase.from("forget_me_tokens").delete().eq("token_hash", hashForgetMeToken(token));
}
