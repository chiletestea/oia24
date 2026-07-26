// Identificador de sesión anónima para el chat público de la home (sin
// login) — persiste en localStorage para que O pueda reconocer al mismo
// visitante entre mensajes/recargas sin pedirle cuenta.

export function obtenerSesionAnonima(): string {
  if (typeof window === "undefined") return "";

  const clave = "o_sesion_id";
  let sesionId = localStorage.getItem(clave);

  if (!sesionId) {
    sesionId = crypto.randomUUID();
    localStorage.setItem(clave, sesionId);
  }

  return sesionId;
}

export function limpiarSesion(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("o_sesion_id");
  }
}
