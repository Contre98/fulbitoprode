import { jsonResponse } from "#http";
import { revokeRefreshSession } from "@fulbito/server-core/auth-sessions";
import { getRefreshPayloadFromRequest } from "@fulbito/server-core/request-auth";
import { clearAuthCookieHeaders } from "../../../auth-cookies";

export async function POST(request: Request) {
  const refreshPayload = getRefreshPayloadFromRequest(request);
  if (refreshPayload?.sid) {
    await revokeRefreshSession({
      sessionId: refreshPayload.sid,
      userId: refreshPayload.uid,
      authToken: refreshPayload.pbt
    });
  }

  return jsonResponse(
    { ok: true },
    {
      status: 200,
      cookies: clearAuthCookieHeaders()
    }
  );
}
