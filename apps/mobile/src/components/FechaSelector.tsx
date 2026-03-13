import { useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@fulbito/design-tokens";
import { usePeriod } from "@/state/PeriodContext";

interface FechaSelectorProps {
  labelOverride?: string;
  value?: string;
  options?: Array<{ id: string; label: string }>;
  onChange?: (nextFecha: string) => void;
}

export function FechaSelector({ labelOverride, value, options, onChange }: FechaSelectorProps) {
  const { fecha, options: periodOptions, setFecha } = usePeriod();
  const triggerRef = useRef<View | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const selectedValue = value ?? fecha;
  const setSelectedValue = onChange ?? setFecha;
  const sourceOptions = options ?? periodOptions;
  const safeOptions = sourceOptions.length > 0 ? sourceOptions : [{ id: selectedValue, label: selectedValue }];
  const currentIndex = safeOptions.findIndex((option) => option.id === selectedValue);
  const resolvedIndex = currentIndex >= 0 ? currentIndex : 0;
  const current = safeOptions[resolvedIndex];

  function selectPrevious() {
    if (safeOptions.length === 0) {
      return;
    }
    const prevIndex = (resolvedIndex - 1 + safeOptions.length) % safeOptions.length;
    setSelectedValue(safeOptions[prevIndex].id);
  }

  function selectNext() {
    if (safeOptions.length === 0) {
      return;
    }
    const nextIndex = (resolvedIndex + 1) % safeOptions.length;
    setSelectedValue(safeOptions[nextIndex].id);
  }

  function selectById(nextId: string) {
    setSelectedValue(nextId);
    setMenuOpen(false);
  }

  function openMenu() {
    const node = triggerRef.current;
    setMenuOpen(true);
    if (!node || typeof node.measureInWindow !== "function") {
      return;
    }
    node.measureInWindow((x, y, width, height) => {
      setMenuAnchor({ x, y, width, height });
    });
  }

  const displayLabel = (labelOverride ?? current.label).toUpperCase();
  const menuTop = (menuAnchor?.y ?? 80) + (menuAnchor?.height ?? 0) + spacing.xs;
  const menuLeft = menuAnchor?.x ?? spacing.md;
  const menuWidth = menuAnchor?.width ?? 320;

  return (
    <>
      <View ref={triggerRef} collapsable={false} style={styles.fechaBlock}>
        <Pressable
          testID="fecha-prev"
          onPress={selectPrevious}
          hitSlop={8}
          style={styles.fechaNavButton}
          accessibilityLabel="Fecha anterior"
        >
          <Text allowFontScaling={false} style={styles.fechaNavLabel}>‹</Text>
        </Pressable>
        <Pressable
          testID="fecha-dropdown-trigger"
          accessibilityRole="button"
          accessibilityLabel="Seleccionar fecha"
          onPress={openMenu}
          style={styles.fechaCenterTrigger}
        >
          <Text allowFontScaling={false} numberOfLines={1} style={styles.fechaTitle}>{displayLabel}</Text>
          <Text allowFontScaling={false} style={styles.fechaChevron}>⌄</Text>
        </Pressable>
        <Pressable
          testID="fecha-next"
          onPress={selectNext}
          hitSlop={8}
          style={styles.fechaNavButton}
          accessibilityLabel="Fecha siguiente"
        >
          <Text allowFontScaling={false} style={styles.fechaNavLabel}>›</Text>
        </Pressable>
      </View>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setMenuOpen(false)} />
          <View style={[styles.menuCard, { top: menuTop, left: menuLeft, width: menuWidth }]}>
            <ScrollView style={styles.menuScroll} contentContainerStyle={styles.menuContent}>
              {safeOptions.map((option, index) => {
                const active = option.id === current.id;
                return (
                  <Pressable
                    key={option.id}
                    testID={`fecha-option-${index}`}
                    accessibilityRole="button"
                    onPress={() => selectById(option.id)}
                    style={[styles.menuRow, active ? styles.menuRowActive : null]}
                  >
                    <Text allowFontScaling={false} numberOfLines={1} style={[styles.menuLabel, active ? styles.menuLabelActive : null]}>
                      {option.label}
                    </Text>
                    {active ? <Text allowFontScaling={false} style={styles.menuCheck}>✓</Text> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fechaBlock: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceSoft,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8
  },
  fechaNavButton: {
    height: 28,
    width: 28,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center"
  },
  fechaCenterTrigger: {
    flex: 1,
    minHeight: 36,
    marginHorizontal: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs
  },
  fechaNavLabel: {
    color: colors.textSoft,
    fontSize: 18,
    lineHeight: 18,
    fontWeight: "700",
    textAlign: "center",
    includeFontPadding: false,
    textAlignVertical: "center"
  },
  fechaTitle: {
    maxWidth: "85%",
    textAlign: "center",
    color: colors.primaryStrong,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase"
  },
  fechaChevron: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "900"
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "flex-start"
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlaySubtle
  },
  menuCard: {
    position: "absolute",
    maxHeight: "60%",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    backgroundColor: colors.surface,
    overflow: "hidden",
    shadowColor: colors.textPrimary,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6
  },
  menuScroll: {
    width: "100%"
  },
  menuContent: {
    padding: spacing.xs
  },
  menuRow: {
    minHeight: 44,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "transparent"
  },
  menuRowActive: {
    backgroundColor: colors.primaryAlpha16,
    borderColor: colors.borderInfo
  },
  menuLabel: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700"
  },
  menuLabelActive: {
    color: colors.primary,
    fontWeight: "900"
  },
  menuCheck: {
    marginLeft: spacing.sm,
    color: colors.primary,
    fontSize: 13,
    fontWeight: "900"
  }
});
