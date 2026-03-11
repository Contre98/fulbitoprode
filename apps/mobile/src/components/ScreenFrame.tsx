import { useRef } from "react";
import type { ReactNode } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import type { NativeSyntheticEvent, NativeTouchEvent, StyleProp, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing } from "@fulbito/design-tokens";
import { DataModeBadge } from "@/components/DataModeBadge";

export function ScreenFrame({
  title,
  subtitle,
  header,
  hideDataModeBadge,
  containerStyle,
  contentStyle,
  onSwipeLeft,
  onSwipeRight,
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
  children?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const touchStartRef = useRef<{ x: number; y: number; timestamp: number } | null>(null);

  function onTouchStart(event: NativeSyntheticEvent<NativeTouchEvent>) {
    touchStartRef.current = {
      x: event.nativeEvent.pageX,
      y: event.nativeEvent.pageY,
      timestamp: event.nativeEvent.timestamp
    };
  }

  function onTouchEnd(event: NativeSyntheticEvent<NativeTouchEvent>) {
    const start = touchStartRef.current;
    touchStartRef.current = null;
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
      onSwipeLeft?.();
      return;
    }

    onSwipeRight?.();
  }

  return (
    <View style={[styles.container, containerStyle]}>
      {header ? (
        header
      ) : (
        <>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </>
      )}
      {hideDataModeBadge ? null : <DataModeBadge />}
      <ScrollView
        testID="screenframe-scroll"
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        contentContainerStyle={[styles.content, { paddingBottom: spacing.xl + insets.bottom }, contentStyle]}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.xl
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "800"
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: spacing.sm
  },
  scroll: {
    flex: 1
  },
  content: {
    marginTop: spacing.lg,
    gap: spacing.md
  }
});
