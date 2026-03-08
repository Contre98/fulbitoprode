import { z } from "zod";
import { jsonResponse } from "#http";
import { deleteGroupSoft, renameGroup } from "@fulbito/server-core/m3-repo";
import { getSessionPocketBaseTokenFromRequest, getSessionUserIdFromRequest } from "@fulbito/server-core/request-auth";
import { parseJsonBody, RequestBodyValidationError } from "../../../validation";

interface RouteContext {
  params: Promise<{ groupId: string }>;
}

const renameGroupPayloadSchema = z.object({
  name: z.string().optional()
});

export async function DELETE(request: Request, context: RouteContext) {
  const userId = getSessionUserIdFromRequest(request);
  const pbToken = getSessionPocketBaseTokenFromRequest(request);
  if (!userId || !pbToken) {
    return jsonResponse({ error: "Unauthorized" }, { status: 401 });
  }

  const { groupId } = await context.params;
  if (!groupId?.trim()) {
    return jsonResponse({ error: "groupId is required" }, { status: 400 });
  }

  const result = await deleteGroupSoft(
    {
      userId,
      groupId
    },
    pbToken
  );

  if (!result.ok) {
    return jsonResponse({ error: result.error }, { status: 403 });
  }

  return jsonResponse({ ok: true, warningRequired: result.warningRequired }, { status: 200 });
}

export async function PATCH(request: Request, context: RouteContext) {
  const userId = getSessionUserIdFromRequest(request);
  const pbToken = getSessionPocketBaseTokenFromRequest(request);
  if (!userId || !pbToken) {
    return jsonResponse({ error: "Unauthorized" }, { status: 401 });
  }

  const { groupId } = await context.params;
  if (!groupId?.trim()) {
    return jsonResponse({ error: "groupId is required" }, { status: 400 });
  }

  try {
    const body = await parseJsonBody(request, renameGroupPayloadSchema);
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return jsonResponse({ error: "name is required" }, { status: 400 });
    }

    const result = await renameGroup({ userId, groupId, name }, pbToken);
    if (!result.ok) {
      return jsonResponse({ error: result.error }, { status: 403 });
    }

    return jsonResponse({ ok: true, group: result.group }, { status: 200 });
  } catch (error) {
    if (error instanceof RequestBodyValidationError) {
      return jsonResponse({ error: error.message }, { status: error.status });
    }
    return jsonResponse({ error: "Invalid payload" }, { status: 400 });
  }
}
