import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE_NAME, verificarTokenSesionAdmin } from "@/lib/admin-auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";

interface FeedbackRow {
  id: string;
  session_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

async function getFeedback(): Promise<FeedbackRow[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("feedback_sessions")
    .select("id, session_id, rating, comment, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error cargando feedback:", error);
    return [];
  }

  return data ?? [];
}

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleString("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default async function AdminFeedbackPage() {
  const token = cookies().get(ADMIN_COOKIE_NAME)?.value;

  if (!verificarTokenSesionAdmin(token)) {
    redirect("/admin/login");
  }

  const feedback = await getFeedback();

  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui", maxWidth: "1200px", margin: "0 auto" }}>
      <h1>Feedback — Openia.cl</h1>
      <p style={{ color: "#666", marginBottom: "1.5rem" }}>
        {feedback.length} evaluación{feedback.length === 1 ? "" : "es"}
      </p>

      {feedback.length === 0 ? (
        <p>Sin evaluaciones aún</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #e0e0e0" }}>
              <th style={{ padding: "10px 8px" }}>Fecha</th>
              <th style={{ padding: "10px 8px" }}>Rating</th>
              <th style={{ padding: "10px 8px" }}>Comentario</th>
              <th style={{ padding: "10px 8px" }}>Sesión</th>
            </tr>
          </thead>
          <tbody>
            {feedback.map((f) => (
              <tr key={f.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={{ padding: "10px 8px", whiteSpace: "nowrap" }}>{formatearFecha(f.created_at)}</td>
                <td style={{ padding: "10px 8px", color: "#f5b93d" }}>{"★".repeat(f.rating)}</td>
                <td style={{ padding: "10px 8px", color: f.comment ? "#333" : "#999" }}>
                  {f.comment || "—"}
                </td>
                <td style={{ padding: "10px 8px", color: "#999", fontFamily: "monospace", fontSize: "12px" }}>
                  {f.session_id.slice(0, 8)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
