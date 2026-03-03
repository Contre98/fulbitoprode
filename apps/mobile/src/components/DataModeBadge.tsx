import { StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@fulbito/design-tokens";
import { useAuth } from "@/state/AuthContext";

export function DataModeBadge() {
  const { dataMode } = useAuth();
  const httpMode = dataMode === "http";

  return (
    <View style={[styles.badge, httpMode ? styles.httpBadge : styles.mockBadge]}>
      <Text style={[styles.label, httpMode ? styles.httpLabel : styles.mockLabel]}>
        {httpMode ? "HTTP Session" : "Mock Fallback"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
  }
});
