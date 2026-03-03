import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@fulbito/design-tokens";
import { useGroupSelection } from "@/state/GroupContext";

export function GroupSelector() {
  const { memberships, selectedGroupId, setSelectedGroupId } = useGroupSelection();
  if (memberships.length <= 1) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Grupo</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.options}>
        {memberships.map((membership) => {
          const active = membership.groupId === selectedGroupId;
          return (
            <Pressable
              key={membership.groupId}
              onPress={() => setSelectedGroupId(membership.groupId)}
              style={({ pressed }) => [styles.option, active ? styles.optionActive : null, pressed ? styles.optionPressed : null]}
            >
              <Text style={[styles.optionLabel, active ? styles.optionLabelActive : null]}>{membership.groupName}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12
  },
  options: {
    gap: spacing.sm
  },
  option: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  optionActive: {
    borderColor: colors.primary,
    backgroundColor: "#123221"
  },
  optionPressed: {
    opacity: 0.8
  },
  optionLabel: {
    color: colors.textSecondary,
    fontWeight: "600",
    fontSize: 12
  },
  optionLabelActive: {
    color: colors.primary
  }
});
