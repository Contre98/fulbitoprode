import { NextResponse } from "next/server";
import { listGroupMembers, listGroupsForUser, removeGroupMember, updateGroupMemberRole } from "@/lib/m3-repo";
import { getSessionPocketBaseTokenFromRequest, getSessionUserIdFromRequest } from "@/lib/request-auth";

interface RouteContext {
  params: Promise<{ groupId: string }>;
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(request: Request, context: RouteContext) {
  const userId = getSessionUserIdFromRequest(request);
  const pbToken = getSessionPocketBaseTokenFromRequest(request);
  if (!userId || !pbToken) {
    return unauthorized();
  }

  const { groupId } = await context.params;
  if (!groupId?.trim()) {
    return NextResponse.json({ error: "groupId is required" }, { status: 400 });
  }

  const memberships = await listGroupsForUser(userId, pbToken);
  const selected = memberships.find((membership) => membership.group.id === groupId);
  if (!selected) {
    return NextResponse.json({ error: "No tenés acceso a este grupo." }, { status: 403 });
  }

  const members = await listGroupMembers(groupId, pbToken);

  return NextResponse.json(
    {
      members,
      viewerRole: selected.membership.role,
      canManage: selected.membership.role === "owner" || selected.membership.role === "admin"
    },
    { status: 200 }
  );
}

export async function PATCH(request: Request, context: RouteContext) {
  const userId = getSessionUserIdFromRequest(request);
  const pbToken = getSessionPocketBaseTokenFromRequest(request);
  if (!userId || !pbToken) {
    return unauthorized();
  }

  const { groupId } = await context.params;
  if (!groupId?.trim()) {
    return NextResponse.json({ error: "groupId is required" }, { status: 400 });
  }

  let body: { userId?: string; role?: "admin" | "member" };
  try {
    body = (await request.json()) as { userId?: string; role?: "admin" | "member" };
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const targetUserId = body.userId?.trim() || "";
  const role = body.role;

  if (!targetUserId || !role) {
    return NextResponse.json({ error: "userId and role are required" }, { status: 400 });
  }

  if (role !== "admin" && role !== "member") {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const result = await updateGroupMemberRole(
    {
      actorUserId: userId,
      groupId,
      targetUserId,
      role
    },
    pbToken
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }

  return NextResponse.json({ ok: true, changed: result.changed, member: result.member }, { status: 200 });
}

export async function DELETE(request: Request, context: RouteContext) {
  const userId = getSessionUserIdFromRequest(request);
  const pbToken = getSessionPocketBaseTokenFromRequest(request);
  if (!userId || !pbToken) {
    return unauthorized();
  }

  const { groupId } = await context.params;
  if (!groupId?.trim()) {
    return NextResponse.json({ error: "groupId is required" }, { status: 400 });
  }

  let body: { userId?: string };
  try {
    body = (await request.json()) as { userId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const targetUserId = body.userId?.trim() || "";
  if (!targetUserId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const result = await removeGroupMember(
    {
      actorUserId: userId,
      groupId,
      targetUserId
    },
    pbToken
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
