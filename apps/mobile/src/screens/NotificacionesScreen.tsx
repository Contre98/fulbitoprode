import { useCallback } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@fulbito/design-tokens";
import type { NotificationEventType, NotificationItem } from "@fulbito/domain";
import { notificationsRepository } from "@/repositories";

// ─── Icon per event type ──────────────────────────────────────────────────────

type IoniconsName = keyof typeof Ionicons.glyphMap;

const EVENT_META: Record<NotificationEventType, { icon: IoniconsName; color: string; bg: string }> = {
  prediction_lock: { icon: "lock-closed", color: "#F59E0B", bg: "#FEF3C7" },
  results_published: { icon: "trophy", color: "#10B981", bg: "#D1FAE5" },
  weekly_winner: { icon: "star", color: "#8B5CF6", bg: "#EDE9FE" },
  social: { icon: "people", color: colors.primary, bg: colors.primarySoftAlt }
};

function getEventMeta(type: NotificationEventType) {
  return EVENT_META[type] ?? { icon: "notifications" as IoniconsName, color: colors.textSecondary, bg: colors.surfaceMuted };
}

// ─── Date formatter ───────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return "ahora";
  if (diffMins < 60) return `hace ${diffMins}m`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays === 1) return "ayer";
  if (diffDays < 7) return `hace ${diffDays}d`;
  return date.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

// ─── NotificationRow ──────────────────────────────────────────────────────────

function NotificationRow({ item }: { item: NotificationItem }) {
  const meta = getEventMeta(item.type);

  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
        <Ionicons name={meta.icon} size={18} color={meta.color} />
      </View>
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text allowFontScaling={false} style={styles.rowTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text allowFontScaling={false} style={styles.rowDate}>
            {formatDate(item.createdAt)}
          </Text>
        </View>
        <Text allowFontScaling={false} style={styles.rowBody} numberOfLines={2}>
          {item.body}
        </Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </View>
  );
}

// ─── NotificacionesScreen ─────────────────────────────────────────────────────

export function NotificacionesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["notifications-inbox"],
    queryFn: () => notificationsRepository.listInbox()
  });

  const items = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const handleMarkAllRead = useCallback(async () => {
    if (unreadCount === 0) return;
    await notificationsRepository.markAllRead();
    await queryClient.invalidateQueries({ queryKey: ["notifications-inbox"] });
  }, [unreadCount, queryClient]);

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.iconStrong} />
        </Pressable>
        <View style={styles.headerText}>
          <Text allowFontScaling={false} style={styles.headerTitle}>Notificaciones</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text allowFontScaling={false} style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <Pressable onPress={handleMarkAllRead} hitSlop={8} style={styles.markReadBtn}>
            <Text allowFontScaling={false} style={styles.markReadText}>Marcar leídas</Text>
          </Pressable>
        )}
      </View>

      {/* Body */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="notifications-off-outline" size={44} color={colors.textSoft} />
          <Text allowFontScaling={false} style={styles.emptyTitle}>Sin notificaciones</Text>
          <Text allowFontScaling={false} style={styles.emptyBody}>
            Te avisaremos cuando haya novedades.
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
        >
          {items.map((item, idx) => (
            <View key={item.id}>
              <NotificationRow item={item} />
              {idx < items.length - 1 && <View style={styles.separator} />}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.canvas
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 10
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center"
  },
  headerText: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.textTitle
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: colors.textTitle
  },
  markReadBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surface
  },
  markReadText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.textSecondary
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingBottom: 60
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: colors.textPrimary
  },
  emptyBody: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textMuted,
    textAlign: "center",
    paddingHorizontal: 32
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 4
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 16
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  rowContent: {
    flex: 1,
    gap: 3
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  rowTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    color: colors.textPrimary
  },
  rowDate: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSoft,
    flexShrink: 0
  },
  rowBody: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    lineHeight: 18
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 5,
    flexShrink: 0
  },
  separator: {
    height: 6
  }
});
