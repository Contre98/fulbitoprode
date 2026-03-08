import { z } from "zod";
import { jsonResponse } from "#http";
import { revokeRefreshSession } from "@fulbito/server-core/auth-sessions";
import { verifyRefreshToken } from "@fulbito/server-core/session";
import { parseJsonBody, RequestBodyValidationError } from "../../../validation";
const logoutPayloadSchema = z.object({
    refreshToken: z.string().optional()
});
export async function POST(request) {
    let refreshToken = null;
    try {
        const body = await parseJsonBody(request, logoutPayloadSchema);
        refreshToken = body.refreshToken?.trim() || null;
    }
    catch (error) {
        if (error instanceof RequestBodyValidationError && error.message !== "Invalid payload") {
            return jsonResponse({ error: error.message }, { status: error.status });
        }
    }
    const refreshPayload = verifyRefreshToken(refreshToken);
    if (refreshPayload?.sid) {
        await revokeRefreshSession({
            sessionId: refreshPayload.sid,
            userId: refreshPayload.uid,
            authToken: refreshPayload.pbt
        });
    }
    return jsonResponse({ ok: true }, { status: 200 });
}
