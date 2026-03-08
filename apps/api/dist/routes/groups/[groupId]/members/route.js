import { jsonResponse } from "#http";
import { listGroupMembers, listGroupsForUser, removeGroupMember, updateGroupMemberRole } from "@fulbito/server-core/m3-repo";
import { getSessionPocketBaseTokenFromRequest, getSessionUserIdFromRequest } from "@fulbito/server-core/request-auth";
function unauthorized() {
    return jsonResponse({ error: "Unauthorized" }, { status: 401 });
}
export async function GET(request, context) {
    const userId = getSessionUserIdFromRequest(request);
    const pbToken = getSessionPocketBaseTokenFromRequest(request);
    if (!userId || !pbToken) {
        return unauthorized();
    }
    const { groupId } = await context.params;
    if (!groupId?.trim()) {
        return jsonResponse({ error: "groupId is required" }, { status: 400 });
    }
    const memberships = await listGroupsForUser(userId, pbToken);
    const selected = memberships.find((membership) => membership.group.id === groupId);
    if (!selected) {
        return jsonResponse({ error: "No tenés acceso a este grupo." }, { status: 403 });
    }
    const members = await listGroupMembers(groupId, pbToken);
    return jsonResponse({
        members,
        viewerRole: selected.membership.role,
        canManage: selected.membership.role === "owner" || selected.membership.role === "admin"
    }, { status: 200 });
}
export async function PATCH(request, context) {
    const userId = getSessionUserIdFromRequest(request);
    const pbToken = getSessionPocketBaseTokenFromRequest(request);
    if (!userId || !pbToken) {
        return unauthorized();
    }
    const { groupId } = await context.params;
    if (!groupId?.trim()) {
        return jsonResponse({ error: "groupId is required" }, { status: 400 });
    }
    let body;
    try {
        body = (await request.json());
    }
    catch {
        return jsonResponse({ error: "Invalid payload" }, { status: 400 });
    }
    const targetUserId = body.userId?.trim() || "";
    const role = body.role;
    if (!targetUserId || !role) {
        return jsonResponse({ error: "userId and role are required" }, { status: 400 });
    }
    if (role !== "admin" && role !== "member") {
        return jsonResponse({ error: "Invalid role" }, { status: 400 });
    }
    const result = await updateGroupMemberRole({
        actorUserId: userId,
        groupId,
        targetUserId,
        role
    }, pbToken);
    if (!result.ok) {
        return jsonResponse({ error: result.error }, { status: 403 });
    }
    return jsonResponse({ ok: true, changed: result.changed, member: result.member }, { status: 200 });
}
export async function DELETE(request, context) {
    const userId = getSessionUserIdFromRequest(request);
    const pbToken = getSessionPocketBaseTokenFromRequest(request);
    if (!userId || !pbToken) {
        return unauthorized();
    }
    const { groupId } = await context.params;
    if (!groupId?.trim()) {
        return jsonResponse({ error: "groupId is required" }, { status: 400 });
    }
    let body;
    try {
        body = (await request.json());
    }
    catch {
        return jsonResponse({ error: "Invalid payload" }, { status: 400 });
    }
    const targetUserId = body.userId?.trim() || "";
    if (!targetUserId) {
        return jsonResponse({ error: "userId is required" }, { status: 400 });
    }
    const result = await removeGroupMember({
        actorUserId: userId,
        groupId,
        targetUserId
    }, pbToken);
    if (!result.ok) {
        return jsonResponse({ error: result.error }, { status: 403 });
    }
    return jsonResponse({ ok: true }, { status: 200 });
}
