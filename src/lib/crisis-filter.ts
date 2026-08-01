// Filtro de streaming para el sentinel [CRISIS]: antes, la detección server-side
// (api/o-chat/public/route.ts) solo reconocía el sentinel si era el PRIMER
// carácter absoluto de la respuesta del modelo (held.startsWith(CRISIS_SENTINEL)).
// Si el modelo alguna vez antepone aunque sea una palabra de contención antes de
// [CRISIS], esa lógica nunca detecta la crisis Y además filtra el tag crudo como
// texto plano visible al usuario. Este filtro detecta el sentinel en cualquier
// posición del stream, reteniendo solo el sufijo no confirmado (posible prefijo
// parcial del sentinel partido entre dos deltas) en vez de todo el buffer.

export const CRISIS_SENTINEL = "[CRISIS]";

// Sufijo propio más largo de `text` que también es prefijo de `pattern`: es la
// porción que debemos seguir reteniendo porque un próximo delta podría
// completarla hasta formar el sentinel completo.
function longestPrefixSuffixLen(text: string, pattern: string): number {
  const maxLen = Math.min(text.length, pattern.length - 1);
  for (let len = maxLen; len > 0; len--) {
    if (text.endsWith(pattern.slice(0, len))) return len;
  }
  return 0;
}

export interface CrisisStreamFilter {
  /** Procesa un delta de texto entrante. Devuelve el texto seguro para reenviar
   *  (puede ser "") y si este delta confirmó el modo crisis. */
  push(delta: string): { safeText: string; crisisConfirmed: boolean };
  /** Al terminar el stream: libera cualquier texto retenido que nunca llegó a
   *  completar el sentinel (falso positivo de buffering). */
  flush(): string;
  readonly crisisDetected: boolean;
}

export function createCrisisStreamFilter(): CrisisStreamFilter {
  let heldTail = "";
  let crisisDetected = false;

  return {
    get crisisDetected() {
      return crisisDetected;
    },
    push(delta: string) {
      if (crisisDetected) return { safeText: "", crisisConfirmed: false };

      const combined = heldTail + delta;
      const idx = combined.indexOf(CRISIS_SENTINEL);
      if (idx !== -1) {
        crisisDetected = true;
        heldTail = "";
        return { safeText: combined.slice(0, idx), crisisConfirmed: true };
      }

      const keepLen = longestPrefixSuffixLen(combined, CRISIS_SENTINEL);
      const safeText = combined.slice(0, combined.length - keepLen);
      heldTail = combined.slice(combined.length - keepLen);
      return { safeText, crisisConfirmed: false };
    },
    flush() {
      const remaining = heldTail;
      heldTail = "";
      return remaining;
    },
  };
}
