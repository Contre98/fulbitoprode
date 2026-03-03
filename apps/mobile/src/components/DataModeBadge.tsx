import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@fulbito/design-tokens";
import { useAuth } from "@/state/AuthContext";

export function DataModeBadge() {
  const { dataMode, fallbackIssue, retryHttpMode } = useAuth();
  const httpMode = dataMode === "http";

  return (
    <View style={styles.container}>
      <View style={[styles.badge, httpMode ? styles.httpBadge : styles.mockBadge]}>
        <Text style={[styles.label, httpMode ? styles.httpLabel : styles.mockLabel]}>
          {httpMode ? "HTTP Session" : "Mock Fallback"}
        </Text>
      </View>
      {!httpMode && fallbackIssue && __DEV__ ? <Text style={styles.reason}>{fallbackIssue}</Text> : null}
      {!httpMode ? (
        <Pressable onPress={() => void retryHttpMode()} style={({ pressed }) => [styles.retryButton, pressed ? styles.retryButtonPressed : null]}>
          <Text style={styles.retryLabel}>Reintentar HTTP</Text>
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
    backgroundColor: "#123221"
  },
  mockBadge: {
    borderColor: "#FBBF24",
    backgroundColor: "#322610"
  },
  label: {
    fontSize: 11,
    fontWeight: "700"
  },
  httpLabel: {
    color: colors.primary
  },
  mockLabel: {
    color: "#FBBF24"
  },
  reason: {
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
    fontSize: 11,
    fontWeight: "700"
  }
});
