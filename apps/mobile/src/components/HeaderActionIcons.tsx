import { useCallback, useEffect, useMemo } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getColors } from "@fulbito/design-tokens";
import type { ColorTokens } from "@fulbito/design-tokens";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from "react-native-reanimated";
import { useThemeColors } from "@/theme/useThemeColors";

interface HeaderActionIconsProps {
  notificationCount?: number;
  onPressNotifications?: () => void;
}

export function HeaderActionIcons({
  notificationCount = 0,
  onPressNotifications
}: HeaderActionIconsProps) {
  const themeColors = useThemeColors();
  styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const reducedMotion = useReducedMotion();
  const showBadge = notificationCount > 0;
  const buttonScale = useSharedValue(1);
  const badgeProgress = useSharedValue(showBadge ? 1 : 0);
  const badgeScale = useSharedValue(1);

  useEffect(() => {
    const target = showBadge ? 1 : 0;
    if (reducedMotion) {
      badgeProgress.value = target;
      badgeScale.value = 1;
      return;
    }
    badgeProgress.value = withSpring(target, { damping: 20, stiffness: 260, mass: 0.42 });
    if (showBadge) {
      badgeScale.value = 1.14;
      badgeScale.value = withSpring(1, { damping: 16, stiffness: 340, mass: 0.38 });
    }
  }, [badgeProgress, badgeScale, notificationCount, reducedMotion, showBadge]);

  const handlePressIn = useCallback(() => {
    if (reducedMotion) {
      buttonScale.value = 1;
      return;
    }
    buttonScale.value = withSpring(0.94, { damping: 18, stiffness: 420, mass: 0.4 });
  }, [buttonScale, reducedMotion]);

  const handlePressOut = useCallback(() => {
    if (reducedMotion) {
      buttonScale.value = 1;
      return;
    }
    buttonScale.value = withSpring(1, { damping: 16, stiffness: 340, mass: 0.45 });
  }, [buttonScale, reducedMotion]);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }]
  }));

  const badgeAnimatedStyle = useAnimatedStyle(() => {
    const progress = badgeProgress.value;
    return {
      opacity: progress,
      transform: [{ scale: badgeScale.value * (0.84 + progress * 0.16) }]
    };
  });

  return (
    <Animated.View style={buttonAnimatedStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Notificaciones"
        onPress={onPressNotifications}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        hitSlop={6}
        style={styles.iconButton}
      >
        <Ionicons name="notifications-outline" size={20} color={themeColors.textSecondary} />
        <Animated.View pointerEvents="none" style={[styles.badge, badgeAnimatedStyle]}>
          {showBadge ? (
            <Text allowFontScaling={false} style={styles.badgeText}>
              {notificationCount > 9 ? "9+" : String(notificationCount)}
            </Text>
          ) : null}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const createStyles = (themeColors: ColorTokens) => StyleSheet.create({
  iconButton: {
    height: 42,
    width: 42,
    borderRadius: 14,
    backgroundColor: themeColors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 3
  },
  badge: {
    position: "absolute",
    top: 5,
    right: 5,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: themeColors.dangerAccent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: themeColors.surface
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
    lineHeight: 11
  }
});

let styles = createStyles(getColors("light"));
