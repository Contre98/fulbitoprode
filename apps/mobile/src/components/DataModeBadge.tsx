import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { getColors, spacing } from "@fulbito/design-tokens";
import type { ColorTokens } from "@fulbito/design-tokens";
import { formatClock24 } from "@/lib/dateTime";
import { usePressScale } from "@/lib/usePressScale";
import { useAuth } from "@/state/AuthContext";
import { useThemeColors } from "@/theme/useThemeColors";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function DataModeBadge() {
  const themeColors = useThemeColors();
  styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const { dataMode, fallbackIssue, fallbackHistory, retryHttpMode, clearFallbackDiagnosticsHistory } = useAuth();
  const httpMode = dataMode === "http";
  const recentFailures = __DEV__ ? fallbackHistory.slice(0, 3) : [];
  const retryPress = usePressScale(0.97, httpMode);
  const clearPress = usePressScale(0.97, httpMode || recentFailures.length === 0 || !__DEV__);

  return (
    <View style={styles.container}>
      <View style={[styles.badge, httpMode ? styles.httpBadge : styles.mockBadge]}>
        <Text style={[styles.label, httpMode ? styles.httpLabel : styles.mockLabel]}>
          {httpMode ? "HTTP Session" : "Mock Fallback"}
        </Text>
      </View>
      {!httpMode && fallbackIssue && __DEV__ ? <Text style={styles.reason}>{fallbackIssue}</Text> : null}
      {!httpMode && recentFailures.length > 0 && __DEV__ ? (
        <View style={styles.historyList}>
          {recentFailures.map((entry, index) => (
            <Text key={`${entry.happenedAt}-${entry.scope}-${index}`} style={styles.historyItem}>
              {formatClock24(entry.happenedAt, { withSeconds: true })}: {entry.scope}
            </Text>
          ))}
        </View>
      ) : null}
      {!httpMode ? (
        <AnimatedPressable
          onPress={() => void retryHttpMode()}
          onPressIn={retryPress.onPressIn}
          onPressOut={retryPress.onPressOut}
          style={[styles.retryButton, retryPress.animatedStyle]}
        >
          <Text style={styles.retryLabel}>Reintentar HTTP</Text>
        </AnimatedPressable>
      ) : null}
      {!httpMode && recentFailures.length > 0 && __DEV__ ? (
        <AnimatedPressable
          onPress={() => clearFallbackDiagnosticsHistory()}
          onPressIn={clearPress.onPressIn}
          onPressOut={clearPress.onPressOut}
          style={[styles.clearHistoryButton, clearPress.animatedStyle]}
        >
          <Text style={styles.clearHistoryLabel}>Limpiar historial</Text>
        </AnimatedPressable>
      ) : null}
    </View>
  );
}

const createStyles = (themeColors: ColorTokens) => StyleSheet.create({
  container: {
    gap: spacing.xs
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1
  },
  httpBadge: {
    borderColor: themeColors.primary,
    backgroundColor: themeColors.dataLiveBg
  },
  mockBadge: {
    borderColor: themeColors.warningAccent,
    backgroundColor: themeColors.dataMockBg
  },
  label: {
    fontSize: 11,
    fontWeight: "700"
  },
  httpLabel: {
    color: themeColors.primary
  },
  mockLabel: {
    color: themeColors.warningAccent
  },
  reason: {
    color: themeColors.textSecondary,
    fontSize: 11
  },
  historyList: {
    gap: 2
  },
  historyItem: {
    color: themeColors.textSecondary,
    fontSize: 11
  },
  retryButton: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: themeColors.surfaceMuted,
    backgroundColor: themeColors.surface
  },
  retryLabel: {
    color: themeColors.textPrimary,
    fontSize: 13,
    fontWeight: "700"
  },
  clearHistoryButton: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: themeColors.surfaceMuted,
    backgroundColor: themeColors.background
  },
  clearHistoryLabel: {
    color: themeColors.textSecondary,
    fontSize: 13,
    fontWeight: "700"
  }
});

let styles = createStyles(getColors("light"));
