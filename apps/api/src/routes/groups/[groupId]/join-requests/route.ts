import { z } from "zod";
import { jsonResponse } from "#http";
import { getUserById, listPendingJoinRequests, respondToJoinRequest, listGroupMembers } from "@fulbito/server-core/m3-repo";
import { getSessionPocketBaseTokenFromRequest, getSessionUserIdFromRequest } from "@fulbito/server-core/request-auth";
import { dispatch } from "@fulbito/server-core/notification-dispatcher";
import { parseJsonBody, RequestBodyValidationError } from "../../../../validation";

interface RouteContext {
  params: Promise<{ groupId: string }>;
}

const respondSchema = z.object({
  userId: z.string().optional(),
  action: z.enum(["approve", "reject"]).optional()
});

function unauthorized() {
  return jsonResponse({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(request: Request, context: RouteContext) {
  const userId = getSessionUserIdFromRequest(request);
  const pbToken = getSessionPocketBaseTokenFromRequest(request);
  if (!userId || !pbToken) {
    return unauthorized();
  }

  const { groupId } = await context.params;
  if (!groupId?.trim()) {
    return jsonResponse({ error: "groupId is required" }, { status: 400 });
  }

  const requests = await listPendingJoinRequests(groupId, pbToken);
  return jsonResponse({ requests }, { status: 200 });
}

export async function POST(request: Request, context: RouteContext) {
  const userId = getSessionUserIdFromRequest(request);
  const pbToken = getSessionPocketBaseTokenFromRequest(request);
  if (!userId || !pbToken) {
    return unauthorized();
  }

  const { groupId } = await context.params;
  if (!groupId?.trim()) {
    return jsonResponse({ error: "groupId is required" }, { status: 400 });
  }

  try {
    const body = await parseJsonBody(request, respondSchema);
    const targetUserId = body.userId?.trim() || "";
    const action = body.action;

    if (!targetUserId || !action) {
      return jsonResponse({ error: "userId and action are required" }, { status: 400 });
    }

    const result = await respondToJoinRequest(
      { actorUserId: userId, groupId, targetUserId, action },
      pbToken
    );

    if (!result.ok) {
      return jsonResponse({ error: result.error }, { status: 403 });
    }

    // Fire-and-forget: notify the requester about the decision.
    void (async () => {
      try {
        const [actor, targetUser] = await Promise.all([
          getUserById(userId, pbToken),
          getUserById(targetUserId, pbToken)
        ]);
        const actorName = actor.name || actor.username || "Un admin";

        if (action === "approve") {
          // Notify the approved user.
          const members = await listGroupMembers(groupId, pbToken);
          const groupName = members.length > 0 ? "" : "";
          await dispatch({
            eventType: "join_request_approved",
            title: "Solicitud aprobada",
            body: `${actorName} aprobó tu solicitud. ¡Ya podés competir!`,
            target: { scope: "user", targetIds: [targetUserId] },
            idempotencyKey: `join_request:approved:${groupId}:${targetUserId}`,
            recipientUserIds: [targetUserId]
          });

          // Also notify existing members about the new joiner.
          const otherMemberIds = members.filter((m) => m.userId !== targetUserId).map((m) => m.userId);
          if (otherMemberIds.length > 0) {
            const displayName = targetUser.name || targetUser.username || "Un nuevo jugador";
            await dispatch({
              eventType: "social",
              title: members.length > 0 ? "Nuevo miembro" : "",
              body: `${displayName} se unió al grupo. ¡Ya pueden competir!`,
              target: { scope: "user", targetIds: otherMemberIds },
              idempotencyKey: `social:join:${groupId}:${targetUserId}`,
              recipientUserIds: otherMemberIds
            });
          }
        } else {
          await dispatch({
            eventType: "join_request_rejected",
            title: "Solicitud rechazada",
            body: "Tu solicitud para unirte al grupo fue rechazada.",
            target: { scope: "user", targetIds: [targetUserId] },
            idempotencyKey: `join_request:rejected:${groupId}:${targetUserId}`,
            recipientUserIds: [targetUserId]
          });
        }
      } catch {
        // Notification failure must never block the response.
      }
    })();

    return jsonResponse({ ok: true }, { status: 200 });
  } catch (error) {
    if (error instanceof RequestBodyValidationError) {
      return jsonResponse({ error: error.message }, { status: error.status });
    }
    return jsonResponse({ error: "Invalid payload" }, { status: 400 });
  }
}
