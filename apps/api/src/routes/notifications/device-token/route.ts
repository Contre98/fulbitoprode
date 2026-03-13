import { z } from "zod";
import { jsonResponse } from "#http";
import { getApiSession, unauthorizedJson } from "@fulbito/server-core/api-session";
import { registerDeviceToken } from "@fulbito/server-core/notifications-store";
import { logServerEvent } from "@fulbito/server-core/observability";
import { parseJsonBody, RequestBodyValidationError } from "../../../validation";

const registerDeviceTokenSchema = z.object({
  token: z.string().optional(),
  platform: z.string().optional(),
  provider: z.string().optional(),
  appVersion: z.string().optional()
});

export async function POST(request: Request) {
  const session = getApiSession(request);
  if (!session) {
    return unauthorizedJson();
  }

  try {
    const body = await parseJsonBody(request, registerDeviceTokenSchema);
    const deviceToken = body.token?.trim() || "";
    const platform = body.platform?.trim() || "unknown";
    if (!deviceToken) {
      return jsonResponse({ error: "token is required" }, { status: 400 });
    }
    await registerDeviceToken(session.userId, {
      token: deviceToken,
      platform,
      provider: body.provider?.trim() || undefined,
      appVersion: body.appVersion?.trim() || undefined
    });
    logServerEvent("notifications.device-token.registered", {
      userId: session.userId,
      platform
    });
    return jsonResponse({ ok: true }, { status: 200 });
  } catch (error) {
    if (error instanceof RequestBodyValidationError) {
      return jsonResponse({ error: error.message }, { status: error.status });
    }
    return jsonResponse({ error: "Invalid payload" }, { status: 400 });
  }
}
