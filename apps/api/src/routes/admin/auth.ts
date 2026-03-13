import { jsonResponse } from "#http";
import { getNotificationsAdminToken } from "@fulbito/server-core/env";

export function requireAdminToken(request: Request): Response | null {
  const configured = getNotificationsAdminToken();
  if (!configured) {
    return jsonResponse({ error: "Admin token not configured on server" }, { status: 503 });
  }
  const provided = request.headers.get("x-admin-token")?.trim() || "";
  if (!provided || provided !== configured) {
    return jsonResponse({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
