import { NextResponse } from "next/server";
import { getApiSession, unauthorizedJson } from "@/lib/api-session";
import { getNotificationPreferences, setNotificationPreferences } from "@/lib/notifications-store";

export async function GET(request: Request) {
  const session = getApiSession(request);
  if (!session) {
    return unauthorizedJson();
  }

  return NextResponse.json(getNotificationPreferences(session.userId), { status: 200 });
}

export async function PATCH(request: Request) {
  const session = getApiSession(request);
  if (!session) {
    return unauthorizedJson();
  }

  try {
    const body = (await request.json()) as {
      reminders?: boolean;
      results?: boolean;
      social?: boolean;
    };
    const next = setNotificationPreferences(session.userId, {
      ...(typeof body.reminders === "boolean" ? { reminders: body.reminders } : {}),
      ...(typeof body.results === "boolean" ? { results: body.results } : {}),
      ...(typeof body.social === "boolean" ? { social: body.social } : {})
    });
    return NextResponse.json(next, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
