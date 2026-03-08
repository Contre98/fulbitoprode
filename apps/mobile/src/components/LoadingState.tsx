import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@fulbito/design-tokens";

export function LoadingState({ message = "Cargando..." }: { message?: string }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.lg,
    alignItems: "center",
    gap: spacing.sm
  },
  message: {
    color: colors.textSecondary
  }
});
