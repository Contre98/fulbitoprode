import { requireServerAuth } from "@/lib/server-auth";
import ConfiguracionAjustesPageClient from "@/app/configuracion/ajustes/ConfiguracionAjustesPageClient";

export default async function ConfiguracionAjustesPage() {
  await requireServerAuth();
  return <ConfiguracionAjustesPageClient />;
}
