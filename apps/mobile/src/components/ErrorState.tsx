import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { colors, spacing } from "@fulbito/design-tokens";
import { usePressScale } from "@/lib/usePressScale";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ErrorState({
  message,
  retryLabel,
  onRetry
}: {
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
}) {
  const retryPress = usePressScale(0.97, !onRetry);

  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      {retryLabel && onRetry ? (
        <AnimatedPressable
          onPress={onRetry}
          onPressIn={retryPress.onPressIn}
          onPressOut={retryPress.onPressOut}
          style={[styles.retryButton, retryPress.animatedStyle]}
        >
          <Text style={styles.retryLabel}>{retryLabel}</Text>
        </AnimatedPressable>
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
    color: colors.dangerSoft,
    fontSize: 12,
    textAlign: "center"
  },
  retryButton: {
    minHeight: 44,
    borderRadius: 10,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface
  },
  retryLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700"
  }
});
