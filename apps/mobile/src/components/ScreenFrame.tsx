import type { ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing } from "@fulbito/design-tokens";

export function ScreenFrame({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <View style={styles.content}>{children}</View>
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
    marginTop: spacing.sm
  },
  content: {
    marginTop: spacing.lg,
    gap: spacing.md
  }
});
