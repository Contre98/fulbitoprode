import { z } from "zod";
import { jsonResponse } from "#http";
import { requireAdminToken } from "../../../auth";
import { parseJsonBody, RequestBodyValidationError } from "../../../../../validation";
import { dispatch } from "@fulbito/server-core/notification-dispatcher";
import { resolveRecipientUserIds } from "../../resolve-recipients";
import { randomUUID } from "node:crypto";

const schema = z.object({
  eventType: z.enum(["prediction_lock", "results_published", "weekly_winner", "social"]),
  title: z.string().min(1).max(500),
  body: z.string().min(1).max(2000),
  scope: z.enum(["user", "group", "global"]),
  targetIds: z.array(z.string()).optional(),
  idempotencyKey: z.string().optional(),
  data: z.record(z.unknown()).optional()
});

export async function POST(request: Request) {
  const authError = requireAdminToken(request);
  if (authError) return authError;

  try {
    const input = await parseJsonBody(request, schema);
    const recipientUserIds = await resolveRecipientUserIds({
      scope: input.scope,
      targetIds: input.targetIds
    });

    const result = await dispatch({
      eventType: input.eventType,
      title: input.title,
      body: input.body,
      target: { scope: input.scope, targetIds: input.targetIds },
      data: input.data,
      idempotencyKey: input.idempotencyKey || randomUUID(),
      recipientUserIds
    });

    return jsonResponse(result, { status: 200 });
  } catch (error) {
    if (error instanceof RequestBodyValidationError) {
      return jsonResponse({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
