import { NextResponse } from "next/server";
import { getApiSession, unauthorizedJson } from "@/lib/api-session";
import { registerDeviceToken } from "@/lib/notifications-store";
import { logServerEvent } from "@/lib/observability";

export async function POST(request: Request) {
  const session = getApiSession(request);
  if (!session) {
    return unauthorizedJson();
  }

  try {
    const body = (await request.json()) as { token?: string; platform?: string };
    const deviceToken = body.token?.trim() || "";
    const platform = body.platform?.trim() || "unknown";
    if (!deviceToken) {
      return NextResponse.json({ error: "token is required" }, { status: 400 });
    }
    registerDeviceToken(session.userId, {
      token: deviceToken,
      platform
    });
    logServerEvent("notifications.device-token.registered", {
      userId: session.userId,
      platform
    });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
