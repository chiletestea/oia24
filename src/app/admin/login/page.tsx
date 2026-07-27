"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (!res.ok) {
      setLoading(false);
      setError("Contraseña incorrecta");
      return;
    }

    router.push("/admin/dashboard");
    router.refresh();
  }

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui",
        background: "#fafafa",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          padding: "2rem",
          background: "#fff",
          border: "1px solid #e5e5e5",
          borderRadius: "8px",
          width: "100%",
          maxWidth: "320px",
        }}
      >
        <h1 style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>Admin — Openia.cl</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          autoFocus
          style={{
            width: "100%",
            padding: "0.5rem",
            marginBottom: "0.75rem",
            boxSizing: "border-box",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
        />
        {error && (
          <p style={{ color: "#b91c1c", fontSize: "0.85rem", marginBottom: "0.75rem" }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading || !password}
          style={{
            width: "100%",
            padding: "0.6rem",
            cursor: loading ? "default" : "pointer",
            borderRadius: "4px",
            border: "none",
            background: "#1D9E75",
            color: "#fff",
          }}
        >
          {loading ? "Verificando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
