import { requireServerAuth } from "@/lib/server-auth";
import NotificacionesPageClient from "@/app/notificaciones/NotificacionesPageClient";

export default async function NotificacionesPage() {
  await requireServerAuth();
  return <NotificacionesPageClient />;
}
