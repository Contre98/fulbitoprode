import { jsonResponse } from "#http";
import { refreshGroupInvite } from "@fulbito/server-core/m3-repo";
import { getSessionPocketBaseTokenFromRequest, getSessionUserIdFromRequest } from "@fulbito/server-core/request-auth";

interface Params {
  params: Promise<{ groupId: string }>;
}

export async function POST(request: Request, context: Params) {
  const userId = getSessionUserIdFromRequest(request);
  const pbToken = getSessionPocketBaseTokenFromRequest(request);
  if (!userId || !pbToken) {
    return jsonResponse({ error: "Unauthorized" }, { status: 401 });
  }

  const { groupId } = await context.params;
  if (!groupId?.trim()) {
    return jsonResponse({ error: "groupId is required" }, { status: 400 });
  }

  const result = await refreshGroupInvite({ userId, groupId }, pbToken);
  if (!result.ok) {
    return jsonResponse({ error: result.error }, { status: 403 });
  }

  return jsonResponse(
    {
      ok: true,
      invite: {
        code: result.invite.code,
        token: result.invite.token,
        expiresAt: new Date(result.invite.expiresAt).toISOString()
      }
    },
    { status: 200 }
  );
}
