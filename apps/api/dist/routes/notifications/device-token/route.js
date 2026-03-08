import { jsonResponse } from "#http";
import { getApiSession, unauthorizedJson } from "@fulbito/server-core/api-session";
import { registerDeviceToken } from "@fulbito/server-core/notifications-store";
import { logServerEvent } from "@fulbito/server-core/observability";
export async function POST(request) {
    const session = getApiSession(request);
    if (!session) {
        return unauthorizedJson();
    }
    try {
        const body = (await request.json());
        const deviceToken = body.token?.trim() || "";
        const platform = body.platform?.trim() || "unknown";
        if (!deviceToken) {
            return jsonResponse({ error: "token is required" }, { status: 400 });
        }
        registerDeviceToken(session.userId, {
            token: deviceToken,
            platform
        });
        logServerEvent("notifications.device-token.registered", {
            userId: session.userId,
            platform
        });
        return jsonResponse({ ok: true }, { status: 200 });
    }
    catch {
        return jsonResponse({ error: "Invalid payload" }, { status: 400 });
    }
}
