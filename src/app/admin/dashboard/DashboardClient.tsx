"use client";

import { useEffect, useState } from "react";
import type { Metricas } from "@/lib/admin-metrics";
import EvaluacionesSection from "./EvaluacionesSection";

type Periodo = "hoy" | "semana" | "mes" | "todo";

const PERIODOS: { value: Periodo; label: string }[] = [
  { value: "hoy", label: "Hoy" },
  { value: "semana", label: "Última semana" },
  { value: "mes", label: "Último mes" },
  { value: "todo", label: "Todo" },
];

export default function DashboardClient() {
  const [periodo, setPeriodo] = useState<Periodo>("hoy");
  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setError(false);

    fetch(`/api/admin/metrics?periodo=${periodo}`)
      .then((res) => {
        if (!res.ok) throw new Error("Error de red");
        return res.json() as Promise<Metricas>;
      })
      .then((datos) => {
        if (!cancelado) setMetricas(datos);
      })
      .catch((err) => {
        console.error("Error cargando métricas:", err);
        if (!cancelado) setError(true);
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [periodo]);

  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui", maxWidth: "1200px", margin: "0 auto" }}>
      <h1>Dashboard Admin — Openia.cl</h1>

      <div style={{ marginBottom: "2rem", display: "flex", gap: "12px" }}>
        {PERIODOS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setPeriodo(value)}
            style={{
              padding: "8px 16px",
              background: periodo === value ? "#1D9E75" : "#f0f0f0",
              color: periodo === value ? "white" : "#333",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: periodo === value ? 500 : 400,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {cargando ? (
        <p>Cargando métricas...</p>
      ) : error || !metricas ? (
        <p>Error cargando métricas</p>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
              marginBottom: "2rem",
            }}
          >
            <div style={{ background: "#f5f5f5", padding: "1.5rem", borderRadius: "8px" }}>
              <p style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#666" }}>Usuarios únicos</p>
              <p style={{ margin: 0, fontSize: "28px", fontWeight: "bold", color: "#1D9E75" }}>
                {metricas.usuariosUnicos}
              </p>
            </div>
            <div style={{ background: "#f5f5f5", padding: "1.5rem", borderRadius: "8px" }}>
              <p style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#666" }}>Crisis detectadas</p>
              <p style={{ margin: 0, fontSize: "28px", fontWeight: "bold", color: "#d32f2f" }}>
                {metricas.totalCrisis}
              </p>
            </div>
            <div style={{ background: "#f5f5f5", padding: "1.5rem", borderRadius: "8px" }}>
              <p style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#666" }}>Duración promedio (min)</p>
              <p style={{ margin: 0, fontSize: "28px", fontWeight: "bold", color: "#1976d2" }}>
                {metricas.promedioDuracion}
              </p>
            </div>
            <div style={{ background: "#f5f5f5", padding: "1.5rem", borderRadius: "8px" }}>
              <p style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#666" }}>Total mensajes</p>
              <p style={{ margin: 0, fontSize: "28px", fontWeight: "bold", color: "#388e3c" }}>
                {metricas.totalMensajes}
              </p>
            </div>
          </div>

          <h2 style={{ marginTop: "2rem", fontSize: "18px" }}>Temas principales</h2>
          <div style={{ background: "#f5f5f5", padding: "1rem", borderRadius: "8px" }}>
            {metricas.temasTop.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: "1.5rem" }}>
                {metricas.temasTop.map((t) => (
                  <li key={t.tema} style={{ marginBottom: "8px", fontSize: "14px" }}>
                    {t.tema}: <strong>{t.count}</strong> menciones
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ margin: 0, color: "#666" }}>Sin datos de temas aún</p>
            )}
          </div>
        </>
      )}

      <EvaluacionesSection />
    </div>
  );
}
