import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@fulbito/design-tokens";

export function ErrorState({
  message,
  retryLabel,
  onRetry
}: {
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      {retryLabel && onRetry ? (
        <Pressable onPress={onRetry} style={({ pressed }) => [styles.retryButton, pressed ? styles.retryButtonPressed : null]}>
          <Text style={styles.retryLabel}>{retryLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.lg,
    gap: spacing.sm,
    alignItems: "center"
  },
  message: {
    color: "#FCA5A5",
    textAlign: "center"
  },
  retryButton: {
    height: 40,
    borderRadius: 10,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface
  },
  retryButtonPressed: {
    opacity: 0.8
  },
  retryLabel: {
    color: colors.textPrimary,
    fontWeight: "700"
  }
});
