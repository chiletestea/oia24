import Link from "next/link";
import { validarTokenAcceso } from "@/lib/middleware-token";

interface BienvenidaPageProps {
  searchParams: { token?: string };
}

export default async function BienvenidaPage({ searchParams }: BienvenidaPageProps) {
  const token = searchParams.token;

  if (!token) {
    return <EstadoError mensaje="Falta el token de acceso en el link." />;
  }

  const { valido, motivo } = await validarTokenAcceso(token);

  if (!valido) {
    const mensajes: Record<string, string> = {
      no_encontrado: "Este link de acceso no es válido.",
      eliminado: "Esta cuenta fue eliminada.",
      inactivo: "Esta cuenta está inactiva.",
      vencido: "Este acceso venció.",
      programa_no_coincide: "Este link no corresponde a este programa.",
    };
    return <EstadoError mensaje={mensajes[motivo ?? ""] ?? "No pudimos validar tu acceso."} />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 py-10 text-center text-[#1a4d4d]">
      <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[#c7ebe0] bg-white/60 px-3 py-1 text-xs font-medium text-[#1D9E75]">
        Modo testing (sin pago)
      </div>

      <div
        className="mb-5 h-16 w-16 rounded-full"
        style={{ background: "radial-gradient(circle at 35% 30%, #2fc492, #0e8b6b)" }}
        aria-label="O"
        role="img"
      />

      <h1 className="text-xl font-semibold">¡Acceso listo para Testing!</h1>
      <p className="mt-2 max-w-xs text-sm text-[#4a6f6a]">
        Tu cuenta de prueba está lista. Cuando quieras, entra a tu programa.
      </p>

      <Link
        href={`/programa/${token}`}
        className="mt-6 rounded-full bg-[#1D9E75] px-7 py-3.5 text-base font-semibold text-white shadow-[0_8px_24px_-8px_rgba(29,158,117,0.6)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
      >
        Inicia tu programa
      </Link>
    </div>
  );
}

function EstadoError({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 py-10 text-center text-[#1a4d4d]">
      <p className="mb-2 text-2xl text-[#b3453a]">✕</p>
      <p className="max-w-xs text-sm text-[#4a6f6a]">{mensaje}</p>
      <Link href="/programa" className="mt-4 text-sm text-[#1D9E75] hover:underline">
        Volver
      </Link>
    </div>
  );
}
