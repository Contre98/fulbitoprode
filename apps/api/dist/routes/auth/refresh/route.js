import { randomUUID } from "node:crypto";
import { z } from "zod";
import { jsonResponse } from "#http";
import { rotateRefreshSession } from "@fulbito/server-core/auth-sessions";
import { getRefreshTokenFromRequest } from "@fulbito/server-core/request-auth";
import { createAccessToken, createRefreshToken, createSessionToken, getRefreshTokenMaxAgeSeconds, verifyRefreshToken } from "@fulbito/server-core/session";
import { authCookieHeaders } from "../../../auth-cookies";
import { parseJsonBody, RequestBodyValidationError } from "../../../validation";
const refreshPayloadSchema = z.object({
    refreshToken: z.string().optional()
});
export async function POST(request) {
    let bodyRefreshToken = null;
    try {
        const body = await parseJsonBody(request, refreshPayloadSchema);
        bodyRefreshToken = body.refreshToken?.trim() || null;
    }
    catch (error) {
        if (error instanceof RequestBodyValidationError && error.message !== "Invalid payload") {
            return jsonResponse({ error: error.message }, { status: error.status });
        }
    }
    const refreshToken = bodyRefreshToken || getRefreshTokenFromRequest(request);
    const refreshPayload = verifyRefreshToken(refreshToken);
    if (!refreshToken || !refreshPayload) {
        return jsonResponse({ error: "Unauthorized" }, { status: 401 });
    }
    const nextSessionId = randomUUID();
    const nextRefreshToken = createRefreshToken({
        userId: refreshPayload.uid,
        pbToken: refreshPayload.pbt,
        sessionId: nextSessionId
    });
    const rotateResult = await rotateRefreshSession({
        priorSessionId: refreshPayload.sid,
        priorUserId: refreshPayload.uid,
        priorRefreshToken: refreshToken,
        nextSessionId,
        nextRefreshToken,
        nextExpiresAt: new Date(Date.now() + getRefreshTokenMaxAgeSeconds() * 1000),
        authToken: refreshPayload.pbt
    });
    if (!rotateResult.ok) {
        return jsonResponse({ error: "Unauthorized" }, { status: 401 });
    }
    const accessToken = createAccessToken({
        userId: refreshPayload.uid,
        pbToken: refreshPayload.pbt,
        sessionId: nextSessionId
    });
    const legacySessionToken = createSessionToken({
        userId: refreshPayload.uid,
        pbToken: refreshPayload.pbt
    });
    return jsonResponse({
        ok: true,
        accessToken,
        refreshToken: nextRefreshToken
    }, {
        status: 200,
        cookies: authCookieHeaders({
            accessToken,
            refreshToken: nextRefreshToken,
            legacySessionToken
        })
    });
}
