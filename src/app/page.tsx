"use client";

import { useState } from "react";
import OFace from "@/components/OFace";
import SalesBot from "@/components/SalesBot";

// PROGRAMAS OCULTOS POR AHORA — Solo O disponible. Array conservado para
// reactivar la sección fácilmente cuando corresponda.
// const PROGRAMS = [
//   {
//     badge: "ANSIEDAD",
//     color: "#1D9E75",
//     title: "Ansiedad Bajo Control",
//     modules: "8 módulos · IA",
//     price: "$4.990",
//   },
//   {
//     badge: "TRABAJO",
//     color: "#149672",
//     title: "Respira en el Trabajo",
//     modules: "6 módulos · IA",
//     price: "$4.990",
//   },
//   {
//     badge: "REGULACIÓN",
//     color: "#0e8b6b",
//     title: "Regulación Express",
//     modules: "4 módulos · IA",
//     price: "$2.990",
//   },
//   {
//     badge: "MENTE",
//     color: "#2bb98a",
//     title: "Deja de Sobrepensar",
//     modules: "5 módulos · IA",
//     price: "$4.990",
//   },
// ];

export default function Home() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="min-h-screen text-[#1a4d4d]">
      {/* HEADER */}
      <header className="flex items-center justify-between px-5 py-4">
        <div className="text-[20px] font-semibold">
          <span className="text-[#1a4d4d]">open</span>
          <span className="text-[#1D9E75]">ia</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#1D9E75] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#1D9E75]" />
          </span>
          <span className="text-xs text-[#5a7d78]">O activa · 24/7</span>
        </div>
      </header>

      {/* HERO */}
      <section className="flex flex-col items-center px-5 pb-8 pt-6 text-center">
        <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-full bg-[rgba(29,158,117,0.1)]">
          <OFace emotion="normal" size={104} breathing />
        </div>

        <h1 className="text-[30px] font-semibold leading-snug text-[#1a4d4d]">
          Hola, soy O - Tu asistente de bienestar emocional
        </h1>
        <p className="mt-2 max-w-xs text-sm text-[#4a6f6a]">
          Conversaciones privadas, 100% gratis, 24/7. Sin límites.
        </p>

        <button
          type="button"
          onClick={() => setChatOpen(true)}
          className="mt-6 rounded-full bg-[#1D9E75] px-7 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(29,158,117,0.6)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Hablar con O ahora
        </button>

        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[#c7ebe0] bg-white/60 px-3 py-1.5 text-xs text-[#1D9E75]">
          <span>✓</span> 100% privado · Sin diagnósticos · Sin guardar datos
        </div>
      </section>

      {/* PROGRAMAS OCULTOS POR AHORA — Solo O disponible */}

      {/* SUPERVISOR */}
      <section className="px-5 pb-6">
        <div className="flex items-center justify-between rounded-xl border border-[#e3f3ee] bg-white/80 p-3.5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e3f3ee] bg-[rgba(29,158,117,0.08)]">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1D9E75"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-[#1a4d4d]">
                IA supervisada por un psicólogo clínico
              </span>
            </div>
          </div>
          <span className="rounded-full border border-[#1D9E75] bg-[rgba(29,158,117,0.1)] px-2.5 py-1 text-xs text-[#1D9E75]">
            Activo
          </span>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-5 pb-28 pt-2 text-center text-xs text-[#8fb3ac]">
        Privacidad total · Sin datos almacenados
      </footer>

      {/* BOTÓN FLOTANTE */}
      <button
        type="button"
        onClick={() => setChatOpen(true)}
        aria-label="Abrir chat con O"
        className="fixed bottom-6 right-5 z-40 flex h-16 w-16 animate-glow-pulse items-center justify-center rounded-full shadow-[0_10px_28px_-6px_rgba(14,139,107,0.55)] transition-transform hover:scale-105 active:scale-95"
      >
        <OFace emotion="normal" size={64} />
      </button>

      <SalesBot open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
