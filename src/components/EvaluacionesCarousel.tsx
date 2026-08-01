"use client";

import { useEffect, useState } from "react";

interface Testimonio {
  rating: number;
  comment: string;
}

interface RespuestaPublica {
  testimonios: Testimonio[];
  total: number;
  promedio: number;
}

const INTERVALO_MS = 4000;
const DURACION_FADE_MS = 200;

function Estrellas({ cantidad }: { cantidad: number }) {
  return (
    <div aria-label={`${cantidad} de 5 estrellas`} className="text-sm leading-none">
      <span className="text-[#f5b93d]">{"★".repeat(cantidad)}</span>
      <span className="text-[#e3e3e3]">{"★".repeat(5 - cantidad)}</span>
    </div>
  );
}

// "5 unidades por estrella": una barra de 5 segmentos que representa el
// promedio sobre 5 (no una distribución por rating, solo el número general).
function BarraPromedio({ promedio }: { promedio: number }) {
  const unidades = Array.from({ length: 5 }, (_, i) => Math.max(0, Math.min(1, promedio - i)));

  return (
    <div className="flex gap-1" aria-hidden="true">
      {unidades.map((relleno, i) => (
        <div key={i} className="h-1 w-4 overflow-hidden rounded-full bg-[#e9f2ef]">
          <div className="h-full rounded-full bg-[#f5b93d]" style={{ width: `${relleno * 100}%` }} />
        </div>
      ))}
    </div>
  );
}

export default function EvaluacionesCarousel() {
  const [datos, setDatos] = useState<RespuestaPublica | null>(null);
  const [indice, setIndice] = useState(0);
  const [visible, setVisible] = useState(true);
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    let cancelado = false;
    fetch("/api/evaluaciones/public")
      .then((res) => (res.ok ? (res.json() as Promise<RespuestaPublica>) : null))
      .then((json) => {
        if (!cancelado && json) setDatos(json);
      })
      .catch((err) => console.error("Error cargando evaluaciones públicas:", err));
    return () => {
      cancelado = true;
    };
  }, []);

  const testimonios = datos?.testimonios ?? [];

  // Autoplay: cambia cada 4s, se pausa con el mouse encima.
  useEffect(() => {
    if (pausado || testimonios.length <= 1) return;
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndice((prev) => (prev + 1) % testimonios.length);
        setVisible(true);
      }, DURACION_FADE_MS);
    }, INTERVALO_MS);
    return () => clearInterval(id);
  }, [pausado, testimonios.length]);

  function irA(nuevoIndice: number) {
    setVisible(false);
    setTimeout(() => {
      setIndice(nuevoIndice);
      setVisible(true);
    }, DURACION_FADE_MS);
  }

  if (!datos || datos.total === 0) return null;

  const actual = testimonios[indice];

  return (
    <section className="w-full bg-gradient-to-b from-white to-[#f7fdfb] px-4 py-3">
      <div className="mx-auto max-w-[600px] text-center">
        <h2 className="mb-1 text-xs font-semibold text-[#1a4d4d]">🌟 Lo que dicen de O</h2>

        {actual && (
          <div
            className="flex flex-col items-center gap-1"
            onMouseEnter={() => setPausado(true)}
            onMouseLeave={() => setPausado(false)}
          >
            <div
              className="flex w-full flex-col items-center justify-center gap-0.5 transition-opacity duration-200 ease-in-out"
              style={{ opacity: visible ? 1 : 0 }}
            >
              <Estrellas cantidad={actual.rating} />
              <p className="line-clamp-1 text-[11px] leading-snug text-[#333]">&quot;{actual.comment}&quot;</p>
            </div>

            {testimonios.length > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => irA((indice - 1 + testimonios.length) % testimonios.length)}
                  aria-label="Evaluación anterior"
                  className="flex h-4 w-4 items-center justify-center rounded-full border border-[#e3f3ee] text-[10px] leading-none text-[#1a4d4d] transition-colors hover:bg-[#f0f9f7]"
                >
                  ‹
                </button>
                <div className="flex gap-1">
                  {testimonios.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1 w-1 rounded-full ${i === indice ? "bg-[#1D9E75]" : "bg-[#e3f3ee]"}`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => irA((indice + 1) % testimonios.length)}
                  aria-label="Siguiente evaluación"
                  className="flex h-4 w-4 items-center justify-center rounded-full border border-[#e3f3ee] text-[10px] leading-none text-[#1a4d4d] transition-colors hover:bg-[#f0f9f7]"
                >
                  ›
                </button>
              </div>
            )}
          </div>
        )}

        <div className="mt-1.5 flex flex-col items-center gap-0.5 border-t border-[#e3f3ee] pt-1.5">
          <p className="text-[10px] text-[#5a7a75]">
            {datos.total} persona{datos.total === 1 ? "" : "s"} evalu{datos.total === 1 ? "ó" : "aron"} a O · ⭐{" "}
            {datos.promedio.toFixed(1)}
          </p>
          <BarraPromedio promedio={datos.promedio} />
        </div>
      </div>
    </section>
  );
}
