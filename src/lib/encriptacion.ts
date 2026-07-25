import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

// AES-256-GCM con crypto nativo de Node. Server-only — nunca importar
// este archivo desde un componente "use client".
//
// ENCRYPTION_KEY debe ser un secreto de al menos 32 caracteres (cualquier
// string sirve como entrada; se deriva una clave de 256 bits vía scrypt).
// Generar uno nuevo con: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const SALT = "openia-encriptacion-v1";

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret || secret.length < 16) {
    throw new Error(
      "Falta ENCRYPTION_KEY en el entorno (o es demasiado corta). Genera una con `node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"` y agrégala a .env.local."
    );
  }
  return scryptSync(secret, SALT, 32);
}

/** Encripta un string arbitrario. Devuelve un blob "iv:authTag:ciphertext" en base64. */
export function encriptarDatos(data: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(data, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(
    ":"
  );
}

/** Revierte encriptarDatos(). Lanza si el blob fue alterado o la clave no coincide. */
export function desencriptarDatos(blob: string): string {
  const key = getKey();
  const [ivB64, authTagB64, dataB64] = blob.split(":");
  if (!ivB64 || !authTagB64 || !dataB64) {
    throw new Error("Blob encriptado con formato inválido.");
  }

  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/** Azúcar sintáctico para encriptar un objeto JSON (p.ej. el historial de mensajes). */
export function encriptarJSON(data: unknown): string {
  return encriptarDatos(JSON.stringify(data));
}

export function desencriptarJSON<T>(blob: string): T {
  return JSON.parse(desencriptarDatos(blob)) as T;
}
