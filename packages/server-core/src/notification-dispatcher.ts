import type { NotificationEventType, NotificationTargetScope } from "@fulbito/domain";
import {
  createNotificationEvent,
  createNotificationJob,
  createDelivery,
  createInboxItem,
  updateJobStatus,
  updateDeliveryStatus,
  updateEventStatus,
  listDeviceTokensForUser,
  invalidateDeviceToken
} from "./notifications-repo";
import { getPushProvider } from "./push-provider";
import { logServerEvent } from "./observability";

export interface DispatchTarget {
  scope: NotificationTargetScope;
  /** user IDs for scope=user, group IDs for scope=group — ignored for scope=global */
  targetIds?: string[];
}

export interface DispatchInput {
  eventType: NotificationEventType;
  title: string;
  body: string;
  target: DispatchTarget;
  data?: Record<string, unknown>;
  idempotencyKey: string;
  /** List of resolved user IDs to notify */
  recipientUserIds: string[];
}

export interface DispatchResult {
  eventId: string;
  jobId: string;
  totalRecipients: number;
  sent: number;
  failed: number;
  skippedDuplicate: boolean;
}

// ---------------------------------------------------------------------------
// Dry-run: count recipients + preview what would be sent, no actual delivery
// ---------------------------------------------------------------------------

export interface DryRunInput {
  eventType: NotificationEventType;
  title: string;
  body: string;
  target: DispatchTarget;
  idempotencyKey: string;
  recipientUserIds: string[];
}

export interface DryRunResult {
  wouldSend: number;
  recipientSample: string[];
  alreadySent: boolean;
  eventType: NotificationEventType;
  title: string;
  body: string;
}

export async function dryRunDispatch(input: DryRunInput): Promise<DryRunResult> {
  // Check idempotency — would this be a duplicate?
  const { created } = await createNotificationEvent({
    eventType: input.eventType,
    scope: input.target.scope,
    targetIds: input.target.targetIds,
    title: input.title,
    body: input.body,
    idempotencyKey: input.idempotencyKey + ":dryrun"
  });

  return {
    wouldSend: input.recipientUserIds.length,
    recipientSample: input.recipientUserIds.slice(0, 5),
    alreadySent: !created,
    eventType: input.eventType,
    title: input.title,
    body: input.body
  };
}

// ---------------------------------------------------------------------------
// Real dispatch: enqueue event → create job → fan-out deliveries + inbox
// ---------------------------------------------------------------------------

export async function dispatch(input: DispatchInput): Promise<DispatchResult> {
  // 1. Idempotent event creation
  const { created, event } = await createNotificationEvent({
    eventType: input.eventType,
    scope: input.target.scope,
    targetIds: input.target.targetIds,
    title: input.title,
    body: input.body,
    data: input.data,
    idempotencyKey: input.idempotencyKey
  });

  if (!created) {
    logServerEvent("notifications.dispatch.duplicate", { idempotencyKey: input.idempotencyKey });
    return { eventId: event.id, jobId: "", totalRecipients: 0, sent: 0, failed: 0, skippedDuplicate: true };
  }

  await updateEventStatus(event.id, "processing");

  // 2. Create job
  const job = await createNotificationJob({
    eventId: event.id,
    totalRecipients: input.recipientUserIds.length
  });
  await updateJobStatus(job.id, { status: "running" });

  const provider = getPushProvider();
  let sent = 0;
  let failed = 0;

  // 3. Fan-out per recipient
  for (const userId of input.recipientUserIds) {
    // Always mirror to inbox (regardless of push result)
    await createInboxItem({
      userId,
      eventType: input.eventType,
      title: input.title,
      body: input.body,
      idempotencyKey: `${input.idempotencyKey}:${userId}`,
      data: input.data
    });

    // Push delivery per active token
    const tokens = await listDeviceTokensForUser(userId);
    if (tokens.length === 0) {
      // No tokens — inbox-only delivery is fine
      sent++;
      continue;
    }

    for (const tokenRow of tokens) {
      const delivery = await createDelivery({ jobId: job.id, userId, tokenId: tokenRow.id });

      const result = await provider.send(tokenRow.token, {
        title: input.title,
        body: input.body,
        data: input.data
      });

      if (result.ok) {
        await updateDeliveryStatus(delivery.id, {
          status: "sent",
          providerMessageId: result.providerMessageId
        });
        sent++;
      } else if (result.invalidToken) {
        await updateDeliveryStatus(delivery.id, { status: "invalid_token", error: result.error });
        await invalidateDeviceToken(tokenRow.id);
        failed++;
      } else {
        await updateDeliveryStatus(delivery.id, { status: "failed", error: result.error });
        failed++;
      }
    }
  }

  await updateJobStatus(job.id, { status: "completed", sent, failed });
  await updateEventStatus(event.id, "completed");

  logServerEvent("notifications.dispatch.completed", {
    eventId: event.id,
    jobId: job.id,
    sent,
    failed,
    total: input.recipientUserIds.length
  });

  return { eventId: event.id, jobId: job.id, totalRecipients: input.recipientUserIds.length, sent, failed, skippedDuplicate: false };
}
