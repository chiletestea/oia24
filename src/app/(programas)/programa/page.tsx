import type { Metadata } from "next";
import Link from "next/link";
import AccederTestingButton from "@/components/AccederTestingButton";
import { ANSIEDAD_MODULOS } from "@/lib/programas/ansiedad-modulos";

export const metadata: Metadata = {
  title: "Ansiedad Bajo Control — openia",
  description: "Entiende, observa y regula tu ansiedad. 9 módulos guiados por O.",
};

const FAQ = [
  {
    pregunta: "¿Qué es O?",
    respuesta:
      "O es el asistente de IA que te acompaña en cada módulo — te guía, te escucha y te ayuda a practicar, con supervisión de un psicólogo clínico.",
  },
  {
    pregunta: "¿Es psicoterapia?",
    respuesta:
      "No. Es un programa de acompañamiento y psicoeducación, no un reemplazo de la terapia o atención psicológica profesional.",
  },
  {
    pregunta: "¿Qué pasa si tengo una crisis mientras uso el programa?",
    respuesta:
      "O está entrenado para detectar señales de riesgo y te deriva de inmediato a recursos de emergencia reales y a Luis, el supervisor clínico.",
  },
  {
    pregunta: "¿Qué pasa con mis datos?",
    respuesta:
      "Tus conversaciones se guardan encriptadas. Tu supervisor clínico solo ve resúmenes, nunca tus mensajes. Puedes eliminar todo permanentemente cuando quieras.",
  },
];

export default function ProgramaLandingPage() {
  return (
    <div className="min-h-screen px-5 py-10 text-[#1a4d4d]">
      <div className="mx-auto max-w-xl">
        {/* Hero */}
        <div className="flex flex-col items-center text-center">
          <div
            className="mb-5 h-20 w-20 rounded-full"
            style={{
              background: "radial-gradient(circle at 35% 30%, #2fc492, #0e8b6b)",
            }}
            aria-label="O"
            role="img"
          />

          <h1 className="text-2xl font-semibold">Ansiedad Bajo Control</h1>
          <p className="mt-2 max-w-sm text-sm text-[#4a6f6a]">
            Entiende, observa y regula tu ansiedad. 9 módulos guiados.
          </p>
          <p className="mt-3 text-lg font-semibold text-[#1D9E75]">$4.990 CLP</p>

          <div className="mt-6 w-full max-w-xs">
            <AccederTestingButton />
          </div>
        </div>

        {/* Módulos */}
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-medium text-[#4a6f6a]">Qué vas a trabajar</h2>
          <ol className="space-y-2">
            {ANSIEDAD_MODULOS.map((modulo) => (
              <li
                key={modulo.numero}
                className="flex items-start gap-3 rounded-xl border border-[#e3f3ee] bg-white/80 p-3"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[rgba(29,158,117,0.1)] text-xs font-semibold text-[#1D9E75]">
                  {modulo.numero}
                </span>
                <div>
                  <p className="text-sm font-medium text-[#1a4d4d]">{modulo.nombre}</p>
                  <p className="text-xs text-[#5a7d78]">{modulo.descripcion}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* FAQ */}
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-medium text-[#4a6f6a]">Preguntas frecuentes</h2>
          <div className="space-y-3">
            {FAQ.map((item) => (
              <div key={item.pregunta} className="rounded-xl border border-[#e3f3ee] bg-white/80 p-3.5">
                <p className="text-sm font-medium text-[#1a4d4d]">{item.pregunta}</p>
                <p className="mt-1 text-xs leading-relaxed text-[#5a7d78]">{item.respuesta}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-10 flex flex-col items-center gap-1.5 text-center text-xs text-[#8fb3ac]">
          <Link href="/politica-privacidad" className="text-[#1D9E75] hover:underline">
            Política de privacidad
          </Link>
          <a
            href="mailto:openterapiachile@gmail.com?subject=Eliminar%20mis%20datos"
            className="text-[#1D9E75] hover:underline"
          >
            Eliminar mis datos
          </a>
        </footer>
      </div>
    </div>
  );
}
