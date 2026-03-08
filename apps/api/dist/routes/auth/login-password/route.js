import { randomUUID } from "node:crypto";
import { z } from "zod";
import { jsonResponse } from "#http";
import { issueRefreshSessionWithId } from "@fulbito/server-core/auth-sessions";
import { loginWithPassword } from "@fulbito/server-core/m3-repo";
import { enforceRateLimit, getRequesterFingerprint } from "@fulbito/server-core/rate-limit";
import { createAccessToken, createRefreshToken, getRefreshTokenMaxAgeSeconds } from "@fulbito/server-core/session";
import { parseJsonBody, RequestBodyValidationError } from "../../../validation";
const loginPayloadSchema = z.object({
    email: z.string().optional(),
    password: z.string().optional()
});
export async function POST(request) {
    const clientKey = getRequesterFingerprint(request, "login:unknown");
    const rateLimit = enforceRateLimit(`auth:login:${clientKey}`, {
        limit: 20,
        windowMs: 15 * 60 * 1000
    });
    if (!rateLimit.allowed) {
        return jsonResponse({ error: "Too many login attempts. Try again later." }, {
            status: 429,
            headers: {
                "Retry-After": String(rateLimit.retryAfterSeconds)
            }
        });
    }
    try {
        const body = await parseJsonBody(request, loginPayloadSchema);
        const email = body.email?.trim().toLowerCase() || "";
        const password = body.password || "";
        if (!email || !password) {
            return jsonResponse({ error: "Email and password are required" }, { status: 400 });
        }
        const { user, token } = await loginWithPassword(email, password);
        const sessionId = randomUUID();
        const accessToken = createAccessToken({ userId: user.id, pbToken: token, sessionId });
        const refreshToken = createRefreshToken({ userId: user.id, pbToken: token, sessionId });
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
        }, { status: 200 });
    }
    catch (error) {
        if (error instanceof RequestBodyValidationError) {
            return jsonResponse({ error: error.message }, { status: error.status });
        }
        const message = error instanceof Error ? error.message : "Invalid credentials";
        return jsonResponse({ error: message }, { status: 401 });
    }
}
