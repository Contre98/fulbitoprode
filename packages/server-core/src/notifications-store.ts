import type { NotificationItem, NotificationPreferences, NotificationEventType } from "@fulbito/domain";
import {
  upsertDeviceToken as pbUpsertDeviceToken,
  getPreferencesRecord,
  upsertPreferences as pbUpsertPreferences,
  listInboxItems,
  countUnreadInbox,
  createInboxItem,
  markAllInboxRead,
  isNotificationsPersistenceAvailable
} from "./notifications-repo";

// ---------------------------------------------------------------------------
// In-memory fallback (same as before, used when PocketBase is unavailable)
// ---------------------------------------------------------------------------

const DEFAULT_PREFERENCES: NotificationPreferences = {
  reminders: true,
  results: true,
  social: true
};

const preferencesByUserId = new Map<string, NotificationPreferences>();
const inboxByUserId = new Map<string, NotificationItem[]>();
const deviceTokensByUserId = new Map<string, Array<{ token: string; platform: string; registeredAt: string }>>();

function nextId() {
  return `notif-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---------------------------------------------------------------------------
// Persistence mode detection (cached after first check)
// ---------------------------------------------------------------------------

let warnedFallback = false;

async function resolvePersistenceMode(): Promise<"pocketbase" | "memory"> {
  const envMode = process.env.FULBITO_NOTIFICATIONS_MODE?.trim().toLowerCase();
  if (envMode === "memory") return "memory";

  const available = await isNotificationsPersistenceAvailable();

  if (!available && !warnedFallback) {
    warnedFallback = true;
    console.warn("[notifications-store] PocketBase notification collections not available, using in-memory fallback");
  }

  return available ? "pocketbase" : "memory";
}

function warnPbFallback(action: string, error: unknown) {
  if (warnedFallback) return;
  warnedFallback = true;
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[notifications-store] ${action} failed in PocketBase, using in-memory fallback: ${message}`);
}

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const mode = await resolvePersistenceMode();

  if (mode === "pocketbase") {
    try {
      const record = await getPreferencesRecord(userId);
      if (!record) return { ...DEFAULT_PREFERENCES };
      return {
        reminders: record.reminders,
        results: record.results,
        social: record.social
      };
    } catch (error) {
      warnPbFallback("getPreferences", error);
    }
  }

  return preferencesByUserId.get(userId) || { ...DEFAULT_PREFERENCES };
}

export async function setNotificationPreferences(
  userId: string,
  input: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const mode = await resolvePersistenceMode();

  if (mode === "pocketbase") {
    try {
      return await pbUpsertPreferences(userId, input);
    } catch (error) {
      warnPbFallback("setPreferences", error);
    }
  }

  const current = preferencesByUserId.get(userId) || { ...DEFAULT_PREFERENCES };
  const next: NotificationPreferences = { ...current, ...input };
  preferencesByUserId.set(userId, next);
  return next;
}

// ---------------------------------------------------------------------------
// Inbox
// ---------------------------------------------------------------------------

export async function listNotifications(userId: string): Promise<NotificationItem[]> {
  const mode = await resolvePersistenceMode();

  if (mode === "pocketbase") {
    try {
      const rows = await listInboxItems(userId);
      return rows.map((row) => ({
        id: row.id,
        type: row.event_type as NotificationEventType,
        title: row.title,
        body: row.body,
        createdAt: row.created || new Date().toISOString(),
        read: row.read
      }));
    } catch (error) {
      warnPbFallback("listNotifications", error);
    }
  }

  return [...(inboxByUserId.get(userId) || [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function addNotification(
  userId: string,
  input: Omit<NotificationItem, "id" | "read" | "createdAt"> & {
    createdAt?: string;
    read?: boolean;
    idempotencyKey?: string;
  }
): Promise<NotificationItem> {
  const mode = await resolvePersistenceMode();

  if (mode === "pocketbase") {
    try {
      const row = await createInboxItem({
        userId,
        eventType: input.type,
        title: input.title,
        body: input.body,
        idempotencyKey: input.idempotencyKey
      });
      return {
        id: row.id,
        type: row.event_type as NotificationEventType,
        title: row.title,
        body: row.body,
        createdAt: row.created || new Date().toISOString(),
        read: row.read
      };
    } catch (error) {
      warnPbFallback("addNotification", error);
    }
  }

  const rows = inboxByUserId.get(userId) || [];
  const next: NotificationItem = {
    id: nextId(),
    type: input.type,
    title: input.title,
    body: input.body,
    createdAt: input.createdAt || new Date().toISOString(),
    read: input.read ?? false
  };
  inboxByUserId.set(userId, [next, ...rows]);
  return next;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const mode = await resolvePersistenceMode();

  if (mode === "pocketbase") {
    try {
      await markAllInboxRead(userId);
      return;
    } catch (error) {
      warnPbFallback("markAllRead", error);
    }
  }

  const rows = inboxByUserId.get(userId) || [];
  inboxByUserId.set(
    userId,
    rows.map((item) => ({ ...item, read: true }))
  );
}

export async function unreadNotificationCount(userId: string): Promise<number> {
  const mode = await resolvePersistenceMode();

  if (mode === "pocketbase") {
    try {
      return await countUnreadInbox(userId);
    } catch (error) {
      warnPbFallback("unreadCount", error);
    }
  }

  return (inboxByUserId.get(userId) || []).filter((item) => !item.read).length;
}

// ---------------------------------------------------------------------------
// Device tokens
// ---------------------------------------------------------------------------

export async function registerDeviceToken(
  userId: string,
  input: { token: string; platform: string; provider?: string; appVersion?: string }
): Promise<void> {
  const mode = await resolvePersistenceMode();

  if (mode === "pocketbase") {
    try {
      await pbUpsertDeviceToken({
        userId,
        token: input.token,
        platform: input.platform,
        provider: input.provider || "synthetic",
        appVersion: input.appVersion
      });
      return;
    } catch (error) {
      warnPbFallback("registerDeviceToken", error);
    }
  }

  const rows = deviceTokensByUserId.get(userId) || [];
  const exists = rows.some((row) => row.token === input.token);
  if (exists) return;
  rows.push({
    token: input.token,
    platform: input.platform,
    registeredAt: new Date().toISOString()
  });
  deviceTokensByUserId.set(userId, rows);
}

// ---------------------------------------------------------------------------
// Seed (convenience for dev/demo)
// ---------------------------------------------------------------------------

export async function seedNotificationIfEmpty(userId: string): Promise<void> {
  const items = await listNotifications(userId);
  if (items.length > 0) return;

  await addNotification(userId, {
    type: "weekly_winner",
    title: "Ganador semanal disponible",
    body: "Ya podés ver quién ganó la última fecha en tu grupo."
  });
}
