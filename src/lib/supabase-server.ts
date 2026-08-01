import { createClient } from "@supabase/supabase-js";

// Server-only client — uses the service role key, which bypasses RLS.
// Never import this file from a "use client" component.
export function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
    global: {
      // Next.js parchea el fetch global y lo cachea por default dentro del
      // App Router — sin esto, una consulta a Supabase puede quedar servida
      // desde una respuesta vieja aunque los datos ya cambiaron (visto en
      // vivo: un endpoint seguía devolviendo filas ya borradas). Este
      // cliente lee de una base mutable, así que nunca debe cachear.
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}
