import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@fulbito/design-tokens";
import { useAuth } from "@/state/AuthContext";

export function DataModeBadge() {
  const { dataMode, fallbackIssue, fallbackHistory, retryHttpMode, clearFallbackDiagnosticsHistory } = useAuth();
  const httpMode = dataMode === "http";
  const recentFailures = __DEV__ ? fallbackHistory.slice(0, 3) : [];

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
              {new Date(entry.happenedAt).toLocaleTimeString()}: {entry.scope}
            </Text>
          ))}
        </View>
      ) : null}
      {!httpMode ? (
        <Pressable onPress={() => void retryHttpMode()} style={({ pressed }) => [styles.retryButton, pressed ? styles.retryButtonPressed : null]}>
          <Text style={styles.retryLabel}>Reintentar HTTP</Text>
        </Pressable>
      ) : null}
      {!httpMode && recentFailures.length > 0 && __DEV__ ? (
        <Pressable
          onPress={() => clearFallbackDiagnosticsHistory()}
          style={({ pressed }) => [styles.clearHistoryButton, pressed ? styles.retryButtonPressed : null]}
        >
          <Text style={styles.clearHistoryLabel}>Limpiar historial</Text>
        </Pressable>
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
  retryButtonPressed: {
    opacity: 0.8
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
