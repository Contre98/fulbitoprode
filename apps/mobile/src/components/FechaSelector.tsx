import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@fulbito/design-tokens";
import { usePeriod } from "@/state/PeriodContext";

export function FechaSelector() {
  const { fecha, options, setFecha } = usePeriod();

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Fecha</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.options}>
        {options.map((option) => {
          const active = option.id === fecha;
          return (
            <Pressable
              key={option.id}
              onPress={() => setFecha(option.id)}
              style={({ pressed }) => [styles.option, active ? styles.optionActive : null, pressed ? styles.optionPressed : null]}
            >
              <Text style={[styles.optionLabel, active ? styles.optionLabelActive : null]}>{option.label}</Text>
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
