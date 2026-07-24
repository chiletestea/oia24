import SalesBot from "@/components/SalesBot";

const PROGRAMS = [
  {
    badge: "ANSIEDAD",
    color: "#7F77DD",
    title: "Ansiedad Bajo Control",
    modules: "8 módulos · IA",
    price: "$4.990",
  },
  {
    badge: "TRABAJO",
    color: "#1D9E75",
    title: "Respira en el Trabajo",
    modules: "6 módulos · IA",
    price: "$4.990",
  },
  {
    badge: "REGULACIÓN",
    color: "#BA7517",
    title: "Regulación Express",
    modules: "4 módulos · IA",
    price: "$2.990",
  },
  {
    badge: "MENTE",
    color: "#D4537E",
    title: "Deja de Sobrepensar",
    modules: "5 módulos · IA",
    price: "$4.990",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#050810] text-white">
      {/* 1. HEADER */}
      <header className="flex items-center justify-between border-b border-[#111827] bg-[#080c15] px-5 py-3.5">
        <div className="text-[20px] font-semibold">
          <span className="text-white">open</span>
          <span className="text-[#7F77DD]">ia</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#1D9E75] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#1D9E75]" />
          </span>
          <span className="text-xs text-[#94a3b8]">IA activa · 24/7</span>
        </div>
      </header>

      {/* 2. HERO */}
      <section className="px-5 pb-5 pt-7">
        <div className="mb-4 inline-block rounded-full border border-[#1a2035] bg-[#0d1117] px-3 py-1 text-xs text-[#7F77DD]">
          · Programas digitales · IA supervisada ·
        </div>
        <h1 className="text-[28px] font-normal leading-snug text-white">
          Aprende con quien sabe de verdad.
        </h1>
        <p className="mt-2 text-sm text-[#4a5568]">
          Programas guiados por IA, a tu ritmo, 24/7.
        </p>
      </section>

      {/* 3. CHATBOT VENDEDOR */}
      <section className="px-5 pb-6">
        <SalesBot />
      </section>

      {/* 4. PROGRAMAS */}
      <section className="px-5 pb-6">
        <div className="grid grid-cols-2 gap-3">
          {PROGRAMS.map((program) => (
            <div
              key={program.title}
              className="rounded-[10px] border border-[#1a2035] bg-[#0d1117] p-3"
            >
              <span
                className="text-[11px] font-semibold"
                style={{ color: program.color }}
              >
                {program.badge}
              </span>
              <h3 className="mt-1.5 text-sm font-medium text-white">
                {program.title}
              </h3>
              <p className="mt-1 text-xs text-[#94a3b8]">{program.modules}</p>
              <p
                className="mt-2 text-sm font-semibold"
                style={{ color: program.color }}
              >
                {program.price}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. SUPERVISOR */}
      <section className="px-5 pb-6">
        <div className="flex items-center justify-between rounded-xl border border-[#1a2035] bg-[#0d1117] p-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#1a2035] bg-[#080c15]">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#94a3b8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-white">
                Luis Tapia
              </span>
              <span className="text-xs text-[#94a3b8]">
                Psicólogo Clínico · Supervisor IA
              </span>
            </div>
          </div>
          <span className="rounded-full border border-[#1D9E75] bg-[#0d2818] px-2.5 py-1 text-xs text-[#1D9E75]">
            Activo
          </span>
        </div>
      </section>

      {/* 6. FOOTER */}
      <footer className="px-5 pb-8 pt-2 text-center text-xs text-[#4a5568]">
        Privacidad total · Sin datos almacenados · Ley 21.719
      </footer>
    </div>
  );
}
