import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated as NativeAnimated, PanResponder, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getColors } from "@fulbito/design-tokens";
import type { ColorTokens } from "@fulbito/design-tokens";
import Animated, { runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import type { NotificationEventType, NotificationItem } from "@fulbito/domain";
import { notificationsRepository } from "@/repositories";
import { usePressScale } from "@/lib/usePressScale";
import { useNotificationsOverlay } from "@/state/NotificationsOverlayContext";
import { useThemeColors } from "@/theme/useThemeColors";

let activeColors: ColorTokens = getColors("light");
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const OVERLAY_OPEN_SPRING = {
  damping: 22,
  stiffness: 300,
  mass: 0.52
} as const;
const OVERLAY_CLOSE_TIMING_MS = 120;

type IoniconsName = keyof typeof Ionicons.glyphMap;

function getEventMeta(type: NotificationEventType) {
  const eventMeta: Partial<Record<NotificationEventType, { icon: IoniconsName; color: string; bg: string }>> = {
    prediction_lock: { icon: "lock-closed", color: activeColors.warningDeep, bg: activeColors.surfaceTintWarning },
    results_published: { icon: "trophy", color: activeColors.successDeep, bg: activeColors.brandTintSoft },
    weekly_winner: { icon: "star", color: activeColors.trophyDeep, bg: activeColors.surfaceTintWarm },
    social: { icon: "people", color: activeColors.primaryDeep, bg: activeColors.primarySoftAlt },
    join_request: { icon: "person-add", color: activeColors.warningDeep, bg: activeColors.surfaceTintWarning },
    join_request_approved: { icon: "checkmark-circle", color: activeColors.successDeep, bg: activeColors.brandTintSoft },
    join_request_rejected: { icon: "close-circle", color: activeColors.dangerAccent, bg: activeColors.surfaceTintDangerSoft }
  };
  return eventMeta[type] ?? { icon: "notifications", color: activeColors.textSecondary, bg: activeColors.surfaceMuted };
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
  const translateX = useRef(new NativeAnimated.Value(0)).current;
  const opacity = useRef(new NativeAnimated.Value(1)).current;

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
            NativeAnimated.spring(translateX, {
              toValue: 0,
              speed: 25,
              bounciness: 0,
              useNativeDriver: true
            }).start();
            return;
          }

          const direction = gestureState.dx >= 0 ? 1 : -1;
          NativeAnimated.parallel([
            NativeAnimated.timing(translateX, {
              toValue: direction * 320,
              duration: 170,
              useNativeDriver: true
            }),
            NativeAnimated.timing(opacity, {
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
          NativeAnimated.spring(translateX, {
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
    <NativeAnimated.View
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
    </NativeAnimated.View>
  );
}

export function NotificationsBubbleOverlay() {
  const themeColors = useThemeColors();
  activeColors = themeColors;
  styles = useMemo(() => createStyles(), [themeColors]);
  const insets = useSafeAreaInsets();
  const { visible, hide } = useNotificationsOverlay();
  const reducedMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const { height } = useWindowDimensions();
  const [overlayMounted, setOverlayMounted] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const overlayProgress = useSharedValue(0);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["notifications-inbox"],
    queryFn: () => notificationsRepository.listInbox()
  });

  const items = data?.items ?? [];
  const visibleItems = useMemo(() => items.filter((item) => !dismissedIds.has(item.id)), [dismissedIds, items]);
  const unreadCount = useMemo(() => visibleItems.filter((item) => !item.read).length, [visibleItems]);
  const maxListHeight = useMemo(() => Math.max(220, height - insets.top - insets.bottom - 130), [height, insets.bottom, insets.top]);
  const markReadPress = usePressScale(0.97, unreadCount === 0);
  const closePress = usePressScale(0.93);
  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayProgress.value
  }));
  const layerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayProgress.value,
    transform: [
      { translateY: (1 - overlayProgress.value) * -10 },
      { scale: 0.985 + overlayProgress.value * 0.015 }
    ]
  }));

  useEffect(() => {
    if (visible) {
      setOverlayMounted(true);
      if (reducedMotion) {
        overlayProgress.value = 1;
        return;
      }
      overlayProgress.value = 0;
      overlayProgress.value = withSpring(1, OVERLAY_OPEN_SPRING);
      return;
    }
    if (!overlayMounted) {
      return;
    }
    if (reducedMotion) {
      overlayProgress.value = 0;
      setOverlayMounted(false);
      return;
    }
    overlayProgress.value = withTiming(0, { duration: OVERLAY_CLOSE_TIMING_MS }, (finished) => {
      if (finished) {
        runOnJS(setOverlayMounted)(false);
      }
    });
  }, [overlayMounted, overlayProgress, reducedMotion, visible]);

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

  if (!overlayMounted) {
    return null;
  }

  return (
    <View pointerEvents={visible ? "box-none" : "none"} style={styles.overlayRoot}>
      <Animated.View pointerEvents="none" style={[styles.overlayBackdrop, backdropAnimatedStyle]} />
      <Pressable style={StyleSheet.absoluteFillObject} onPress={hide} />
      <Animated.View pointerEvents="box-none" style={[styles.overlayLayer, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 12 }, layerAnimatedStyle]}>
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
                <AnimatedPressable
                  hitSlop={6}
                  onPress={() => void handleMarkAllRead()}
                  onPressIn={markReadPress.onPressIn}
                  onPressOut={markReadPress.onPressOut}
                  style={[styles.markReadBtn, markReadPress.animatedStyle]}
                >
                  <Text allowFontScaling={false} style={styles.markReadText}>Marcar</Text>
                </AnimatedPressable>
              ) : null}
              <AnimatedPressable
                hitSlop={6}
                onPress={hide}
                onPressIn={closePress.onPressIn}
                onPressOut={closePress.onPressOut}
                style={[styles.closeBtn, closePress.animatedStyle]}
              >
                <Ionicons name="close" size={17} color={activeColors.textSecondary} />
              </AnimatedPressable>
            </View>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="small" color={activeColors.primaryDeep} />
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
                tintColor={activeColors.primaryDeep}
              />
            }
          >
            {visibleItems.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="notifications-off-outline" size={28} color={activeColors.textSoft} />
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
      </Animated.View>
    </View>
  );
}

const createStyles = () => StyleSheet.create({
  overlayRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 80
  },
  overlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: activeColors.overlay
  },
  overlayLayer: {
    flex: 1,
    paddingHorizontal: 14,
    gap: 12
  },
  floatingTopBar: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: activeColors.borderMuted,
    backgroundColor: activeColors.surface,
    shadowColor: activeColors.primaryText,
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
    color: activeColors.textTitle
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: activeColors.primaryDeep
  },
  badgeText: {
    color: activeColors.textInverse,
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
    backgroundColor: activeColors.primaryAlpha16
  },
  markReadText: {
    fontSize: 11,
    fontWeight: "800",
    color: activeColors.textPrimary
  },
  closeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: activeColors.surfaceMuted
  },
  list: {
    flexGrow: 0
  },
  listContent: {
    gap: 12,
    paddingBottom: 22
  },
  centered: {
    backgroundColor: activeColors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: activeColors.borderSubtle,
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: activeColors.primaryText,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 6
  },
  emptyWrap: {
    backgroundColor: activeColors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: activeColors.borderMutedSoft,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 24,
    paddingHorizontal: 14
  },
  emptyTitle: {
    color: activeColors.textTitle,
    fontSize: 15,
    fontWeight: "800"
  },
  emptyBody: {
    color: activeColors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center"
  },
  bubble: {
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: activeColors.borderMutedSoft,
    backgroundColor: activeColors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    shadowColor: activeColors.primaryText,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8
  },
  bubbleUnread: {
    borderColor: activeColors.primaryDeep,
    backgroundColor: activeColors.primaryHighlight
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
    color: activeColors.textPrimary,
    fontSize: 13,
    fontWeight: "800"
  },
  bubbleDate: {
    fontSize: 11,
    fontWeight: "700",
    color: activeColors.textSoft
  },
  bubbleText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
    color: activeColors.textBody
  },
  unreadDot: {
    marginTop: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: activeColors.primaryDeep
  }
});


let styles = createStyles();
