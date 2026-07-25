// Templates de email. Cada uno devuelve { subject, html } listo para pasarle
// a Resend — el footer con el link de "olvidarme" se agrega centralizadamente
// en app/api/emails/enviar/route.ts (ver lib/emails-helper.ts), no aquí.

const BRAND_HEADER = `
  <div style="font-family:sans-serif;font-size:20px;font-weight:600;margin-bottom:24px;">
    <span style="color:#1a4d4d;">open</span><span style="color:#1D9E75;">ia</span>
  </div>
`;

function wrap(bodyHtml: string): string {
  return `
    <div style="max-width:480px;margin:0 auto;padding:32px 24px;background:#f7fdfb;">
      ${BRAND_HEADER}
      <div style="font-family:sans-serif;font-size:14px;line-height:1.6;color:#1a4d4d;">
        ${bodyHtml}
      </div>
    </div>
  `;
}

interface EmailContent {
  subject: string;
  html: string;
}

// === bienvenida ============================================================

export function bienvenida(params: {
  nombre: string | null;
  programaNombre: string;
  continuarUrl: string;
}): EmailContent {
  const saludo = params.nombre ? `Hola ${params.nombre}` : "Hola";

  return {
    subject: `Bienvenido/a a ${params.programaNombre}`,
    html: wrap(`
      <p>${saludo}, ¡qué bueno tenerte por acá! 🌿</p>
      <p>Tu programa <strong>${params.programaNombre}</strong> ya está listo. Puedes avanzar a tu ritmo, cuando quieras — O te va a acompañar en cada módulo.</p>
      <p style="margin-top:24px;">
        <a href="${params.continuarUrl}" style="display:inline-block;background:#1D9E75;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none;font-weight:600;">Empezar mi programa</a>
      </p>
    `),
  };
}

// === miniResumenSesion ======================================================

export function miniResumenSesion(params: {
  nombre: string | null;
  moduloNumero: number;
  totalModulos: number;
  modulosCompletados: number;
  resumen: string;
  continuarUrl: string;
}): EmailContent {
  const saludo = params.nombre ? `Hola ${params.nombre}` : "Hola";

  return {
    subject: `Hoy avanzaste en el Módulo ${params.moduloNumero}`,
    html: wrap(`
      <p>${saludo}, hoy trabajaste el <strong>Módulo ${params.moduloNumero}</strong>. 🎉</p>
      <p style="color:#5a7d78;">${params.resumen}</p>
      <p style="margin-top:12px;font-size:13px;color:#5a7d78;">
        Progreso: ${params.modulosCompletados} de ${params.totalModulos} módulos
      </p>
      <p style="margin-top:24px;">
        <a href="${params.continuarUrl}" style="display:inline-block;background:#1D9E75;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none;font-weight:600;">Continuar mi programa</a>
      </p>
    `),
  };
}

// === notificacionLuisDiaria =================================================

export interface ResumenLuisSesion {
  usuarioNombre: string | null;
  programaNombre: string;
  moduloNumero: number;
  resumen: string;
  esCrisis: boolean;
}

export function notificacionLuisDiaria(params: {
  fecha: string;
  sesiones: ResumenLuisSesion[];
}): EmailContent {
  const alertas = params.sesiones.filter((s) => s.esCrisis);
  const normales = params.sesiones.filter((s) => !s.esCrisis);

  const filaSesion = (s: ResumenLuisSesion) => `
    <div style="padding:12px 0;border-bottom:1px solid #e3f3ee;">
      <strong>${s.usuarioNombre ?? "Usuario"}</strong> · ${s.programaNombre} · Módulo ${s.moduloNumero}
      <p style="margin:4px 0 0;color:#5a7d78;">${s.resumen}</p>
    </div>
  `;

  return {
    subject: `Resumen diario openia · ${params.fecha}${alertas.length ? " · ⚠ ALERTAS" : ""}`,
    html: wrap(`
      <p>Resumen de sesiones del ${params.fecha}.</p>
      ${
        alertas.length
          ? `<div style="background:#fff5f2;border:1px solid #f3c8be;border-radius:8px;padding:12px;margin:16px 0;">
              <strong style="color:#b3453a;">⚠ ${alertas.length} alerta(s) de crisis hoy</strong>
              ${alertas.map(filaSesion).join("")}
            </div>`
          : ""
      }
      <p style="margin-top:16px;font-weight:600;">Sesiones completadas (${normales.length})</p>
      ${normales.map(filaSesion).join("") || "<p style='color:#5a7d78;'>Sin sesiones nuevas hoy.</p>"}
    `),
  };
}

// === resumenContextoReinicio =================================================
// No es un email — es el contexto que O usa para saludar al usuario cuando
// vuelve a entrar a un módulo. Se inyecta en el system prompt de /api/o-chat.

export function resumenContextoReinicio(params: {
  nombre: string | null;
  moduloNumero: number;
  resumenAnterior: string | null;
}): string {
  const saludo = params.nombre ? params.nombre : "de vuelta";
  if (!params.resumenAnterior) {
    return `El usuario (${saludo}) está retomando el Módulo ${params.moduloNumero}. No hay resumen de una sesión anterior — es su primera vez en este módulo o no alcanzó a avanzar antes.`;
  }

  return `El usuario (${saludo}) vuelve al Módulo ${params.moduloNumero}. La última vez, esto fue lo que conversaron: "${params.resumenAnterior}". Salúdalo retomando ese hilo brevemente y pregúntale si está listo para continuar.`;
}
