import { randomUUID } from "node:crypto";
import { jsonResponse } from "#http";
import { issueRefreshSessionWithId } from "@fulbito/server-core/auth-sessions";
import { registerWithPassword } from "@fulbito/server-core/m3-repo";
import { enforceRateLimit, getRequesterFingerprint } from "@fulbito/server-core/rate-limit";
import { createAccessToken, createRefreshToken, createSessionToken, getRefreshTokenMaxAgeSeconds } from "@fulbito/server-core/session";
import { authCookieHeaders } from "../../../auth-cookies";
export async function POST(request) {
    const clientKey = getRequesterFingerprint(request, "register:unknown");
    const rateLimit = enforceRateLimit(`auth:register:${clientKey}`, {
        limit: 10,
        windowMs: 15 * 60 * 1000
    });
    if (!rateLimit.allowed) {
        return jsonResponse({ error: "Too many registration attempts. Try again later." }, {
            status: 429,
            headers: {
                "Retry-After": String(rateLimit.retryAfterSeconds)
            }
        });
    }
    try {
        const body = (await request.json());
        const email = body.email?.trim().toLowerCase() || "";
        const password = body.password || "";
        const name = body.name?.trim() || undefined;
        if (!email || !password) {
            return jsonResponse({ error: "Email and password are required" }, { status: 400 });
        }
        if (password.length < 8) {
            return jsonResponse({ error: "Password must be at least 8 characters" }, { status: 400 });
        }
        const { user, token } = await registerWithPassword({ email, password, name });
        const sessionId = randomUUID();
        const accessToken = createAccessToken({ userId: user.id, pbToken: token, sessionId });
        const refreshToken = createRefreshToken({ userId: user.id, pbToken: token, sessionId });
        const legacySessionToken = createSessionToken({ userId: user.id, pbToken: token });
        await issueRefreshSessionWithId({
            sessionId,
            userId: user.id,
            refreshToken,
            expiresAt: new Date(Date.now() + getRefreshTokenMaxAgeSeconds() * 1000),
            authToken: token
        });
        return jsonResponse({
            ok: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                username: user.username ?? null,
                favoriteTeam: user.favoriteTeam ?? null
            },
            accessToken,
            refreshToken
        }, {
            status: 201,
            cookies: authCookieHeaders({
                accessToken,
                refreshToken,
                legacySessionToken
            })
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Registration failed";
        return jsonResponse({ error: message }, { status: 400 });
    }
}
