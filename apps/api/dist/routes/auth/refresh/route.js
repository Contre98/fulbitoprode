import { randomUUID } from "node:crypto";
import { jsonResponse } from "#http";
import { rotateRefreshSession } from "@fulbito/server-core/auth-sessions";
import { getRefreshTokenFromRequest } from "@fulbito/server-core/request-auth";
import { createAccessToken, createRefreshToken, createSessionToken, getRefreshTokenMaxAgeSeconds, verifyRefreshToken } from "@fulbito/server-core/session";
import { authCookieHeaders } from "../../../auth-cookies";
function readBodyRefreshToken(body) {
    if (typeof body !== "object" || body === null) {
        return null;
    }
    const raw = body.refreshToken;
    if (typeof raw !== "string") {
        return null;
    }
    const token = raw.trim();
    return token || null;
}
export async function POST(request) {
    let bodyRefreshToken = null;
    try {
        bodyRefreshToken = readBodyRefreshToken(await request.json());
    }
    catch {
        bodyRefreshToken = null;
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
    const rotateResult = rotateRefreshSession({
        priorSessionId: refreshPayload.sid,
        priorUserId: refreshPayload.uid,
        priorRefreshToken: refreshToken,
        nextRefreshToken,
        nextExpiresAt: new Date(Date.now() + getRefreshTokenMaxAgeSeconds() * 1000)
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
