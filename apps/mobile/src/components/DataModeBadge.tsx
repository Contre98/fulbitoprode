import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { colors, spacing } from "@fulbito/design-tokens";
import { formatClock24 } from "@/lib/dateTime";
import { usePressScale } from "@/lib/usePressScale";
import { useAuth } from "@/state/AuthContext";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function DataModeBadge() {
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

const styles = StyleSheet.create({
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
    borderColor: colors.primary,
    backgroundColor: colors.dataLiveBg
  },
  mockBadge: {
    borderColor: colors.warningAccent,
    backgroundColor: colors.dataMockBg
  },
  label: {
    fontSize: 11,
    fontWeight: "700"
  },
  httpLabel: {
    color: colors.primary
  },
  mockLabel: {
    color: colors.warningAccent
  },
  reason: {
    color: colors.textSecondary,
    fontSize: 11
  },
  historyList: {
    gap: 2
  },
  historyItem: {
    color: colors.textSecondary,
    fontSize: 11
  },
  retryButton: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
    backgroundColor: colors.surface
  },
  retryLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "700"
  },
  clearHistoryButton: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
    backgroundColor: colors.background
  },
  clearHistoryLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "700"
  }
});
