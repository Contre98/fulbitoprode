import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@fulbito/design-tokens";
import { usePeriod } from "@/state/PeriodContext";

export function FechaSelector() {
  const { fecha, options, setFecha } = usePeriod();
  const safeOptions = options.length > 0 ? options : [{ id: fecha, label: fecha }];
  const currentIndex = safeOptions.findIndex((option) => option.id === fecha);
  const resolvedIndex = currentIndex >= 0 ? currentIndex : 0;
  const current = safeOptions[resolvedIndex];

  function selectPrevious() {
    if (safeOptions.length === 0) {
      return;
    }
    const prevIndex = (resolvedIndex - 1 + safeOptions.length) % safeOptions.length;
    setFecha(safeOptions[prevIndex].id);
  }

  function selectNext() {
    if (safeOptions.length === 0) {
      return;
    }
    const nextIndex = (resolvedIndex + 1) % safeOptions.length;
    setFecha(safeOptions[nextIndex].id);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Fecha</Text>
      <View style={styles.cycler}>
        <Pressable
          testID="fecha-prev"
          onPress={selectPrevious}
          style={({ pressed }) => [styles.navButton, pressed ? styles.optionPressed : null]}
          accessibilityLabel="Fecha anterior"
        >
          <Text style={styles.navLabel}>‹</Text>
        </Pressable>
        <View style={styles.currentBadge}>
          <Text style={styles.currentText}>{current.label}</Text>
        </View>
        <Pressable
          testID="fecha-next"
          onPress={selectNext}
          style={({ pressed }) => [styles.navButton, pressed ? styles.optionPressed : null]}
          accessibilityLabel="Fecha siguiente"
        >
          <Text style={styles.navLabel}>›</Text>
        </Pressable>
      </View>
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
  cycler: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs
  },
  navButton: {
    height: 32,
    width: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
    backgroundColor: colors.background
  },
  navLabel: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 22
  },
  optionPressed: {
    opacity: 0.8
  },
  currentBadge: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  currentText: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 14
  }
});
