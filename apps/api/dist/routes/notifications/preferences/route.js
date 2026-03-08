import { jsonResponse } from "#http";
import { getApiSession, unauthorizedJson } from "@fulbito/server-core/api-session";
import { getNotificationPreferences, setNotificationPreferences } from "@fulbito/server-core/notifications-store";
export async function GET(request) {
    const session = getApiSession(request);
    if (!session) {
        return unauthorizedJson();
    }
    return jsonResponse(getNotificationPreferences(session.userId), { status: 200 });
}
export async function PATCH(request) {
    const session = getApiSession(request);
    if (!session) {
        return unauthorizedJson();
    }
    try {
        const body = (await request.json());
        const next = setNotificationPreferences(session.userId, {
            ...(typeof body.reminders === "boolean" ? { reminders: body.reminders } : {}),
            ...(typeof body.results === "boolean" ? { results: body.results } : {}),
            ...(typeof body.social === "boolean" ? { social: body.social } : {})
        });
        return jsonResponse(next, { status: 200 });
    }
    catch {
        return jsonResponse({ error: "Invalid payload" }, { status: 400 });
    }
}
