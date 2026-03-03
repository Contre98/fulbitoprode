import { requireServerAuth } from "@/lib/server-auth";
import ConfiguracionPageClient from "@/app/configuracion/ConfiguracionPageClient";

export default async function ConfiguracionPage() {
  await requireServerAuth();
  return <ConfiguracionPageClient />;
}
