import { NextResponse } from "next/server";
import { deleteGroupSoft, renameGroup } from "@/lib/m3-repo";
import { getSessionPocketBaseTokenFromRequest, getSessionUserIdFromRequest } from "@/lib/request-auth";

interface RouteContext {
  params: Promise<{ groupId: string }>;
}

export async function DELETE(request: Request, context: RouteContext) {
  const userId = getSessionUserIdFromRequest(request);
  const pbToken = getSessionPocketBaseTokenFromRequest(request);
  if (!userId || !pbToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { groupId } = await context.params;
  if (!groupId?.trim()) {
    return NextResponse.json({ error: "groupId is required" }, { status: 400 });
  }

  const result = await deleteGroupSoft(
    {
      userId,
      groupId
    },
    pbToken
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }

  return NextResponse.json({ ok: true, warningRequired: result.warningRequired }, { status: 200 });
}

export async function PATCH(request: Request, context: RouteContext) {
  const userId = getSessionUserIdFromRequest(request);
  const pbToken = getSessionPocketBaseTokenFromRequest(request);
  if (!userId || !pbToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { groupId } = await context.params;
  if (!groupId?.trim()) {
    return NextResponse.json({ error: "groupId is required" }, { status: 400 });
  }

  try {
    const body = (await request.json()) as { name?: string };
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const result = await renameGroup({ userId, groupId, name }, pbToken);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    return NextResponse.json({ ok: true, group: result.group }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
