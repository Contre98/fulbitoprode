import { randomUUID } from "node:crypto";
import { z } from "zod";
import { jsonResponse } from "#http";
import { rotateRefreshSession } from "@fulbito/server-core/auth-sessions";
import { refreshPocketBaseToken } from "@fulbito/server-core/m3-repo";
import { createAccessToken, createRefreshToken, getRefreshTokenMaxAgeSeconds, verifyRefreshToken } from "@fulbito/server-core/session";
import { parseJsonBody, RequestBodyValidationError } from "../../../validation";

const refreshPayloadSchema = z.object({
  refreshToken: z.string().optional()
});

export async function POST(request: Request) {
  let refreshToken: string | null = null;

  try {
    const body = await parseJsonBody(request, refreshPayloadSchema);
    refreshToken = body.refreshToken?.trim() || null;
  } catch (error) {
    if (error instanceof RequestBodyValidationError) {
      return jsonResponse({ error: error.message }, { status: error.status });
    }
    return jsonResponse({ error: "Invalid payload" }, { status: 400 });
  }

  const refreshPayload = verifyRefreshToken(refreshToken);
  if (!refreshToken || !refreshPayload) {
    return jsonResponse({ error: "Unauthorized" }, { status: 401 });
  }

  // Try to refresh the PocketBase token so it doesn't expire while the API session is still valid.
  // If PB refresh fails (token already expired), fall back to the existing token.
  const freshPbToken = await refreshPocketBaseToken(refreshPayload.pbt) || refreshPayload.pbt;

  const nextSessionId = randomUUID();
  const nextRefreshToken = createRefreshToken({
    userId: refreshPayload.uid,
    pbToken: freshPbToken,
    sessionId: nextSessionId
  });

  const rotateResult = await rotateRefreshSession({
    priorSessionId: refreshPayload.sid,
    priorUserId: refreshPayload.uid,
    priorRefreshToken: refreshToken,
    nextSessionId,
    nextRefreshToken,
    nextExpiresAt: new Date(Date.now() + getRefreshTokenMaxAgeSeconds() * 1000),
    authToken: freshPbToken
  });

  if (!rotateResult.ok) {
    return jsonResponse({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = createAccessToken({
    userId: refreshPayload.uid,
    pbToken: freshPbToken,
    sessionId: nextSessionId
  });

  return jsonResponse(
    {
      ok: true,
      accessToken,
      refreshToken: nextRefreshToken
    },
    { status: 200 }
  );
}
