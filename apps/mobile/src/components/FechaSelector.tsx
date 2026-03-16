import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { getColors, spacing } from "@fulbito/design-tokens";
import type { ColorTokens } from "@fulbito/design-tokens";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from "react-native-reanimated";
import { usePeriod } from "@/state/PeriodContext";
import { useThemeColors } from "@/theme/useThemeColors";

interface FechaSelectorProps {
  labelOverride?: string;
  value?: string;
  options?: Array<{ id: string; label: string }>;
  onChange?: (nextFecha: string) => void;
}
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const PRESS_IN_SPRING = {
  damping: 22,
  stiffness: 430,
  mass: 0.4
} as const;
const PRESS_OUT_SPRING = {
  damping: 18,
  stiffness: 340,
  mass: 0.45
} as const;
const MENU_OPEN_SPRING = {
  damping: 22,
  stiffness: 320,
  mass: 0.5
} as const;

function usePressScale(scaleDown: number, disabled = false) {
  const reducedMotion = useReducedMotion();
  const pressScale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }]
  }));

  const onPressIn = useCallback(() => {
    if (reducedMotion || disabled) {
      pressScale.value = 1;
      return;
    }
    pressScale.value = withSpring(scaleDown, PRESS_IN_SPRING);
  }, [disabled, pressScale, reducedMotion, scaleDown]);

  const onPressOut = useCallback(() => {
    if (reducedMotion || disabled) {
      pressScale.value = 1;
      return;
    }
    pressScale.value = withSpring(1, PRESS_OUT_SPRING);
  }, [disabled, pressScale, reducedMotion]);

  return { animatedStyle, onPressIn, onPressOut };
}

function MenuOptionRow({
  active,
  label,
  onPress,
  testID
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  testID: string;
}) {
  const press = usePressScale(0.985);

  return (
    <Animated.View style={press.animatedStyle}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        style={[styles.menuRow, active ? styles.menuRowActive : null]}
      >
        <Text allowFontScaling={false} numberOfLines={1} style={[styles.menuLabel, active ? styles.menuLabelActive : null]}>
          {label}
        </Text>
        {active ? <Text allowFontScaling={false} style={styles.menuCheck}>✓</Text> : null}
      </Pressable>
    </Animated.View>
  );
}

export function FechaSelector({ labelOverride, value, options, onChange }: FechaSelectorProps) {
  const themeColors = useThemeColors();
  styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const reducedMotion = useReducedMotion();
  const { fecha, options: periodOptions, setFecha } = usePeriod();
  const triggerRef = useRef<View | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const menuProgress = useSharedValue(0);
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
  const prevPress = usePressScale(0.95);
  const nextPress = usePressScale(0.95);
  const centerPress = usePressScale(0.99);
  const menuBackdropStyle = useAnimatedStyle(() => ({
    opacity: menuProgress.value
  }));
  const menuCardStyle = useAnimatedStyle(() => ({
    opacity: menuProgress.value,
    transform: [
      { translateY: (1 - menuProgress.value) * -10 },
      { scale: 0.965 + menuProgress.value * 0.035 }
    ]
  }));

  useEffect(() => {
    if (menuOpen) {
      setMenuMounted(true);
      if (reducedMotion) {
        menuProgress.value = 1;
        return;
      }
      menuProgress.value = 0;
      menuProgress.value = withSpring(1, MENU_OPEN_SPRING);
      return;
    }
    if (!menuMounted) {
      return;
    }
    menuProgress.value = 0;
    setMenuMounted(false);
  }, [menuMounted, menuOpen, menuProgress, reducedMotion]);

  return (
    <>
      <View ref={triggerRef} collapsable={false} style={styles.fechaBlock}>
        <Animated.View style={prevPress.animatedStyle}>
          <Pressable
            testID="fecha-prev"
            onPress={selectPrevious}
            onPressIn={prevPress.onPressIn}
            onPressOut={prevPress.onPressOut}
            hitSlop={8}
            style={styles.fechaNavButton}
            accessibilityLabel="Fecha anterior"
          >
            <Text allowFontScaling={false} style={styles.fechaNavLabel}>‹</Text>
          </Pressable>
        </Animated.View>
        <Animated.View style={[styles.fechaCenterWrap, centerPress.animatedStyle]}>
          <Pressable
            testID="fecha-dropdown-trigger"
            accessibilityRole="button"
            accessibilityLabel="Seleccionar fecha"
            onPress={openMenu}
            onPressIn={centerPress.onPressIn}
            onPressOut={centerPress.onPressOut}
            style={styles.fechaCenterTrigger}
          >
            <Text allowFontScaling={false} numberOfLines={1} style={styles.fechaTitle}>{displayLabel}</Text>
            <Text allowFontScaling={false} style={styles.fechaChevron}>⌄</Text>
          </Pressable>
        </Animated.View>
        <Animated.View style={nextPress.animatedStyle}>
          <Pressable
            testID="fecha-next"
            onPress={selectNext}
            onPressIn={nextPress.onPressIn}
            onPressOut={nextPress.onPressOut}
            hitSlop={8}
            style={styles.fechaNavButton}
            accessibilityLabel="Fecha siguiente"
          >
            <Text allowFontScaling={false} style={styles.fechaNavLabel}>›</Text>
          </Pressable>
        </Animated.View>
      </View>

      <Modal visible={menuMounted} transparent animationType="none" onRequestClose={() => setMenuOpen(false)}>
        <View style={styles.modalRoot}>
          <Animated.View pointerEvents="none" style={[styles.modalBackdrop, menuBackdropStyle]} />
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setMenuOpen(false)} />
          <Animated.View style={[styles.menuCard, { top: menuTop, left: menuLeft, width: menuWidth }, menuCardStyle]}>
            <ScrollView style={styles.menuScroll} contentContainerStyle={styles.menuContent}>
              {safeOptions.map((option, index) => {
                const active = option.id === current.id;
                return (
                  <MenuOptionRow
                    key={option.id}
                    testID={`fecha-option-${index}`}
                    active={active}
                    label={option.label}
                    onPress={() => selectById(option.id)}
                  />
                );
              })}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const createStyles = (themeColors: ColorTokens) => StyleSheet.create({
  fechaBlock: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: themeColors.borderSubtle,
    backgroundColor: themeColors.surfaceSoft,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8
  },
  fechaNavButton: {
    height: 28,
    width: 28,
    borderRadius: 8,
    backgroundColor: themeColors.surfaceMuted,
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
  fechaCenterWrap: {
    flex: 1
  },
  fechaNavLabel: {
    color: themeColors.textSoft,
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
    color: themeColors.primaryStrong,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase"
  },
  fechaChevron: {
    color: themeColors.textSecondary,
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
    backgroundColor: themeColors.overlaySubtle
  },
  menuCard: {
    position: "absolute",
    maxHeight: "60%",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: themeColors.borderMuted,
    backgroundColor: themeColors.surface,
    overflow: "hidden",
    shadowColor: themeColors.textPrimary,
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
    backgroundColor: themeColors.primaryAlpha16,
    borderColor: themeColors.borderInfo
  },
  menuLabel: {
    flex: 1,
    color: themeColors.textPrimary,
    fontSize: 14,
    fontWeight: "700"
  },
  menuLabelActive: {
    color: themeColors.primary,
    fontWeight: "900"
  },
  menuCheck: {
    marginLeft: spacing.sm,
    color: themeColors.primary,
    fontSize: 13,
    fontWeight: "900"
  }
});

let styles = createStyles(getColors("light"));
