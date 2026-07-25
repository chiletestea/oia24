"use client";

import OFace from "@/components/OFace";

interface ModuloCompletedProps {
  moduloNumero: number;
  totalModulos: number;
  onContinuar: () => void;
}

export default function ModuloCompleted({
  moduloNumero,
  totalModulos,
  onContinuar,
}: ModuloCompletedProps) {
  const esUltimo = moduloNumero >= totalModulos;

  return (
    <div className="animate-fade-in rounded-2xl border border-[#e3f3ee] bg-white p-5 text-center shadow-sm">
      <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(29,158,117,0.1)]">
        <OFace emotion="normal" size={56} />
      </div>

      <h3 className="text-base font-semibold text-[#1a4d4d]">
        {esUltimo ? "¡Terminaste el programa!" : `¡Módulo ${moduloNumero} completado!`}
      </h3>
      <p className="mt-1 text-sm text-[#5a7d78]">
        {esUltimo
          ? "Completaste todos los módulos. Bien hecho."
          : "Un paso más en tu proceso. Sigue a tu ritmo."}
      </p>

      <div className="mt-4 flex items-center justify-center gap-2">
        {Array.from({ length: totalModulos }, (_, i) => i + 1).map((n) => (
          <span
            key={n}
            className={`h-2 w-2 rounded-full ${
              n <= moduloNumero ? "bg-[#1D9E75]" : "bg-[rgba(29,158,117,0.15)]"
            }`}
          />
        ))}
      </div>
      <p className="mt-1.5 text-xs text-[#5a7d78]">
        {moduloNumero} de {totalModulos} módulos
      </p>

      <button
        type="button"
        onClick={onContinuar}
        className="mt-4 w-full rounded-full bg-[#1D9E75] py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        {esUltimo ? "Ver mi progreso" : "Continuar →"}
      </button>
    </div>
  );
}
