import { jsonResponse } from "#http";
import { getApiSession, unauthorizedJson } from "@fulbito/server-core/api-session";
import { dismissNotification } from "@fulbito/server-core/notifications-store";

export async function DELETE(request: Request, context?: { params: Promise<{ notificationId: string }> }) {
  const session = getApiSession(request);
  if (!session) {
    return unauthorizedJson();
  }

  const { notificationId } = await (context?.params ?? Promise.resolve({ notificationId: "" }));
  const normalizedId = notificationId?.trim();
  if (!normalizedId) {
    return jsonResponse({ error: "notificationId is required" }, { status: 400 });
  }

  const dismissed = await dismissNotification(session.userId, normalizedId);
  if (!dismissed) {
    return jsonResponse({ error: "Notification not found" }, { status: 404 });
  }

  return jsonResponse({ ok: true }, { status: 200 });
}
