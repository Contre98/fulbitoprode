import { randomUUID } from "node:crypto";
import { z } from "zod";
import { jsonResponse } from "#http";
import { issueRefreshSessionWithId } from "@fulbito/server-core/auth-sessions";
import { loginOrRegisterWithGoogleIdToken } from "@fulbito/server-core/m3-repo";
import { enforceRateLimit, getRequesterFingerprint } from "@fulbito/server-core/rate-limit";
import { createAccessToken, createRefreshToken, getRefreshTokenMaxAgeSeconds } from "@fulbito/server-core/session";
import type { ApiRateLimitContext } from "../../../request-context";
import { parseJsonBody, RequestBodyValidationError } from "../../../validation";

const loginGooglePayloadSchema = z.object({
  idToken: z.string().optional()
});

interface RouteContext {
  setRateLimitContext?: (rateLimit: ApiRateLimitContext) => void;
}

export async function POST(request: Request, context?: RouteContext) {
  const clientKey = getRequesterFingerprint(request, "login-google:unknown");
  const rateLimitKey = `auth:login-google:${clientKey}`;
  const rateLimitConfig = {
    limit: 20,
    windowMs: 15 * 60 * 1000
  };
  const rateLimit = enforceRateLimit(rateLimitKey, rateLimitConfig);
  const rateLimitContext: ApiRateLimitContext = {
    key: rateLimitKey,
    limit: rateLimitConfig.limit,
    windowMs: rateLimitConfig.windowMs,
    allowed: rateLimit.allowed,
    remaining: rateLimit.remaining,
    retryAfterSeconds: rateLimit.retryAfterSeconds
  };
  context?.setRateLimitContext?.(rateLimitContext);

  if (!rateLimit.allowed) {
    return jsonResponse(
      { error: "Too many Google login attempts. Try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds)
        }
      }
    );
  }

  try {
    const body = await parseJsonBody(request, loginGooglePayloadSchema);
    const idToken = body.idToken?.trim() || "";

    if (!idToken) {
      return jsonResponse({ error: "Google idToken is required" }, { status: 400 });
    }

    const { user, token } = await loginOrRegisterWithGoogleIdToken(idToken);
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

    return jsonResponse(
      {
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
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof RequestBodyValidationError) {
      return jsonResponse({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Google login failed";
    return jsonResponse({ error: message }, { status: 401 });
  }
}
