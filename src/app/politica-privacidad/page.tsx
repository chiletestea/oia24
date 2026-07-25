import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de privacidad — openia",
  description: "Qué datos guardamos, quién los ve, y cómo eliminarlos permanentemente.",
};

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-base font-semibold text-[#1a4d4d]">{titulo}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-[#4a6f6a]">{children}</div>
    </section>
  );
}

export default function PoliticaPrivacidadPage() {
  return (
    <div className="min-h-screen px-5 py-10 text-[#1a4d4d]">
      <div className="mx-auto max-w-xl">
        <Link href="/" className="text-sm text-[#1D9E75] hover:underline">
          ← Volver a openia
        </Link>

        <h1 className="mb-1 mt-4 text-2xl font-semibold">Política de privacidad</h1>
        <p className="mb-8 text-sm text-[#5a7d78]">
          Última actualización: julio 2026 · Cumplimiento Ley 21.719 (Chile)
        </p>

        <Seccion titulo="Qué datos guardamos">
          <p>Solo lo mínimo necesario para que tu programa funcione:</p>
          <ul className="list-inside list-disc space-y-1">
            <li>Tu email y nombre (para identificarte y enviarte tus resúmenes).</li>
            <li>Tu progreso: qué módulo vas, cuáles completaste.</li>
            <li>
              El contenido de tus conversaciones con O — <strong>encriptado</strong> antes de
              guardarse, con una clave que solo el servidor conoce.
            </li>
            <li>Resultados de las evaluaciones que completes (GAD-7, BAI, OLBI, SUDS).</li>
          </ul>
        </Seccion>

        <Seccion titulo="Quién ve qué">
          <p>
            <strong>Nadie lee tus conversaciones completas</strong>, ni siquiera tu supervisor
            clínico. Luis Tapia, psicólogo clínico supervisor, solo tiene acceso a un{" "}
            <strong>mini resumen</strong> generado automáticamente al cerrar cada sesión — nunca
            a los mensajes crudos.
          </p>
          <p>Tus datos nunca se venden ni se comparten con terceros para publicidad.</p>
        </Seccion>

        <Seccion titulo="Encriptación">
          <p>
            El contenido de tus chats se guarda encriptado (AES-256) en nuestra base de datos.
            Aunque alguien accediera directamente a la base de datos, no podría leer tus
            conversaciones sin la clave del servidor.
          </p>
        </Seccion>

        <Seccion titulo="Derecho al olvido">
          <p>
            Puedes eliminar permanentemente todos tus datos (conversaciones, evaluaciones,
            progreso y tu cuenta) en cualquier momento. Cada email que te enviamos incluye un
            link de &ldquo;Eliminar permanentemente mis datos&rdquo; en el pie — un solo click borra todo,
            sin necesidad de confirmar nada más.
          </p>
          <p>
            Si no tienes un email a mano, puedes solicitarlo escribiendo a{" "}
            <a href="mailto:openterapiachile@gmail.com" className="text-[#1D9E75] underline">
              openterapiachile@gmail.com
            </a>
            .
          </p>
        </Seccion>

        <Seccion titulo="Vigencia de tu acceso">
          <p>
            El link de acceso a tu programa vence 6 meses después de tu compra. Puedes seguir
            solicitando la eliminación de tus datos incluso después de que venza.
          </p>
        </Seccion>

        <Seccion titulo="Contacto">
          <p>
            ¿Dudas sobre tus datos o esta política? Escríbenos a{" "}
            <a href="mailto:openterapiachile@gmail.com" className="text-[#1D9E75] underline">
              openterapiachile@gmail.com
            </a>
            .
          </p>
        </Seccion>
      </div>
    </div>
  );
}
