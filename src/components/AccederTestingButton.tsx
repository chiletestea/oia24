"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Botón de la landing que crea una cuenta de testing (sin pago) y redirige
// a la pantalla de bienvenida. Ver PASO 2 / integración de MercadoPago para
// el reemplazo de este flujo por uno real.

export default function AccederTestingButton() {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setCargando(true);
    setError(null);

    try {
      const res = await fetch("/api/programa/crear-acceso-testing", { method: "POST" });
      if (!res.ok) throw new Error("No se pudo crear el acceso de testing");
      const data = (await res.json()) as { redirect_url: string };
      router.push(data.redirect_url);
    } catch {
      setError("No pudimos crear tu acceso. Intenta de nuevo.");
      setCargando(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={cargando}
        className="w-full rounded-full bg-[#1D9E75] px-7 py-3.5 text-base font-semibold text-white shadow-[0_8px_24px_-8px_rgba(29,158,117,0.6)] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
      >
        {cargando ? "Creando tu acceso..." : "Acceder para Testing"}
      </button>
      {error && <p className="mt-2 text-center text-xs text-[#b3453a]">{error}</p>}
    </div>
  );
}
