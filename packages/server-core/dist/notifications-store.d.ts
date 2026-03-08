import type { NotificationItem, NotificationPreferences } from "./types";
export declare function getNotificationPreferences(userId: string): NotificationPreferences;
export declare function setNotificationPreferences(userId: string, input: Partial<NotificationPreferences>): NotificationPreferences;
export declare function listNotifications(userId: string): NotificationItem[];
export declare function addNotification(userId: string, input: Omit<NotificationItem, "id" | "read" | "createdAt"> & {
    createdAt?: string;
    read?: boolean;
}): NotificationItem;
export declare function markAllNotificationsRead(userId: string): void;
export declare function unreadNotificationCount(userId: string): number;
export declare function registerDeviceToken(userId: string, input: {
    token: string;
    platform: string;
}): void;
export declare function seedNotificationIfEmpty(userId: string): void;
