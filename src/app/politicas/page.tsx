import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Términos de Uso y Consentimiento — Openia",
  description:
    "Términos de uso, consentimiento informado y política de privacidad de Openia.",
};

const SYSTEM_FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 mt-9 text-lg font-semibold leading-snug text-[#1a4d4d] sm:text-xl">
      {children}
    </h2>
  );
}

function P({
  children,
  strong = false,
}: {
  children: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <p
      className={`mb-4 text-[15px] leading-relaxed text-[#333] ${
        strong ? "font-semibold" : ""
      }`}
    >
      {children}
    </p>
  );
}

function Ul({ children }: { children: React.ReactNode }) {
  return (
    <ul className="mb-4 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-[#333]">
      {children}
    </ul>
  );
}

function CheckList({ children }: { children: React.ReactNode }) {
  return (
    <ul className="mb-4 space-y-2 text-[15px] leading-relaxed text-[#333]">
      {children}
    </ul>
  );
}

function CheckItem({
  mark = "✓",
  children,
}: {
  mark?: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-2">
      <span aria-hidden className="shrink-0 text-[#1D9E75]">
        {mark}
      </span>
      <span>{children}</span>
    </li>
  );
}

function EmailLink() {
  return (
    <a
      href="mailto:openterapiachile@gmail.com"
      className="text-[#1D9E75] underline hover:opacity-80"
    >
      openterapiachile@gmail.com
    </a>
  );
}

export default function PoliticasPage() {
  return (
    <div
      className="min-h-screen bg-[#fff]"
      style={{ fontFamily: SYSTEM_FONT_STACK }}
    >
      <article className="mx-auto max-w-[700px] px-6 py-8 sm:px-8 sm:py-12">
        <Link
          href="/"
          className="mb-6 inline-block text-sm text-[#1D9E75] hover:underline"
        >
          ← Volver a openia
        </Link>

        <h1 className="mb-6 text-2xl font-bold leading-tight text-[#1a4d4d] sm:text-3xl">
          Términos de Uso y Consentimiento - Openia
        </h1>

        <H2>1. ¿Qué es Openia?</H2>
        <P>
          Openia es una plataforma de apoyo emocional accesible disponible
          24/7. Usamos inteligencia artificial para ofrecer técnicas de
          regulación emocional, ejercicios guiados y conversación empática.
        </P>
        <P strong>Openia NO es un servicio médico ni psicológico profesional.</P>

        <H2>2. Lo que Openia NO hace</H2>
        <Ul>
          <li>
            <strong>No diagnostica</strong> problemas de salud mental o física
          </li>
          <li>
            <strong>No reemplaza</strong> a un psicólogo, psiquiatra o médico
          </li>
          <li>
            <strong>No prescribe</strong> medicinas ni tratamientos clínicos
          </li>
          <li>
            <strong>No es urgencia</strong>: Si tienes crisis emocional
            severa, comunícate con emergencias o una línea de crisis
          </li>
        </Ul>
        <P>Si necesitas ayuda profesional, te recomendamos:</P>
        <Ul>
          <li>Contactar a un psicólogo o psiquiatra</li>
          <li>Llamar a una línea de crisis de tu país</li>
          <li>Acudir a un centro de salud</li>
        </Ul>

        <H2>3. Lo que Openia SÍ hace</H2>
        <Ul>
          <li>Ofrece técnicas de respiración y regulación emocional</li>
          <li>Proporciona apoyo conversacional y empatía</li>
          <li>Te ayuda a procesar emociones en el momento</li>
          <li>Funciona como herramienta de bienestar complementaria</li>
        </Ul>

        <H2>4. Tu Privacidad - Datos que NO guardamos</H2>
        <P>
          Openia <strong>NO guarda datos personales</strong> de ti:
        </P>
        <Ul>
          <li>Tu nombre real no se almacena</li>
          <li>Tu identidad es el nombre con el que quieras ser llamado por O</li>
          <li>No recopilamos ubicación, teléfono, documentos ni información sensible</li>
          <li>
            Las conversaciones con O se guardan solo para mejorar el
            servicio, sin vincularlas a tu identidad
          </li>
        </Ul>

        <H2>5. El único dato que guardamos: Tu mail (opcional)</H2>
        <P>
          Si eliges registrarte con un mail, lo guardamos{" "}
          <strong>SOLO para</strong>:
        </P>
        <Ul>
          <li>Permitirte revisar tus avances en programas de entrenamiento</li>
          <li>Recuperar tu sesión si lo deseas</li>
        </Ul>
        <P>
          <strong>Nota sobre recuperación de clave</strong>: La función de
          recuperación de clave solo estará disponible si en futuro Openia
          implementa un sistema de login. Actualmente, Openia es anónima y no
          requiere contraseña.
        </P>
        <P>
          <strong>Tu derecho a la eliminación</strong>: Puedes eliminar tu
          mail y todos los datos asociados en cualquier momento desde el
          mismo correo. La eliminación es{" "}
          <strong>permanente e irrevocable</strong>.
        </P>

        <H2>6. Tu Identidad en Openia</H2>
        <Ul>
          <li>Eres completamente anónimo</li>
          <li>Eliges el nombre con el que O te llama</li>
          <li>No te pedimos información personal</li>
          <li>Tu privacidad es garantizada</li>
        </Ul>

        <H2>7. Pagos y Procesamiento de Datos Financieros</H2>
        <P strong>Openia NO procesa ni guarda datos de pago:</P>
        <Ul>
          <li>
            Openia no maneja ni almacena números de tarjeta, información
            bancaria ni datos financieros sensibles
          </li>
          <li>
            <strong>La pasarela de pagos es responsable</strong> de procesar,
            administrar y resguardar toda información sensible relacionada
            con pagos
          </li>
          <li>
            La pasarela de pagos es una empresa tercera independiente con sus
            propias políticas de privacidad y seguridad
          </li>
        </Ul>
        <P>Cuando realizas un pago:</P>
        <Ul>
          <li>Tu información financiera va directamente a la pasarela de pagos</li>
          <li>Openia solo recibe confirmación de pago</li>
          <li>Openia NO puede ver ni acceder a tus datos de tarjeta o bancarios</li>
        </Ul>
        <P strong>Responsabilidad de la pasarela de pagos:</P>
        <Ul>
          <li>Cumplimiento de normativas PCI-DSS</li>
          <li>Encriptación de datos sensibles</li>
          <li>Protección de información financiera</li>
          <li>Políticas de privacidad propias</li>
        </Ul>
        <P>
          Consulta la política de privacidad de la pasarela de pagos para
          detalles sobre cómo administran tus datos.
        </P>

        <H2>8. Responsabilidades</H2>
        <P strong>Openia no se responsabiliza por:</P>
        <Ul>
          <li>Daños que resulten del uso de esta plataforma</li>
          <li>Decisiones médicas o de salud basadas en nuestras sugerencias</li>
          <li>Crisis emocionales (siempre busca ayuda profesional)</li>
          <li>Mal uso de la plataforma</li>
          <li>Pérdida de datos de la pasarela de pagos o problemas en transacciones</li>
        </Ul>
        <P strong>Tú te responsabilizas por:</P>
        <Ul>
          <li>
            Usar Openia como herramienta complementaria, no como sustituto de
            profesionales
          </li>
          <li>Buscar ayuda profesional si lo necesitas</li>
          <li>Proteger tus credenciales de acceso (cuando aplique)</li>
          <li>Mantener tu mail actualizado</li>
        </Ul>

        <H2>9. Consentimiento Informado</H2>
        <P strong>
          AL ACEPTAR ESTOS TÉRMINOS, CERTIFICAS Y CONSIENTES EXPLÍCITAMENTE
          QUE:
        </P>
        <CheckList>
          <CheckItem>
            <strong>Mayoría de edad o autorización</strong>: Eres mayor de 18
            años O tienes autorización expresa de un adulto responsable para
            usar Openia. Si eres menor de edad, un adulto debe haber leído y
            aceptado estos términos en tu nombre.
          </CheckItem>
          <CheckItem>
            Entiendes que Openia es una herramienta de apoyo emocional, NO un
            servicio clínico
          </CheckItem>
          <CheckItem>
            Openia no diagnostica, no prescribe, no trata condiciones médicas
          </CheckItem>
          <CheckItem>
            Asumes responsabilidad por tus decisiones de salud y buscarás
            profesionales si lo necesitas
          </CheckItem>
          <CheckItem>
            Tus datos están protegidos según esta política de privacidad
          </CheckItem>
          <CheckItem>
            Los pagos (si aplica) son administrados por terceros, no por
            Openia
          </CheckItem>
          <CheckItem>
            Aceptas recibir feedback sobre tu experiencia (opcional)
          </CheckItem>
          <CheckItem>
            Aceptas que tu sesión anónima se use para mejorar O (sin
            identificarte)
          </CheckItem>
        </CheckList>

        <H2>10. Conducta responsable</H2>
        <P>No uses Openia para:</P>
        <Ul>
          <li>Abusar, acosar o amenazar</li>
          <li>Compartir contenido ilegal o peligroso</li>
          <li>Propagar desinformación</li>
          <li>Vender o compartir tu acceso</li>
        </Ul>

        <H2>11. Cambios en estos términos</H2>
        <P>
          Nos reservamos el derecho de actualizar estos términos. Te
          notificaremos de cambios importantes por email.
        </P>

        <H2>12. Ley aplicable</H2>
        <P>
          Estos términos se rigen por la legislación vigente en Chile.
          Cualquier disputa será resuelta en los tribunales competentes.
        </P>

        <H2>13. Contacto</H2>
        <P>Si tienes preguntas sobre estos términos, tu privacidad o pagos:</P>
        <Ul>
          <li>
            Email: <EmailLink />
          </li>
          <li>Supervisor: Luis Tapia Escobar, Psicólogo Clínico</li>
        </Ul>

        <hr className="my-8 border-t border-[#e0e0e0]" />

        <P strong>Último actualizado: 31 de julio de 2026</P>
      </article>
    </div>
  );
}
