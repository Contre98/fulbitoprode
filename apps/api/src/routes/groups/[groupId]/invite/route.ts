import { jsonResponse } from "#http";
import { getGroupInvite } from "@fulbito/server-core/m3-repo";
import { getSessionPocketBaseTokenFromRequest, getSessionUserIdFromRequest } from "@fulbito/server-core/request-auth";

interface Params {
  params: Promise<{ groupId: string }>;
}

function normalizePublicBaseUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withProtocol).origin;
  } catch {
    return "";
  }
}

export async function GET(request: Request, context: Params) {
  const userId = getSessionUserIdFromRequest(request);
  const pbToken = getSessionPocketBaseTokenFromRequest(request);
  if (!userId || !pbToken) {
    return jsonResponse({ error: "Unauthorized" }, { status: 401 });
  }

  const { groupId } = await context.params;
  if (!groupId?.trim()) {
    return jsonResponse({ error: "groupId is required" }, { status: 400 });
  }

  const result = await getGroupInvite({ userId, groupId }, pbToken);
  if (!result.ok) {
    return jsonResponse({ error: result.error }, { status: 403 });
  }

  const configuredBase = normalizePublicBaseUrl(
    process.env.PUBLIC_APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim() || ""
  );
  const requestBase = new URL(request.url).origin;
  const base = (configuredBase || requestBase).replace(/\/$/, "");
  const inviteUrl = result.invite ? `${base}/join?invite=${encodeURIComponent(result.invite.token)}` : undefined;

  return jsonResponse(
    {
      invite: result.invite
        ? {
            code: result.invite.code,
            token: result.invite.token,
            expiresAt: new Date(result.invite.expiresAt).toISOString()
          }
        : null,
      canRefresh: result.canRefresh,
      inviteUrl
    },
    { status: 200 }
  );
}
