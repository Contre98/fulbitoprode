import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, PanResponder, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { colors } from "@fulbito/design-tokens";
import type { NotificationEventType, NotificationItem } from "@fulbito/domain";
import { notificationsRepository } from "@/repositories";
import { useNotificationsOverlay } from "@/state/NotificationsOverlayContext";

type IoniconsName = keyof typeof Ionicons.glyphMap;

const EVENT_META: Partial<Record<NotificationEventType, { icon: IoniconsName; color: string; bg: string }>> = {
  prediction_lock: { icon: "lock-closed", color: "#F59E0B", bg: "#FEF3C7" },
  results_published: { icon: "trophy", color: "#10B981", bg: "#D1FAE5" },
  weekly_winner: { icon: "star", color: "#8B5CF6", bg: "#EDE9FE" },
  social: { icon: "people", color: colors.primaryDeep, bg: colors.primarySoftAlt },
  join_request: { icon: "person-add", color: "#F59E0B", bg: "#FEF3C7" },
  join_request_approved: { icon: "checkmark-circle", color: "#10B981", bg: "#D1FAE5" },
  join_request_rejected: { icon: "close-circle", color: "#EF4444", bg: "#FEE2E2" }
};

function getEventMeta(type: NotificationEventType) {
  return EVENT_META[type] ?? { icon: "notifications", color: colors.textSecondary, bg: colors.surfaceMuted };
}

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

function NotificationBubble({ item, onDismiss }: { item: NotificationItem; onDismiss: (id: string) => void }) {
  const meta = getEventMeta(item.type);
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 8 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderMove: (_, gestureState) => {
          const clamped = Math.max(-180, Math.min(180, gestureState.dx));
          translateX.setValue(clamped);
        },
        onPanResponderRelease: (_, gestureState) => {
          const shouldDismiss = Math.abs(gestureState.dx) > 84 || Math.abs(gestureState.vx) > 0.85;
          if (!shouldDismiss) {
            Animated.spring(translateX, {
              toValue: 0,
              speed: 25,
              bounciness: 0,
              useNativeDriver: true
            }).start();
            return;
          }

          const direction = gestureState.dx >= 0 ? 1 : -1;
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: direction * 320,
              duration: 170,
              useNativeDriver: true
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 150,
              useNativeDriver: true
            })
          ]).start(({ finished }) => {
            if (finished) {
              onDismiss(item.id);
            }
          });
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateX, {
            toValue: 0,
            speed: 24,
            bounciness: 0,
            useNativeDriver: true
          }).start();
        }
      }),
    [item.id, onDismiss, opacity, translateX]
  );

  return (
    <Animated.View
      style={[
        styles.bubble,
        !item.read && styles.bubbleUnread,
        {
          opacity,
          transform: [{ translateX }]
        }
      ]}
      {...panResponder.panHandlers}
    >
      <View style={[styles.bubbleIcon, { backgroundColor: meta.bg }]}>
        <Ionicons name={meta.icon} size={16} color={meta.color} />
      </View>
      <View style={styles.bubbleBody}>
        <View style={styles.bubbleTopRow}>
          <Text allowFontScaling={false} numberOfLines={1} style={styles.bubbleTitle}>{item.title}</Text>
          <Text allowFontScaling={false} style={styles.bubbleDate}>{formatDate(item.createdAt)}</Text>
        </View>
        <Text allowFontScaling={false} numberOfLines={2} style={styles.bubbleText}>{item.body}</Text>
      </View>
      {!item.read ? <View style={styles.unreadDot} /> : null}
    </Animated.View>
  );
}

export function NotificationsBubbleOverlay() {
  const insets = useSafeAreaInsets();
  const { visible, hide } = useNotificationsOverlay();
  const queryClient = useQueryClient();
  const { height } = useWindowDimensions();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["notifications-inbox"],
    queryFn: () => notificationsRepository.listInbox()
  });

  const items = data?.items ?? [];
  const visibleItems = useMemo(() => items.filter((item) => !dismissedIds.has(item.id)), [dismissedIds, items]);
  const unreadCount = useMemo(() => visibleItems.filter((item) => !item.read).length, [visibleItems]);
  const maxListHeight = useMemo(() => Math.max(220, height - insets.top - insets.bottom - 130), [height, insets.bottom, insets.top]);

  useEffect(() => {
    if (dismissedIds.size === 0) return;
    const activeIds = new Set(items.map((item) => item.id));
    setDismissedIds((prev) => {
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (activeIds.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [dismissedIds.size, items]);

  const handleDismiss = useCallback((id: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    void (async () => {
      try {
        await notificationsRepository.dismissNotification({ notificationId: id });
        await queryClient.invalidateQueries({ queryKey: ["notifications-inbox"] });
      } catch {
        // Keep it dismissed locally even if persistence fails to avoid reappearing cards.
      }
    })();
  }, [queryClient]);

  const handleMarkAllRead = useCallback(async () => {
    if (unreadCount === 0) return;
    await notificationsRepository.markAllRead();
    await queryClient.invalidateQueries({ queryKey: ["notifications-inbox"] });
  }, [queryClient, unreadCount]);

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  if (!visible) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={styles.overlayRoot}>
      <Pressable style={styles.overlayBackdrop} onPress={hide} />
      <View pointerEvents="box-none" style={[styles.overlayLayer, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.floatingTopBar}>
          <View style={styles.headerRow}>
            <View style={styles.headerTitleWrap}>
              <Text allowFontScaling={false} style={styles.headerTitle}>Notificaciones</Text>
              {unreadCount > 0 ? (
                <View style={styles.badge}>
                  <Text allowFontScaling={false} style={styles.badgeText}>
                    {unreadCount > 9 ? "9+" : String(unreadCount)}
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={styles.headerActions}>
              {unreadCount > 0 ? (
                <Pressable hitSlop={6} onPress={() => void handleMarkAllRead()} style={styles.markReadBtn}>
                  <Text allowFontScaling={false} style={styles.markReadText}>Marcar</Text>
                </Pressable>
              ) : null}
              <Pressable hitSlop={6} onPress={hide} style={styles.closeBtn}>
                <Ionicons name="close" size={17} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="small" color="#D9F99D" />
          </View>
        ) : (
          <ScrollView
            style={[styles.list, { maxHeight: maxListHeight }]}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={handleRefresh}
                tintColor="#D9F99D"
              />
            }
          >
            {visibleItems.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="notifications-off-outline" size={28} color={colors.textSoft} />
                <Text allowFontScaling={false} style={styles.emptyTitle}>Sin novedades</Text>
                <Text allowFontScaling={false} style={styles.emptyBody}>Deslizá izquierda o derecha para descartar.</Text>
              </View>
            ) : (
              visibleItems.map((item) => (
                <NotificationBubble key={item.id} item={item} onDismiss={handleDismiss} />
              ))
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 80
  },
  overlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(6, 10, 18, 0.72)"
  },
  overlayLayer: {
    flex: 1,
    paddingHorizontal: 14,
    gap: 12
  },
  floatingTopBar: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 8,
    paddingHorizontal: 14,
    paddingVertical: 11
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.textTitle
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryDeep
  },
  badgeText: {
    color: colors.textInverse,
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 13
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  markReadBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: "rgba(182, 217, 0, 0.22)"
  },
  markReadText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.textPrimary
  },
  closeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)"
  },
  list: {
    flexGrow: 0
  },
  listContent: {
    gap: 12,
    paddingBottom: 22
  },
  centered: {
    backgroundColor: "rgba(17, 24, 39, 0.9)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 6
  },
  emptyWrap: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderMutedSoft,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 24,
    paddingHorizontal: 14
  },
  emptyTitle: {
    color: colors.textTitle,
    fontSize: 15,
    fontWeight: "800"
  },
  emptyBody: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center"
  },
  bubble: {
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: "#D8DEE7",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8
  },
  bubbleUnread: {
    borderColor: colors.primaryDeep,
    backgroundColor: "#FCFFE8"
  },
  bubbleIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  bubbleBody: {
    flex: 1,
    gap: 3
  },
  bubbleTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  bubbleTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "800"
  },
  bubbleDate: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSoft
  },
  bubbleText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
    color: colors.textBody
  },
  unreadDot: {
    marginTop: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primaryDeep
  }
});
