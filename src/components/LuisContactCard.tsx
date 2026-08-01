"use client";

// Tarjeta destacada de contacto profesional — hardcodeada (no generada por la
// IA) para que los datos de Luis Tapia siempre se vean iguales y correctos.
// O solo decide CUÁNDO mostrarla (vía el sentinel [CONTACTO_LUIS]); el
// contenido de la tarjeta en sí no depende del texto que O haya escrito.

const WHATSAPP_NUMERO = "+56 9 7862 1403";
const WHATSAPP_URL = "https://wa.me/56978621403";
const WEB_URL = "https://www.openterapia.cl";
const WEB_LABEL = "www.openterapia.cl";

export default function LuisContactCard() {
  return (
    <div className="mb-3 max-w-[85%] animate-fade-in rounded-2xl border border-[#c7ebe0] bg-gradient-to-br from-[#f0f9f7] to-[#e3f6f0] p-4 shadow-sm">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1D9E75] text-base text-white">
          🧑‍⚕️
        </span>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-[#1a4d4d]">Luis Tapia</span>
          <span className="text-xs text-[#5a7d78]">Psicólogo Clínico · Terapia de Pareja</span>
        </div>
      </div>

      <ul className="mb-3 space-y-1.5 text-xs text-[#1a4d4d]">
        <li className="flex items-center gap-1.5">
          <span className="text-sm">📍</span>
          Puerto Montt (sector Valle Volcanes) · online para todo Chile
        </li>
        <li className="flex items-center gap-1.5">
          <span className="text-sm">🌐</span>
          <a
            href={WEB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[#1D9E75] underline decoration-[#1D9E75]/40 underline-offset-2 hover:decoration-[#1D9E75]"
          >
            {WEB_LABEL}
          </a>
        </li>
      </ul>

      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="text-base">🟢</span>
        Escribir por WhatsApp
      </a>
      <p className="mt-1.5 text-center text-[11px] text-[#5a7d78]">{WHATSAPP_NUMERO}</p>
    </div>
  );
}
