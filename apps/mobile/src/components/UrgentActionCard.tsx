import { useCallback, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { getColors } from "@fulbito/design-tokens";
import type { ColorTokens } from "@fulbito/design-tokens";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from "react-native-reanimated";
import { CardSideAccentGradient } from "@/components/MatchCardVisuals";
import { useThemePreference } from "@/state/ThemePreferenceContext";
import { useThemeColors } from "@/theme/useThemeColors";

interface UrgentActionCardProps {
  message: string;
  filled: number;
  total: number;
  complete: boolean;
  onPress: () => void;
}
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const CTA_PRESS_IN_SPRING = {
  damping: 21,
  stiffness: 420,
  mass: 0.4
} as const;
const CTA_PRESS_OUT_SPRING = {
  damping: 17,
  stiffness: 330,
  mass: 0.45
} as const;
let activeColors: ColorTokens = getColors("light");

export function UrgentActionCard({ message, filled, total, complete, onPress }: UrgentActionCardProps) {
  const themeColors = useThemeColors();
  activeColors = themeColors;
  styles = useMemo(() => createStyles(), [themeColors]);
  const { themePreference } = useThemePreference();
  const isDark = themePreference === "dark";
  const reducedMotion = useReducedMotion();
  const ctaScale = useSharedValue(1);
  const progressPct = total > 0 ? Math.min(filled / total, 1) : 0;
  const ctaAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ctaScale.value }]
  }));

  const handleCtaPressIn = useCallback(() => {
    if (reducedMotion) {
      ctaScale.value = 1;
      return;
    }
    ctaScale.value = withSpring(0.94, CTA_PRESS_IN_SPRING);
  }, [ctaScale, reducedMotion]);

  const handleCtaPressOut = useCallback(() => {
    if (reducedMotion) {
      ctaScale.value = 1;
      return;
    }
    ctaScale.value = withSpring(1, CTA_PRESS_OUT_SPRING);
  }, [ctaScale, reducedMotion]);

  return (
    <View style={[styles.card, isDark && styles.cardDark]}>
      <CardSideAccentGradient color={activeColors.primaryStrong} intensity={0.07} side="left" widthPct={28} />
      <View style={styles.topRow}>
        <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
          {complete ? "PRONÓSTICOS COMPLETOS" : "PRONÓSTICOS PENDIENTES"}
        </Text>
        {!complete && (
          <AnimatedPressable
            accessibilityRole="button"
            style={[styles.ctaBtn, isDark && styles.ctaBtnDark, ctaAnimatedStyle]}
            onPress={onPress}
            onPressIn={handleCtaPressIn}
            onPressOut={handleCtaPressOut}
          >
            <Text style={[styles.ctaBtnLabel, isDark && styles.ctaBtnLabelDark]}>Jugar</Text>
          </AnimatedPressable>
        )}
      </View>

      <View style={styles.messageRow}>
        <View style={[styles.iconCircle, isDark && styles.iconCircleDark, complete && styles.iconCircleComplete]}>
          <Text allowFontScaling={false} style={[styles.iconGlyph, complete && styles.iconGlyphComplete, isDark && styles.iconGlyphDark]}>
            {complete ? "✓" : "◷"}
          </Text>
        </View>
        <Text style={[styles.message, isDark && styles.messageDark]}>{message}</Text>
      </View>

      <View style={styles.progressRow}>
        <Text style={[styles.progressLabel, isDark && styles.progressLabelDark]}>{filled}/{total}</Text>
        <View style={[styles.progressTrack, isDark && styles.progressTrackDark]}>
          <View style={[styles.progressFill, complete && styles.progressFillComplete, { width: `${progressPct * 100}%` }]} />
        </View>
      </View>
    </View>
  );
}

const createStyles = () => StyleSheet.create({
  card: {
    backgroundColor: activeColors.surface,
    borderWidth: 1,
    borderColor: activeColors.borderSubtle,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    overflow: "hidden",
    position: "relative"
  },
  cardDark: {
    backgroundColor: "#121C29"
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  sectionTitle: {
    color: activeColors.textGray,
    fontFamily: "Inter",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1
  },
  sectionTitleDark: {
    color: "#8EA3B8"
  },
  ctaBtn: {
    backgroundColor: activeColors.primarySoft,
    borderRadius: 14,
    paddingVertical: 4,
    paddingHorizontal: 12
  },
  ctaBtnDark: {
    backgroundColor: "#2A3A50"
  },
  ctaBtnLabel: {
    color: activeColors.primaryDeep,
    fontFamily: "Inter",
    fontSize: 12,
    fontWeight: "700"
  },
  ctaBtnLabelDark: {
    color: "#C2E522"
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: activeColors.surfaceTintWarning,
    alignItems: "center",
    justifyContent: "center"
  },
  iconCircleDark: {
    backgroundColor: "#2D2413"
  },
  iconCircleComplete: {
    backgroundColor: activeColors.primarySoftAlt
  },
  iconGlyph: {
    fontSize: 14,
    fontWeight: "800",
    color: activeColors.warningDeep,
    lineHeight: 15
  },
  iconGlyphComplete: {
    color: activeColors.primaryDeep
  },
  iconGlyphDark: {
    color: "#F4C15D"
  },
  message: {
    flex: 1,
    color: activeColors.textStrong,
    fontFamily: "Inter",
    fontSize: 13,
    lineHeight: 16
  },
  messageDark: {
    color: "#D8E1EC"
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  progressLabel: {
    color: activeColors.textGray,
    fontFamily: "Inter",
    fontSize: 12,
    fontWeight: "600"
  },
  progressLabelDark: {
    color: "#8EA3B8"
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: activeColors.surfaceMuted,
    borderRadius: 3,
    overflow: "hidden"
  },
  progressTrackDark: {
    backgroundColor: "#1F2D40"
  },
  progressFill: {
    height: "100%",
    backgroundColor: activeColors.warning,
    borderRadius: 3
  },
  progressFillComplete: {
    backgroundColor: activeColors.primaryStrong
  }
});

let styles = createStyles();
