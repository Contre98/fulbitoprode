import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import type { Membership } from "@fulbito/domain";
import { colors, spacing } from "@fulbito/design-tokens";
import { usePressScale } from "@/lib/usePressScale";
import { useGroupSelection } from "@/state/GroupContext";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function GroupOptionChip({
  membership,
  active,
  onPress
}: {
  membership: Membership;
  active: boolean;
  onPress: () => void;
}) {
  const optionPress = usePressScale(0.97);
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={optionPress.onPressIn}
      onPressOut={optionPress.onPressOut}
      style={[styles.option, active ? styles.optionActive : null, optionPress.animatedStyle]}
    >
      <Text style={[styles.optionLabel, active ? styles.optionLabelActive : null]}>{membership.groupName}</Text>
    </AnimatedPressable>
  );
}

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
            <GroupOptionChip
              key={membership.groupId}
              membership={membership}
              active={active}
              onPress={() => setSelectedGroupId(membership.groupId)}
            />
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
    backgroundColor: colors.dataLiveBg
  },
  optionLabel: {
    color: colors.textSecondary,
    fontWeight: "600",
    fontSize: 13
  },
  optionLabelActive: {
    color: colors.primary
  }
});
