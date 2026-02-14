import { requireServerAuth } from "@/lib/server-auth";
import ConfiguracionPerfilPageClient from "@/app/configuracion/perfil/ConfiguracionPerfilPageClient";

export default async function ConfiguracionPerfilPage() {
  await requireServerAuth();
  return <ConfiguracionPerfilPageClient />;
}
