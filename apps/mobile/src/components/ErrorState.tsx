import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { getColors, spacing } from "@fulbito/design-tokens";
import type { ColorTokens } from "@fulbito/design-tokens";
import { usePressScale } from "@/lib/usePressScale";
import { useThemeColors } from "@/theme/useThemeColors";

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
  const themeColors = useThemeColors();
  styles = useMemo(() => createStyles(themeColors), [themeColors]);
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

const createStyles = (themeColors: ColorTokens) => StyleSheet.create({
  container: {
    paddingVertical: spacing.lg,
    gap: spacing.sm,
    alignItems: "center"
  },
  message: {
    color: themeColors.dangerSoft,
    fontSize: 12,
    textAlign: "center"
  },
  retryButton: {
    minHeight: 44,
    borderRadius: 10,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: themeColors.surface
  },
  retryLabel: {
    color: themeColors.textPrimary,
    fontSize: 14,
    fontWeight: "700"
  }
});

let styles = createStyles(getColors("light"));
