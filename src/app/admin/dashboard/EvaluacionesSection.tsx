"use client";

import { useCallback, useEffect, useState } from "react";

type FiltroRating = "todas" | "1" | "2" | "3" | "4" | "5";
type FiltroVisibilidad = "todas" | "publica" | "privada";
type FiltroPeriodo = "mes" | "3meses" | "todo";

interface EvaluacionRow {
  id: string;
  session_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  is_public: boolean;
  admin_notes: string | null;
}

const RATINGS: { value: FiltroRating; label: string }[] = [
  { value: "todas", label: "Todos" },
  { value: "5", label: "★★★★★" },
  { value: "4", label: "★★★★" },
  { value: "3", label: "★★★" },
  { value: "2", label: "★★" },
  { value: "1", label: "★" },
];

const VISIBILIDADES: { value: FiltroVisibilidad; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "publica", label: "Públicas" },
  { value: "privada", label: "Privadas" },
];

const PERIODOS: { value: FiltroPeriodo; label: string }[] = [
  { value: "todo", label: "Todo" },
  { value: "mes", label: "Último mes" },
  { value: "3meses", label: "Últimos 3 meses" },
];

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });
}

function truncar(texto: string | null, largo: number): string {
  if (!texto) return "—";
  return texto.length > largo ? `${texto.slice(0, largo)}…` : texto;
}

// Sección de gestión de evaluaciones dentro de /admin/dashboard: ver todas
// las evaluaciones de feedback_sessions y marcar cuáles se muestran en el
// Home (feedback_visibility). Antes era una página aparte (/admin/evaluaciones)
// — se integró acá para que todo el panel admin viva en una sola pantalla.
export default function EvaluacionesSection() {
  const [rating, setRating] = useState<FiltroRating>("todas");
  const [visibilidad, setVisibilidad] = useState<FiltroVisibilidad>("todas");
  const [periodo, setPeriodo] = useState<FiltroPeriodo>("todo");
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionRow[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [actualizandoId, setActualizandoId] = useState<string | null>(null);
  const [errorToggle, setErrorToggle] = useState<string | null>(null);

  const cargarEvaluaciones = useCallback(async () => {
    setCargando(true);
    setError(false);
    try {
      const params = new URLSearchParams({ visibilidad, periodo });
      if (rating !== "todas") params.set("rating", rating);
      const res = await fetch(`/api/admin/evaluaciones?${params.toString()}`);
      if (!res.ok) throw new Error("Error de red");
      const datos = (await res.json()) as { evaluaciones: EvaluacionRow[] };
      setEvaluaciones(datos.evaluaciones);
    } catch (err) {
      console.error("Error cargando evaluaciones:", err);
      setError(true);
    } finally {
      setCargando(false);
    }
  }, [rating, visibilidad, periodo]);

  useEffect(() => {
    void cargarEvaluaciones();
  }, [cargarEvaluaciones]);

  async function handleToggle(evaluacion: EvaluacionRow) {
    setActualizandoId(evaluacion.id);
    setErrorToggle(null);
    try {
      const res = await fetch("/api/admin/evaluaciones/visibilidad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback_id: evaluacion.id, is_public: !evaluacion.is_public }),
      });
      if (!res.ok) throw new Error("Error de red");
      await cargarEvaluaciones();
    } catch (err) {
      console.error("Error actualizando visibilidad:", err);
      setErrorToggle("No se pudo actualizar la visibilidad. Intenta de nuevo.");
    } finally {
      setActualizandoId(null);
    }
  }

  return (
    <div style={{ marginTop: "2.5rem" }}>
      <h2 style={{ fontSize: "18px", marginBottom: "0.75rem" }}>Evaluaciones</h2>

      <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", marginBottom: "1.25rem" }}>
        <FiltroGrupo label="Rating" opciones={RATINGS} valor={rating} onChange={setRating} />
        <FiltroGrupo label="Visibilidad" opciones={VISIBILIDADES} valor={visibilidad} onChange={setVisibilidad} />
        <FiltroGrupo label="Período" opciones={PERIODOS} valor={periodo} onChange={setPeriodo} />
      </div>

      {errorToggle && (
        <p style={{ color: "#b91c1c", fontSize: "13px", marginBottom: "1rem" }}>{errorToggle}</p>
      )}

      {cargando ? (
        <p>Cargando evaluaciones...</p>
      ) : error ? (
        <p>Error cargando evaluaciones</p>
      ) : evaluaciones.length === 0 ? (
        <p>Sin evaluaciones para estos filtros</p>
      ) : (
        <>
          <p style={{ color: "#666", marginBottom: "1rem" }}>
            {evaluaciones.length} evaluación{evaluaciones.length === 1 ? "" : "es"}
          </p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "2px solid #e0e0e0" }}>
                  <th style={{ padding: "10px 8px" }}>Fecha</th>
                  <th style={{ padding: "10px 8px" }}>Rating</th>
                  <th style={{ padding: "10px 8px" }}>Comentario</th>
                  <th style={{ padding: "10px 8px" }}>Visible en Home</th>
                </tr>
              </thead>
              <tbody>
                {evaluaciones.map((e) => (
                  <tr key={e.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td style={{ padding: "10px 8px", whiteSpace: "nowrap" }}>{formatearFecha(e.created_at)}</td>
                    <td style={{ padding: "10px 8px", color: "#f5b93d" }}>{"★".repeat(e.rating)}</td>
                    <td style={{ padding: "10px 8px", color: e.comment ? "#333" : "#999" }}>
                      {truncar(e.comment, 100)}
                    </td>
                    <td style={{ padding: "10px 8px" }}>
                      <button
                        type="button"
                        onClick={() => handleToggle(e)}
                        disabled={actualizandoId === e.id}
                        style={{
                          padding: "6px 14px",
                          borderRadius: "999px",
                          border: "none",
                          cursor: actualizandoId === e.id ? "default" : "pointer",
                          background: e.is_public ? "#1D9E75" : "#e0e0e0",
                          color: e.is_public ? "#fff" : "#666",
                          fontSize: "13px",
                          fontWeight: 500,
                          opacity: actualizandoId === e.id ? 0.6 : 1,
                        }}
                      >
                        {actualizandoId === e.id ? "..." : e.is_public ? "Sí" : "No"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function FiltroGrupo<T extends string>({
  label,
  opciones,
  valor,
  onChange,
}: {
  label: string;
  opciones: { value: T; label: string }[];
  valor: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p style={{ margin: "0 0 6px 0", fontSize: "12px", color: "#666", textTransform: "uppercase" }}>{label}</p>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {opciones.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            style={{
              padding: "6px 12px",
              background: valor === o.value ? "#1D9E75" : "#f0f0f0",
              color: valor === o.value ? "white" : "#333",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: valor === o.value ? 500 : 400,
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
