"use client";

// Tarjeta de emergencia — hardcodeada, nunca generada por la IA. Compartida
// por SalesBot y la página de chat de programa para que el mensaje de
// crisis sea idéntico en todas las superficies.

interface CrisisCardProps {
  onConfirmSafety: () => void;
}

export default function CrisisCard({ onConfirmSafety }: CrisisCardProps) {
  return (
    <div className="mb-3 animate-fade-in rounded-2xl border border-[#f3c8be] bg-[#fff5f2] p-3.5 shadow-sm">
      <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[#b3453a]">
        <span className="text-base">😟</span> Esto suena serio, y tu seguridad es lo primero.
      </p>
      <p className="mb-3 text-xs leading-relaxed text-[#8a4a41]">
        Si estás en riesgo o necesitas ayuda inmediata, contacta ahora a:
      </p>
      <ul className="mb-3 space-y-1 text-xs text-[#4a2e29]">
        <li>
          <span className="font-semibold text-[#b3453a]">Línea de Prevención del Suicidio:</span> *4141 (24/7)
        </li>
        <li>
          <span className="font-semibold text-[#b3453a]">Salud Responde:</span> 600 360 7777
        </li>
        <li>
          <span className="font-semibold text-[#b3453a]">Fono Familia (VIF):</span> 149
        </li>
      </ul>
      <p className="mb-3 text-xs leading-relaxed text-[#8a4a41]">
        También puedes escribir directamente a Luis, psicólogo clínico supervisor:{" "}
        <span className="font-semibold text-[#4a2e29]">+56 9 7862 1403</span>.
      </p>
      <button
        type="button"
        onClick={onConfirmSafety}
        className="rounded-full border border-[#b3453a] px-3 py-1.5 text-xs font-medium text-[#b3453a] transition-colors hover:bg-[#b3453a] hover:text-white"
      >
        Estoy a salvo, continuar
      </button>
    </div>
  );
}
