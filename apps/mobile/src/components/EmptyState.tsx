import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { getColors, spacing } from "@fulbito/design-tokens";
import type { ColorTokens } from "@fulbito/design-tokens";
import { useThemeColors } from "@/theme/useThemeColors";

export function EmptyState({ title, description }: { title: string; description?: string }) {
  const themeColors = useThemeColors();
  styles = useMemo(() => createStyles(themeColors), [themeColors]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

const createStyles = (themeColors: ColorTokens) => StyleSheet.create({
  container: {
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: themeColors.borderSubtle,
    borderRadius: 14,
    padding: spacing.md,
    gap: spacing.xs
  },
  title: {
    color: themeColors.textPrimary,
    fontSize: 14,
    fontWeight: "700"
  },
  description: {
    color: themeColors.textSecondary,
    fontSize: 12
  }
});

let styles = createStyles(getColors("light"));
