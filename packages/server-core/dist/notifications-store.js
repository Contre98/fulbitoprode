const DEFAULT_PREFERENCES = {
    reminders: true,
    results: true,
    social: true
};
const preferencesByUserId = new Map();
const inboxByUserId = new Map();
const deviceTokensByUserId = new Map();
function nextId() {
    return `notif-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
export function getNotificationPreferences(userId) {
    return preferencesByUserId.get(userId) || { ...DEFAULT_PREFERENCES };
}
export function setNotificationPreferences(userId, input) {
    const next = {
        ...getNotificationPreferences(userId),
        ...input
    };
    preferencesByUserId.set(userId, next);
    return next;
}
export function listNotifications(userId) {
    return [...(inboxByUserId.get(userId) || [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
export function addNotification(userId, input) {
    const rows = inboxByUserId.get(userId) || [];
    const next = {
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
export function markAllNotificationsRead(userId) {
    const rows = inboxByUserId.get(userId) || [];
    inboxByUserId.set(userId, rows.map((item) => ({
        ...item,
        read: true
    })));
}
export function unreadNotificationCount(userId) {
    return listNotifications(userId).filter((item) => !item.read).length;
}
export function registerDeviceToken(userId, input) {
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
export function seedNotificationIfEmpty(userId) {
    if ((inboxByUserId.get(userId) || []).length > 0) {
        return;
    }
    addNotification(userId, {
        type: "weekly_winner",
        title: "Ganador semanal disponible",
        body: "Ya podés ver quién ganó la última fecha en tu grupo."
    });
}
