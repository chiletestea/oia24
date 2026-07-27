// Protección del panel /admin/* por contraseña compartida (ADMIN_PASSWORD),
// mismo enfoque MVP que src/lib/supervisor-auth.ts. La cookie de sesión no
// guarda la contraseña: guarda un HMAC derivado de ella, así que robar la
// cookie no revela ADMIN_PASSWORD. Las comparaciones usan timingSafeEqual
// para no filtrar información por temporización.

import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE_NAME = "o_admin_session";
const TOKEN_MESSAGE = "admin-autenticado";

function compararSeguro(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function firmarToken(secret: string): string {
  return createHmac("sha256", secret).update(TOKEN_MESSAGE).digest("hex");
}

export function verificarPasswordAdmin(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || !password) return false;
  return compararSeguro(password, expected);
}

export function generarTokenSesionAdmin(): string {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) throw new Error("ADMIN_PASSWORD no está configurada en el servidor.");
  return firmarToken(secret);
}

export function verificarTokenSesionAdmin(token: string | undefined | null): boolean {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret || !token) return false;
  return compararSeguro(token, firmarToken(secret));
}
