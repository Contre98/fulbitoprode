import { NextResponse } from "next/server";
import { refreshGroupInvite } from "@/lib/m3-repo";
import { getSessionPocketBaseTokenFromRequest, getSessionUserIdFromRequest } from "@/lib/request-auth";

interface Params {
  params: Promise<{ groupId: string }>;
}

export async function POST(request: Request, context: Params) {
  const userId = getSessionUserIdFromRequest(request);
  const pbToken = getSessionPocketBaseTokenFromRequest(request);
  if (!userId || !pbToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { groupId } = await context.params;
  if (!groupId?.trim()) {
    return NextResponse.json({ error: "groupId is required" }, { status: 400 });
  }

  const result = await refreshGroupInvite({ userId, groupId }, pbToken);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }

  return NextResponse.json(
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
