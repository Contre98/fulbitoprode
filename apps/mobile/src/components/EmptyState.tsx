import { StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@fulbito/design-tokens";

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.md,
    gap: spacing.xs
  },
  title: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700"
  },
  description: {
    color: colors.textSecondary,
    fontSize: 12
  }
});
