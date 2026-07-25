import { randomUUID } from "crypto";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { generarForgetMeToken, guardarForgetMeToken } from "@/lib/forget-me";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/programa/crear-acceso-testing
// Crea una cuenta de testing (sin pago real) para el programa "Ansiedad Bajo
// Control" y devuelve el token de acceso. Es un atajo temporal para probar
// el flujo antes de integrar MercadoPago (PASO 2+) — sin él, cualquiera
// puede spamear cuentas gratis, así que hay que sacarlo o protegerlo antes
// de producción.
//
// usuarios.id es FK obligatoria a auth.users(id) (ver supabase/schema.sql) —
// no alcanza con generar un UUID cualquiera, hay que crear primero una
// cuenta real de Supabase Auth vía el admin API y usar su id.
//
// Si EMAIL_TESTING_RESEND está seteada, la cuenta de testing usa ese email en
// vez de uno inventado — así los emails de resumen llegan de verdad mientras
// la cuenta de Resend siga en modo sandbox (solo entrega al email verificado
// del dueño de la cuenta). Como usuarios.email es unique, cada vez que se usa
// esta cuenta se borra la anterior con ese mismo email antes de crear la nueva.

const PROGRAMA_NOMBRE = "Ansiedad Bajo Control";
const SEIS_MESES_MS = 6 * 30 * 24 * 60 * 60 * 1000;

async function borrarCuentaTestingPrevia(email: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { data: previo } = await supabase
    .from("usuarios")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (!previo) return;

  const usuarioId = previo.id as string;
  await Promise.all([
    supabase.from("chat_sesiones").delete().eq("usuario_id", usuarioId),
    supabase.from("evaluaciones").delete().eq("usuario_id", usuarioId),
    supabase.from("modulos").delete().eq("usuario_id", usuarioId),
  ]);
  await supabase.from("usuarios").delete().eq("id", usuarioId);
  await supabase.auth.admin.deleteUser(usuarioId);
}

export async function POST() {
  const supabase = getSupabaseServerClient();

  const { data: programa, error: programaError } = await supabase
    .from("programas")
    .select("id")
    .eq("nombre", PROGRAMA_NOMBRE)
    .maybeSingle();

  if (programaError || !programa) {
    console.error("Error buscando programa:", programaError);
    return Response.json(
      { error: `No se encontró el programa "${PROGRAMA_NOMBRE}"` },
      { status: 500 }
    );
  }

  const token = randomUUID();
  const email = process.env.EMAIL_TESTING_RESEND ?? `testing-${randomUUID().slice(0, 8)}@openia.cl`;
  if (process.env.EMAIL_TESTING_RESEND) {
    await borrarCuentaTestingPrevia(email);
  }
  const ahora = new Date();
  const vencimiento = new Date(ahora.getTime() + SEIS_MESES_MS);

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    console.error("Error creando cuenta de auth para testing:", authError);
    return Response.json({ error: "No se pudo crear el acceso de testing" }, { status: 500 });
  }

  const { error: usuarioError } = await supabase.from("usuarios").insert({
    id: authData.user.id,
    email,
    nombre: "Test User",
    programa_id: programa.id,
    token,
    fecha_pago: ahora.toISOString(),
    fecha_vencimiento: vencimiento.toISOString(),
    modulo_actual: 0,
    activo: true,
  });

  if (usuarioError) {
    console.error("Error creando usuario de testing:", usuarioError);
    // Limpieza: no dejar una cuenta de auth huérfana sin fila en usuarios.
    await supabase.auth.admin.deleteUser(authData.user.id);
    return Response.json({ error: "No se pudo crear el acceso de testing" }, { status: 500 });
  }

  const forgetMeToken = generarForgetMeToken();
  await guardarForgetMeToken(forgetMeToken, email);

  return Response.json({
    token,
    redirect_url: `/programa/bienvenida?token=${token}`,
  });
}
