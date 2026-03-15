import { getPocketBaseConfig } from "./pocketbase";
import type {
  NotificationEventType,
  NotificationPreferences,
  NotificationEventStatus,
  NotificationTargetScope,
  NotificationJobStatus,
  NotificationDeliveryStatus
} from "@fulbito/domain";

// ---------------------------------------------------------------------------
// PocketBase request helpers (mirror of m3-repo pattern)
// ---------------------------------------------------------------------------

interface PbListResult<T> {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
  items: T[];
}

function requirePbUrl() {
  const config = getPocketBaseConfig();
  if (!config.configured) {
    throw new Error("PocketBase is not configured. Set POCKETBASE_URL");
  }
  return config.url;
}

async function pbRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${requirePbUrl()}${path}`;
  const headers = new Headers(init.headers || {});
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, { ...init, headers, cache: "no-store" });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PocketBase ${response.status}: ${errorText}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

function q(value: string) {
  return `'${value.replace(/'/g, "\\'")}'`;
}

// ---------------------------------------------------------------------------
// PocketBase row shapes (snake_case, mirrors collection schemas)
// ---------------------------------------------------------------------------

interface PbDeviceTokenRow {
  id: string;
  user_id: string;
  token: string;
  platform: string;
  provider: string;
  app_version?: string;
  registered_at: string;
  last_seen_at: string;
  invalidated_at?: string;
  created: string;
  updated: string;
}

interface PbPreferencesRow {
  id: string;
  user_id: string;
  reminders: boolean;
  results: boolean;
  social: boolean;
  created: string;
  updated: string;
}

interface PbInboxRow {
  id: string;
  user_id: string;
  event_type: string;
  title: string;
  body: string;
  read: boolean;
  idempotency_key?: string;
  data_json?: string;
  created: string;
  updated: string;
}

interface PbEventRow {
  id: string;
  event_type: string;
  scope: string;
  target_ids_json?: string;
  title: string;
  body: string;
  data_json?: string;
  idempotency_key: string;
  status: string;
  processed_at?: string;
  created: string;
  updated: string;
}

interface PbJobRow {
  id: string;
  event_id: string;
  status: string;
  total_recipients: number;
  sent: number;
  failed: number;
  started_at?: string;
  completed_at?: string;
  error?: string;
  created: string;
  updated: string;
}

interface PbDeliveryRow {
  id: string;
  job_id: string;
  user_id: string;
  token_id: string;
  status: string;
  attempts: number;
  last_attempt_at?: string;
  provider_message_id?: string;
  error?: string;
  created: string;
  updated: string;
}

// ---------------------------------------------------------------------------
// Device tokens
// ---------------------------------------------------------------------------

export async function upsertDeviceToken(input: {
  userId: string;
  token: string;
  platform: string;
  provider: string;
  appVersion?: string;
}) {
  const now = new Date().toISOString();
  const filter = `user_id=${q(input.userId)} && token=${q(input.token)}`;
  const existing = await pbRequest<PbListResult<PbDeviceTokenRow>>(
    `/api/collections/notification_device_tokens/records?filter=${encodeURIComponent(filter)}&perPage=1`
  );

  if (existing.items.length > 0) {
    const row = existing.items[0];
    return pbRequest<PbDeviceTokenRow>(
      `/api/collections/notification_device_tokens/records/${row.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          platform: input.platform,
          provider: input.provider,
          app_version: input.appVersion || row.app_version || "",
          last_seen_at: now,
          invalidated_at: ""
        })
      }
    );
  }

  return pbRequest<PbDeviceTokenRow>(
    "/api/collections/notification_device_tokens/records",
    {
      method: "POST",
      body: JSON.stringify({
        user_id: input.userId,
        token: input.token,
        platform: input.platform,
        provider: input.provider,
        app_version: input.appVersion || "",
        registered_at: now,
        last_seen_at: now
      })
    }
  );
}

export async function listDeviceTokensForUser(userId: string) {
  const filter = `user_id=${q(userId)} && invalidated_at=""`;
  const result = await pbRequest<PbListResult<PbDeviceTokenRow>>(
    `/api/collections/notification_device_tokens/records?filter=${encodeURIComponent(filter)}&perPage=20&sort=-last_seen_at`
  );
  return result.items;
}

export async function invalidateDeviceToken(tokenId: string) {
  return pbRequest<PbDeviceTokenRow>(
    `/api/collections/notification_device_tokens/records/${tokenId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ invalidated_at: new Date().toISOString() })
    }
  );
}

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

export async function getPreferencesRecord(userId: string): Promise<PbPreferencesRow | null> {
  const filter = `user_id=${q(userId)}`;
  const result = await pbRequest<PbListResult<PbPreferencesRow>>(
    `/api/collections/notification_preferences/records?filter=${encodeURIComponent(filter)}&perPage=1`
  );
  return result.items[0] || null;
}

export async function upsertPreferences(
  userId: string,
  input: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const existing = await getPreferencesRecord(userId);

  const merged: NotificationPreferences = {
    reminders: input.reminders ?? existing?.reminders ?? true,
    results: input.results ?? existing?.results ?? true,
    social: input.social ?? existing?.social ?? true
  };

  if (existing) {
    await pbRequest<PbPreferencesRow>(
      `/api/collections/notification_preferences/records/${existing.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          reminders: merged.reminders,
          results: merged.results,
          social: merged.social
        })
      }
    );
  } else {
    await pbRequest<PbPreferencesRow>(
      "/api/collections/notification_preferences/records",
      {
        method: "POST",
        body: JSON.stringify({
          user_id: userId,
          reminders: merged.reminders,
          results: merged.results,
          social: merged.social
        })
      }
    );
  }

  return merged;
}

// ---------------------------------------------------------------------------
// Inbox
// ---------------------------------------------------------------------------

export async function listInboxItems(userId: string, limit = 200) {
  const filter = `user_id=${q(userId)}`;
  const result = await pbRequest<PbListResult<PbInboxRow>>(
    `/api/collections/notification_inbox/records?filter=${encodeURIComponent(filter)}&perPage=${limit}&sort=-created`
  );
  return result.items;
}

export async function countUnreadInbox(userId: string) {
  const filter = `user_id=${q(userId)} && read=false`;
  const result = await pbRequest<PbListResult<PbInboxRow>>(
    `/api/collections/notification_inbox/records?filter=${encodeURIComponent(filter)}&perPage=1`
  );
  return result.totalItems;
}

export async function createInboxItem(input: {
  userId: string;
  eventType: NotificationEventType;
  title: string;
  body: string;
  idempotencyKey?: string;
  data?: Record<string, unknown>;
}) {
  if (input.idempotencyKey) {
    const filter = `user_id=${q(input.userId)} && idempotency_key=${q(input.idempotencyKey)}`;
    const existing = await pbRequest<PbListResult<PbInboxRow>>(
      `/api/collections/notification_inbox/records?filter=${encodeURIComponent(filter)}&perPage=1`
    );
    if (existing.items.length > 0) {
      return existing.items[0];
    }
  }

  return pbRequest<PbInboxRow>(
    "/api/collections/notification_inbox/records",
    {
      method: "POST",
      body: JSON.stringify({
        user_id: input.userId,
        event_type: input.eventType,
        title: input.title,
        body: input.body,
        read: false,
        idempotency_key: input.idempotencyKey || "",
        data_json: input.data ? JSON.stringify(input.data) : ""
      })
    }
  );
}

export async function markAllInboxRead(userId: string) {
  const filter = `user_id=${q(userId)} && read=false`;
  const result = await pbRequest<PbListResult<PbInboxRow>>(
    `/api/collections/notification_inbox/records?filter=${encodeURIComponent(filter)}&perPage=200`
  );

  for (const item of result.items) {
    await pbRequest<PbInboxRow>(
      `/api/collections/notification_inbox/records/${item.id}`,
      { method: "PATCH", body: JSON.stringify({ read: true }) }
    );
  }

  return result.items.length;
}

export async function dismissInboxItem(userId: string, notificationId: string): Promise<boolean> {
  const filter = `id=${q(notificationId)} && user_id=${q(userId)}`;
  const result = await pbRequest<PbListResult<PbInboxRow>>(
    `/api/collections/notification_inbox/records?filter=${encodeURIComponent(filter)}&perPage=1`
  );

  const row = result.items[0];
  if (!row) {
    return false;
  }

  let data: Record<string, unknown> = {};
  if (typeof row.data_json === "string" && row.data_json.trim().length > 0) {
    try {
      const parsed = JSON.parse(row.data_json) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        data = parsed as Record<string, unknown>;
      }
    } catch {
      // Ignore malformed JSON payloads and override with a normalized dismissal payload.
    }
  }

  await pbRequest<PbInboxRow>(`/api/collections/notification_inbox/records/${row.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      read: true,
      data_json: JSON.stringify({
        ...data,
        dismissed: true,
        dismissedAt: new Date().toISOString()
      })
    })
  });
  return true;
}

// ---------------------------------------------------------------------------
// Notification events (outbox)
// ---------------------------------------------------------------------------

export async function createNotificationEvent(input: {
  eventType: NotificationEventType;
  scope: NotificationTargetScope;
  targetIds?: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  idempotencyKey: string;
}) {
  const filter = `idempotency_key=${q(input.idempotencyKey)}`;
  const existing = await pbRequest<PbListResult<PbEventRow>>(
    `/api/collections/notification_events/records?filter=${encodeURIComponent(filter)}&perPage=1`
  );

  if (existing.items.length > 0) {
    return { created: false, event: existing.items[0] };
  }

  const event = await pbRequest<PbEventRow>(
    "/api/collections/notification_events/records",
    {
      method: "POST",
      body: JSON.stringify({
        event_type: input.eventType,
        scope: input.scope,
        target_ids_json: input.targetIds ? JSON.stringify(input.targetIds) : "",
        title: input.title,
        body: input.body,
        data_json: input.data ? JSON.stringify(input.data) : "",
        idempotency_key: input.idempotencyKey,
        status: "pending" satisfies NotificationEventStatus
      })
    }
  );

  return { created: true, event };
}

export async function listPendingEvents(limit = 20) {
  const filter = `status=${"'pending'"}`;
  const result = await pbRequest<PbListResult<PbEventRow>>(
    `/api/collections/notification_events/records?filter=${encodeURIComponent(filter)}&perPage=${limit}&sort=created`
  );
  return result.items;
}

export async function updateEventStatus(eventId: string, status: NotificationEventStatus) {
  const patch: Record<string, unknown> = { status };
  if (status === "completed" || status === "failed") {
    patch.processed_at = new Date().toISOString();
  }
  return pbRequest<PbEventRow>(
    `/api/collections/notification_events/records/${eventId}`,
    { method: "PATCH", body: JSON.stringify(patch) }
  );
}

// ---------------------------------------------------------------------------
// Notification jobs
// ---------------------------------------------------------------------------

export async function createNotificationJob(input: {
  eventId: string;
  totalRecipients: number;
}) {
  return pbRequest<PbJobRow>(
    "/api/collections/notification_jobs/records",
    {
      method: "POST",
      body: JSON.stringify({
        event_id: input.eventId,
        status: "queued" satisfies NotificationJobStatus,
        total_recipients: input.totalRecipients,
        sent: 0,
        failed: 0
      })
    }
  );
}

export async function updateJobStatus(
  jobId: string,
  update: {
    status?: NotificationJobStatus;
    sent?: number;
    failed?: number;
    error?: string;
  }
) {
  const patch: Record<string, unknown> = {};
  if (update.status) patch.status = update.status;
  if (update.sent !== undefined) patch.sent = update.sent;
  if (update.failed !== undefined) patch.failed = update.failed;
  if (update.error !== undefined) patch.error = update.error;

  if (update.status === "running") patch.started_at = new Date().toISOString();
  if (update.status === "completed" || update.status === "failed") {
    patch.completed_at = new Date().toISOString();
  }

  return pbRequest<PbJobRow>(
    `/api/collections/notification_jobs/records/${jobId}`,
    { method: "PATCH", body: JSON.stringify(patch) }
  );
}

export async function getJob(jobId: string) {
  return pbRequest<PbJobRow>(
    `/api/collections/notification_jobs/records/${jobId}`
  );
}

// ---------------------------------------------------------------------------
// Notification deliveries
// ---------------------------------------------------------------------------

export async function createDelivery(input: {
  jobId: string;
  userId: string;
  tokenId: string;
}) {
  return pbRequest<PbDeliveryRow>(
    "/api/collections/notification_deliveries/records",
    {
      method: "POST",
      body: JSON.stringify({
        job_id: input.jobId,
        user_id: input.userId,
        token_id: input.tokenId,
        status: "pending" satisfies NotificationDeliveryStatus,
        attempts: 0
      })
    }
  );
}

export async function updateDeliveryStatus(
  deliveryId: string,
  update: {
    status: NotificationDeliveryStatus;
    providerMessageId?: string;
    error?: string;
  }
) {
  return pbRequest<PbDeliveryRow>(
    `/api/collections/notification_deliveries/records/${deliveryId}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        status: update.status,
        attempts: { "+": 1 },
        last_attempt_at: new Date().toISOString(),
        provider_message_id: update.providerMessageId || "",
        error: update.error || ""
      })
    }
  );
}

// ---------------------------------------------------------------------------
// Helpers: check if PocketBase notifications collections are available
// ---------------------------------------------------------------------------

export async function isNotificationsPersistenceAvailable(): Promise<boolean> {
  try {
    const config = getPocketBaseConfig();
    if (!config.configured) return false;
    await pbRequest<PbListResult<PbPreferencesRow>>(
      "/api/collections/notification_preferences/records?perPage=1"
    );
    return true;
  } catch {
    return false;
  }
}
