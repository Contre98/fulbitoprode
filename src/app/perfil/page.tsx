import { requireServerAuth } from "@/lib/server-auth";
import ProfilePageClient from "@/app/perfil/ProfilePageClient";

export default async function PerfilPage() {
  await requireServerAuth();
  return <ProfilePageClient />;
}
