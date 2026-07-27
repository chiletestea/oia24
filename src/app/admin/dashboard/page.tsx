import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE_NAME, verificarTokenSesionAdmin } from "@/lib/admin-auth";
import DashboardClient from "./DashboardClient";

export default function AdminDashboard() {
  const token = cookies().get(ADMIN_COOKIE_NAME)?.value;

  if (!verificarTokenSesionAdmin(token)) {
    redirect("/admin/login");
  }

  return <DashboardClient />;
}
