import { z } from "zod";
import { jsonResponse } from "#http";
import { getApiSession, unauthorizedJson } from "@fulbito/server-core/api-session";
import { getNotificationPreferences, setNotificationPreferences } from "@fulbito/server-core/notifications-store";
import { parseJsonBody, RequestBodyValidationError } from "../../../validation";
const updatePreferencesPayloadSchema = z.object({
    reminders: z.boolean().optional(),
    results: z.boolean().optional(),
    social: z.boolean().optional()
});
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
        const body = await parseJsonBody(request, updatePreferencesPayloadSchema);
        const next = setNotificationPreferences(session.userId, {
            ...(typeof body.reminders === "boolean" ? { reminders: body.reminders } : {}),
            ...(typeof body.results === "boolean" ? { results: body.results } : {}),
            ...(typeof body.social === "boolean" ? { social: body.social } : {})
        });
        return jsonResponse(next, { status: 200 });
    }
    catch (error) {
        if (error instanceof RequestBodyValidationError) {
            return jsonResponse({ error: error.message }, { status: error.status });
        }
        return jsonResponse({ error: "Invalid payload" }, { status: 400 });
    }
}
