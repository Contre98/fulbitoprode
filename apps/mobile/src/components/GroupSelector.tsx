import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import type { Membership } from "@fulbito/domain";
import { getColors, spacing } from "@fulbito/design-tokens";
import type { ColorTokens } from "@fulbito/design-tokens";
import { usePressScale } from "@/lib/usePressScale";
import { useGroupSelection } from "@/state/GroupContext";
import { useThemeColors } from "@/theme/useThemeColors";

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
  const themeColors = useThemeColors();
  styles = useMemo(() => createStyles(themeColors), [themeColors]);
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

const createStyles = (themeColors: ColorTokens) => StyleSheet.create({
  container: {
    gap: spacing.xs
  },
  label: {
    color: themeColors.textSecondary,
    fontSize: 12
  },
  options: {
    gap: spacing.sm
  },
  option: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: themeColors.surfaceMuted,
    backgroundColor: themeColors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  optionActive: {
    borderColor: themeColors.primary,
    backgroundColor: themeColors.dataLiveBg
  },
  optionLabel: {
    color: themeColors.textSecondary,
    fontWeight: "600",
    fontSize: 13
  },
  optionLabelActive: {
    color: themeColors.primary
  }
});

let styles = createStyles(getColors("light"));
