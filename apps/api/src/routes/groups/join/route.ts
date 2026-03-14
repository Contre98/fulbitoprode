import { z } from "zod";
import { jsonResponse } from "#http";
import { getUserById, joinGroupByCodeOrToken, listGroupMembers } from "@fulbito/server-core/m3-repo";
import { getSessionPocketBaseTokenFromRequest, getSessionUserIdFromRequest } from "@fulbito/server-core/request-auth";
import { dispatch } from "@fulbito/server-core/notification-dispatcher";
import { parseJsonBody, RequestBodyValidationError } from "../../../validation";

const joinGroupPayloadSchema = z.object({
  codeOrToken: z.string().optional()
});

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  const pbToken = getSessionPocketBaseTokenFromRequest(request);
  if (!userId || !pbToken) {
    return jsonResponse({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await parseJsonBody(request, joinGroupPayloadSchema);
    const codeOrToken = body.codeOrToken?.trim() || "";

    if (!codeOrToken) {
      return jsonResponse({ error: "codeOrToken is required" }, { status: 400 });
    }

    const joined = await joinGroupByCodeOrToken({ userId, codeOrToken }, pbToken);
    if (!joined.ok) {
      return jsonResponse({ error: joined.error }, { status: 400 });
    }

    // Fire-and-forget: notify existing group members about the new joiner
    void (async () => {
      try {
        const [user, members] = await Promise.all([getUserById(userId, pbToken), listGroupMembers(joined.group.id, pbToken)]);
        const displayName = user.name || user.username || "Un nuevo jugador";
        const otherMemberIds = members.filter((m) => m.userId !== userId).map((m) => m.userId);
        if (otherMemberIds.length === 0) return;
        await dispatch({
          eventType: "social",
          title: joined.group.name,
          body: `${displayName} se unió al grupo. ¡Ya pueden competir!`,
          target: { scope: "user", targetIds: otherMemberIds },
          idempotencyKey: `social:join:${joined.group.id}:${userId}`,
          recipientUserIds: otherMemberIds
        });
      } catch {
        // Notification failure must never block the join response
      }
    })();

    return jsonResponse(
      {
        ok: true,
        group: {
          id: joined.group.id,
          name: joined.group.name,
          slug: joined.group.slug,
          season: joined.group.season,
          leagueId: joined.group.leagueId
        }
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof RequestBodyValidationError) {
      return jsonResponse({ error: error.message }, { status: error.status });
    }
    return jsonResponse({ error: "Invalid payload" }, { status: 400 });
  }
}
