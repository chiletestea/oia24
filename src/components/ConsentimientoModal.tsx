"use client";

import { useState } from "react";
import type { Consentimiento } from "@/types/privacy";

const VERSION_TERMINOS = "1.0";

interface ConsentimientoModalProps {
  open: boolean;
  onClose: () => void;
  /** El caller es responsable de persistir el consentimiento en la DB (usuarios.consentimiento) al procesar la compra. */
  onConfirm: (consentimiento: Consentimiento) => void | Promise<void>;
}

export default function ConsentimientoModal({
  open,
  onClose,
  onConfirm,
}: ConsentimientoModalProps) {
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [confirmaEdad, setConfirmaEdad] = useState(false);
  const [enviando, setEnviando] = useState(false);

  if (!open) return null;

  const puedeContinuar = aceptaTerminos && confirmaEdad && !enviando;

  async function handleConfirmar() {
    if (!puedeContinuar) return;
    setEnviando(true);

    const consentimiento: Consentimiento = {
      acepta_terminos: true,
      fecha_aceptacion: new Date().toISOString(),
      version: VERSION_TERMINOS,
    };

    await onConfirm(consentimiento);
    setEnviando(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b2e26]/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm animate-modal-in rounded-2xl bg-white p-5 shadow-2xl">
        <h2 className="text-base font-semibold text-[#1a4d4d]">Antes de empezar</h2>
        <p className="mt-1.5 text-sm text-[#5a7d78]">
          Necesitamos tu confirmación antes de continuar con la compra.
        </p>

        <div className="mt-4 flex flex-col gap-3">
          <label className="flex items-start gap-2.5 text-sm text-[#1a4d4d]">
            <input
              type="checkbox"
              checked={aceptaTerminos}
              onChange={(e) => setAceptaTerminos(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#1D9E75]"
            />
            <span>
              Leí y acepto los{" "}
              <a
                href="/politica-privacidad"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[#1D9E75] underline"
              >
                términos y condiciones y la política de privacidad
              </a>
              .
            </span>
          </label>

          <label className="flex items-start gap-2.5 text-sm text-[#1a4d4d]">
            <input
              type="checkbox"
              checked={confirmaEdad}
              onChange={(e) => setConfirmaEdad(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#1D9E75]"
            />
            <span>Confirmo que soy mayor de 18 años.</span>
          </label>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-[#e3f3ee] py-2.5 text-sm font-medium text-[#5a7d78] transition-colors hover:bg-[#f7fdfb]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmar}
            disabled={!puedeContinuar}
            className="flex-1 rounded-full bg-[#1D9E75] py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {enviando ? "Procesando..." : "Continuar"}
          </button>
        </div>
      </div>
    </div>
  );
}
