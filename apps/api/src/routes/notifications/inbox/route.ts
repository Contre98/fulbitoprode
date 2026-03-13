import { jsonResponse } from "#http";
import { getApiSession, unauthorizedJson } from "@fulbito/server-core/api-session";
import {
  listNotifications,
  markAllNotificationsRead,
  seedNotificationIfEmpty,
  unreadNotificationCount
} from "@fulbito/server-core/notifications-store";

export async function GET(request: Request) {
  const session = getApiSession(request);
  if (!session) {
    return unauthorizedJson();
  }

  await seedNotificationIfEmpty(session.userId);
  const items = await listNotifications(session.userId);
  const unreadCount = await unreadNotificationCount(session.userId);
  const weeklyWinnerItem = items.find((item) => item.type === "weekly_winner");
  return jsonResponse(
    {
      items,
      unreadCount,
      weeklyWinner: weeklyWinnerItem
        ? {
            period: "latest",
            periodLabel: "Última fecha",
            winnerName: weeklyWinnerItem.title.replace(/^Ganador semanal:?/i, "").trim() || "Grupo",
            points: 0
          }
        : null
    },
    { status: 200 }
  );
}

export async function POST(request: Request) {
  const session = getApiSession(request);
  if (!session) {
    return unauthorizedJson();
  }

  await markAllNotificationsRead(session.userId);
  return jsonResponse({ ok: true }, { status: 200 });
}
