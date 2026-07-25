import { redirect } from "next/navigation";
import { validarTokenAcceso } from "@/lib/middleware-token";
import { fetchPrograma } from "@/lib/o-chat-data";
import ProgramaChatUI from "@/components/ProgramaChatUI";

interface ProgramaTokenPageProps {
  params: { token: string };
}

export default async function ProgramaTokenPage({ params }: ProgramaTokenPageProps) {
  const { valido, usuario } = await validarTokenAcceso(params.token);

  if (!valido || !usuario || !usuario.programa_id) {
    redirect("/programa/bienvenida");
  }

  const programa = await fetchPrograma(usuario.programa_id);
  if (!programa) {
    redirect("/programa/bienvenida");
  }

  return (
    <ProgramaChatUI
      token={params.token}
      usuario={{ id: usuario.id, nombre: usuario.nombre, modulo_actual: usuario.modulo_actual }}
      programa={{ id: programa.id, nombre: programa.nombre, modulos: programa.modulos }}
    />
  );
}
