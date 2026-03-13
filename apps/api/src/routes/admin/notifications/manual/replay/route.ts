import { z } from "zod";
import { jsonResponse } from "#http";
import { requireAdminToken } from "../../../auth";
import { parseJsonBody, RequestBodyValidationError } from "../../../../../validation";
import { dispatch } from "@fulbito/server-core/notification-dispatcher";
import { resolveRecipientUserIds } from "../../resolve-recipients";
import { randomUUID } from "node:crypto";
import type { NotificationEventType, NotificationTargetScope } from "@fulbito/domain";

const schema = z.object({
  /** ID of a prior notification_events record to replay */
  eventId: z.string().optional(),
  /** Or provide everything explicitly (same as send) */
  eventType: z.enum(["prediction_lock", "results_published", "weekly_winner", "social"]).optional(),
  title: z.string().min(1).max(500).optional(),
  body: z.string().min(1).max(2000).optional(),
  scope: z.enum(["user", "group", "global"]).optional(),
  targetIds: z.array(z.string()).optional(),
  data: z.record(z.unknown()).optional()
});

export async function POST(request: Request) {
  const authError = requireAdminToken(request);
  if (authError) return authError;

  try {
    const input = await parseJsonBody(request, schema);

    let eventType: NotificationEventType;
    let title: string;
    let body: string;
    let scope: NotificationTargetScope;
    let targetIds: string[] | undefined;
    let data: Record<string, unknown> | undefined;

    if (input.eventId) {
      // Load from existing event record
      const { getPocketBaseConfig } = await import("@fulbito/server-core/pocketbase");
      const { url } = getPocketBaseConfig();
      const res = await fetch(`${url}/api/collections/notification_events/records/${input.eventId}`, {
        cache: "no-store"
      });
      if (!res.ok) {
        return jsonResponse({ error: "Event not found" }, { status: 404 });
      }
      const event = await res.json() as {
        event_type: string;
        title: string;
        body: string;
        scope: string;
        target_ids_json?: string;
        data_json?: string;
      };
      eventType = event.event_type as NotificationEventType;
      title = event.title;
      body = event.body;
      scope = event.scope as NotificationTargetScope;
      targetIds = event.target_ids_json ? JSON.parse(event.target_ids_json) : undefined;
      data = event.data_json ? JSON.parse(event.data_json) : undefined;
    } else {
      if (!input.eventType || !input.title || !input.body || !input.scope) {
        return jsonResponse({ error: "eventId or (eventType, title, body, scope) required" }, { status: 400 });
      }
      eventType = input.eventType;
      title = input.title;
      body = input.body;
      scope = input.scope;
      targetIds = input.targetIds;
      data = input.data;
    }

    const recipientUserIds = await resolveRecipientUserIds({ scope, targetIds });

    // Replay always uses a fresh idempotency key so it re-sends
    const result = await dispatch({
      eventType,
      title,
      body,
      target: { scope, targetIds },
      data,
      idempotencyKey: `replay:${randomUUID()}`,
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
