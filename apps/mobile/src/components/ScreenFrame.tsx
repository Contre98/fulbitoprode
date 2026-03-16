import { useCallback, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Pressable, View, Text, StyleSheet, ScrollView, RefreshControl, Animated } from "react-native";
import type { NativeSyntheticEvent, NativeTouchEvent, StyleProp, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getColors, spacing } from "@fulbito/design-tokens";
import type { ColorTokens } from "@fulbito/design-tokens";
import { DataModeBadge } from "@/components/DataModeBadge";
import { useGroupSelectorOverlay } from "@/state/GroupSelectorOverlayContext";
import { useThemeColors } from "@/theme/useThemeColors";

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

function GroupSelectorOverlay() {
  const { visible, hide } = useGroupSelectorOverlay();
  if (!visible) return null;
  return <Pressable style={styles.groupSelectorOverlay} onPress={hide} />;
}

export function ScreenFrame({
  title,
  subtitle,
  header,
  hideDataModeBadge,
  containerStyle,
  contentStyle,
  onSwipeLeft,
  onSwipeRight,
  showSwipeCue,
  onRefresh,
  children
}: {
  title: string;
  subtitle?: string;
  header?: ReactNode;
  hideDataModeBadge?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  showSwipeCue?: boolean;
  onRefresh?: () => Promise<void>;
  children?: ReactNode;
}) {
  const themeColors = useThemeColors();
  styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const insets = useSafeAreaInsets();
  const touchStartRef = useRef<{ x: number; y: number; timestamp: number } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [horizontalGestureActive, setHorizontalGestureActive] = useState(false);
  const swipeDragX = useRef(new Animated.Value(0)).current;
  const swipeEnabled = Boolean(onSwipeLeft || onSwipeRight);
  const swipeCueEnabled = swipeEnabled && showSwipeCue;

  const leftCueOpacity = swipeDragX.interpolate({
    inputRange: [0, 18, 88],
    outputRange: [0, 0.35, 0.95],
    extrapolate: "clamp"
  });
  const rightCueOpacity = swipeDragX.interpolate({
    inputRange: [-88, -18, 0],
    outputRange: [0.95, 0.35, 0],
    extrapolate: "clamp"
  });
  const leftCueTranslateX = swipeDragX.interpolate({
    inputRange: [0, 88],
    outputRange: [-10, 0],
    extrapolate: "clamp"
  });
  const rightCueTranslateX = swipeDragX.interpolate({
    inputRange: [-88, 0],
    outputRange: [0, 10],
    extrapolate: "clamp"
  });

  const resetSwipeCue = useCallback(() => {
    if (!swipeCueEnabled) {
      swipeDragX.setValue(0);
      return;
    }
    Animated.spring(swipeDragX, {
      toValue: 0,
      speed: 22,
      bounciness: 0,
      useNativeDriver: true
    }).start();
  }, [swipeCueEnabled, swipeDragX]);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  const releaseHorizontalGesture = useCallback(() => {
    setHorizontalGestureActive(false);
  }, []);

  function onTouchStart(event: NativeSyntheticEvent<NativeTouchEvent>) {
    if (!swipeEnabled) {
      return;
    }
    setHorizontalGestureActive(false);
    touchStartRef.current = {
      x: event.nativeEvent.pageX,
      y: event.nativeEvent.pageY,
      timestamp: event.nativeEvent.timestamp
    };
  }

  function onTouchMove(event: NativeSyntheticEvent<NativeTouchEvent>) {
    if (!swipeEnabled) {
      return;
    }
    const start = touchStartRef.current;
    if (!start) {
      return;
    }
    const deltaX = event.nativeEvent.pageX - start.x;
    const deltaY = event.nativeEvent.pageY - start.y;
    const meetsSwipeDelta = Math.abs(deltaX) >= 10;
    const isHorizontalIntent = Math.abs(deltaX) > Math.abs(deltaY);
    const canSwipeInDirection = (deltaX < 0 && onSwipeLeft) || (deltaX > 0 && onSwipeRight);
    if (meetsSwipeDelta && isHorizontalIntent && canSwipeInDirection) {
      if (!horizontalGestureActive) {
        setHorizontalGestureActive(true);
      }
      if (swipeCueEnabled) {
        const clampedDeltaX = Math.max(-96, Math.min(96, deltaX));
        swipeDragX.setValue(clampedDeltaX);
      }
      return;
    }

    if (horizontalGestureActive) {
      setHorizontalGestureActive(false);
    }
    if (!isHorizontalIntent) {
      if (swipeCueEnabled) {
        swipeDragX.setValue(0);
      }
      return;
    }
    if (!canSwipeInDirection) {
      if (swipeCueEnabled) {
        swipeDragX.setValue(0);
      }
    }
  }

  function onTouchEnd(event: NativeSyntheticEvent<NativeTouchEvent>) {
    if (!swipeEnabled) {
      return;
    }
    const start = touchStartRef.current;
    touchStartRef.current = null;
    releaseHorizontalGesture();
    resetSwipeCue();
    if (!start) {
      return;
    }

    const deltaX = event.nativeEvent.pageX - start.x;
    const deltaY = event.nativeEvent.pageY - start.y;
    const elapsedMs = event.nativeEvent.timestamp - start.timestamp;
    const isHorizontalSwipe = Math.abs(deltaX) >= 24 && Math.abs(deltaX) > Math.abs(deltaY);
    const isQuickEnough = elapsedMs <= 800;
    if (!isHorizontalSwipe || !isQuickEnough) {
      return;
    }

    if (deltaX < 0) {
      if (onSwipeLeft) {
        onSwipeLeft();
      }
      return;
    }

    if (onSwipeRight) {
      onSwipeRight();
    }
  }

  function onTouchCancel() {
    touchStartRef.current = null;
    releaseHorizontalGesture();
    resetSwipeCue();
  }

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.headerWrap}>
        {header ? (
          header
        ) : (
          <>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </>
        )}
      </View>
      {hideDataModeBadge ? null : <DataModeBadge />}
      <View style={styles.scrollWrap}>
        <GroupSelectorOverlay />
        <AnimatedScrollView
          testID="screenframe-scroll"
          style={styles.scroll}
          scrollEnabled={!horizontalGestureActive}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchCancel}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={themeColors.textSecondary} />
            ) : undefined
          }
          contentContainerStyle={[styles.content, { paddingBottom: spacing.xl + insets.bottom }, contentStyle]}
        >
          {children}
        </AnimatedScrollView>
        {swipeCueEnabled ? (
          <View pointerEvents="none" style={styles.swipeCueLayer}>
            {onSwipeRight ? (
              <Animated.View
                style={[styles.swipeCue, styles.swipeCueLeft, { opacity: leftCueOpacity, transform: [{ translateX: leftCueTranslateX }] }]}
              >
                <Text allowFontScaling={false} style={styles.swipeCueText}>←</Text>
              </Animated.View>
            ) : null}
            {onSwipeLeft ? (
              <Animated.View
                style={[styles.swipeCue, styles.swipeCueRight, { opacity: rightCueOpacity, transform: [{ translateX: rightCueTranslateX }] }]}
              >
                <Text allowFontScaling={false} style={styles.swipeCueText}>→</Text>
              </Animated.View>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const createStyles = (themeColors: ColorTokens) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
    padding: spacing.xl
  },
  headerWrap: {
    position: "relative",
    zIndex: 20
  },
  title: {
    color: themeColors.textPrimary,
    fontSize: 28,
    fontWeight: "800"
  },
  subtitle: {
    color: themeColors.textSecondary,
    fontSize: 13,
    marginTop: spacing.sm
  },
  scroll: {
    flex: 1
  },
  scrollWrap: {
    flex: 1,
    position: "relative"
  },
  content: {
    marginTop: spacing.lg,
    gap: spacing.md
  },
  swipeCueLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center"
  },
  swipeCue: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: themeColors.surfaceMuted,
    borderWidth: 1,
    borderColor: themeColors.borderMuted
  },
  swipeCueLeft: {
    left: 4
  },
  swipeCueRight: {
    right: 4
  },
  swipeCueText: {
    color: themeColors.textMuted,
    fontSize: 18,
    fontWeight: "800"
  },
  groupSelectorOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    backgroundColor: "rgba(0, 0, 0, 0.4)"
  }
});

let styles = createStyles(getColors("light"));
