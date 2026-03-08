import { NextResponse } from "next/server";
import { getApiSession, unauthorizedJson } from "@/lib/api-session";
import {
  listNotifications,
  markAllNotificationsRead,
  seedNotificationIfEmpty,
  unreadNotificationCount
} from "@/lib/notifications-store";

export async function GET(request: Request) {
  const session = getApiSession(request);
  if (!session) {
    return unauthorizedJson();
  }

  seedNotificationIfEmpty(session.userId);
  const items = listNotifications(session.userId);
  const weeklyWinnerItem = items.find((item) => item.type === "weekly_winner");
  return NextResponse.json(
    {
      items,
      unreadCount: unreadNotificationCount(session.userId),
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

  markAllNotificationsRead(session.userId);
  return NextResponse.json({ ok: true }, { status: 200 });
}
