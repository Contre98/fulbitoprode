import { NextResponse } from "next/server";
import { getGroupInvite } from "@/lib/m3-repo";
import { getSessionPocketBaseTokenFromRequest, getSessionUserIdFromRequest } from "@/lib/request-auth";

interface Params {
  params: Promise<{ groupId: string }>;
}

export async function GET(request: Request, context: Params) {
  const userId = getSessionUserIdFromRequest(request);
  const pbToken = getSessionPocketBaseTokenFromRequest(request);
  if (!userId || !pbToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { groupId } = await context.params;
  if (!groupId?.trim()) {
    return NextResponse.json({ error: "groupId is required" }, { status: 400 });
  }

  const result = await getGroupInvite({ userId, groupId }, pbToken);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }

  const configuredBase = process.env.NEXT_PUBLIC_APP_URL?.trim() || "";
  const requestBase = new URL(request.url).origin;
  const base = (configuredBase || requestBase).replace(/\/$/, "");
  const inviteUrl = result.invite ? `${base}/configuracion?invite=${encodeURIComponent(result.invite.token)}` : undefined;

  return NextResponse.json(
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
