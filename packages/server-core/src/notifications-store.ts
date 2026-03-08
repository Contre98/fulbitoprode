import type { NotificationItem, NotificationPreferences } from "./types";

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

export function getNotificationPreferences(userId: string) {
  return preferencesByUserId.get(userId) || { ...DEFAULT_PREFERENCES };
}

export function setNotificationPreferences(userId: string, input: Partial<NotificationPreferences>) {
  const next: NotificationPreferences = {
    ...getNotificationPreferences(userId),
    ...input
  };
  preferencesByUserId.set(userId, next);
  return next;
}

export function listNotifications(userId: string) {
  return [...(inboxByUserId.get(userId) || [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function addNotification(
  userId: string,
  input: Omit<NotificationItem, "id" | "read" | "createdAt"> & { createdAt?: string; read?: boolean }
) {
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

export function markAllNotificationsRead(userId: string) {
  const rows = inboxByUserId.get(userId) || [];
  inboxByUserId.set(
    userId,
    rows.map((item) => ({
      ...item,
      read: true
    }))
  );
}

export function unreadNotificationCount(userId: string) {
  return listNotifications(userId).filter((item) => !item.read).length;
}

export function registerDeviceToken(userId: string, input: { token: string; platform: string }) {
  const rows = deviceTokensByUserId.get(userId) || [];
  const exists = rows.some((row) => row.token === input.token);
  if (exists) {
    return;
  }
  rows.push({
    token: input.token,
    platform: input.platform,
    registeredAt: new Date().toISOString()
  });
  deviceTokensByUserId.set(userId, rows);
}

export function seedNotificationIfEmpty(userId: string) {
  if ((inboxByUserId.get(userId) || []).length > 0) {
    return;
  }
  addNotification(userId, {
    type: "weekly_winner",
    title: "Ganador semanal disponible",
    body: "Ya podés ver quién ganó la última fecha en tu grupo."
  });
}
