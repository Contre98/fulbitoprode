import { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@fulbito/design-tokens";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from "react-native-reanimated";
import { CardSideAccentGradient } from "@/components/MatchCardVisuals";

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

export function UrgentActionCard({ message, filled, total, complete, onPress }: UrgentActionCardProps) {
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
    <View style={styles.card}>
      <CardSideAccentGradient color={colors.primaryStrong} intensity={0.07} side="left" widthPct={28} />
      <View style={styles.topRow}>
        <Text style={styles.sectionTitle}>
          {complete ? "PRONÓSTICOS COMPLETOS" : "PRONÓSTICOS PENDIENTES"}
        </Text>
        {!complete && (
          <AnimatedPressable
            accessibilityRole="button"
            style={[styles.ctaBtn, ctaAnimatedStyle]}
            onPress={onPress}
            onPressIn={handleCtaPressIn}
            onPressOut={handleCtaPressOut}
          >
            <Text style={styles.ctaBtnLabel}>Jugar</Text>
          </AnimatedPressable>
        )}
      </View>

      <View style={styles.messageRow}>
        <View style={[styles.iconCircle, complete && styles.iconCircleComplete]}>
          <Text allowFontScaling={false} style={[styles.iconGlyph, complete && styles.iconGlyphComplete]}>
            {complete ? "✓" : "◷"}
          </Text>
        </View>
        <Text style={styles.message}>{message}</Text>
      </View>

      <View style={styles.progressRow}>
        <Text style={styles.progressLabel}>{filled}/{total}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, complete && styles.progressFillComplete, { width: `${progressPct * 100}%` }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    overflow: "hidden",
    position: "relative"
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  sectionTitle: {
    color: colors.textGray,
    fontFamily: "Inter",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1
  },
  ctaBtn: {
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    paddingVertical: 4,
    paddingHorizontal: 12
  },
  ctaBtnLabel: {
    color: colors.primaryDeep,
    fontFamily: "Inter",
    fontSize: 12,
    fontWeight: "700"
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
    backgroundColor: colors.surfaceTintWarning,
    alignItems: "center",
    justifyContent: "center"
  },
  iconCircleComplete: {
    backgroundColor: colors.primarySoftAlt
  },
  iconGlyph: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.warningDeep,
    lineHeight: 15
  },
  iconGlyphComplete: {
    color: colors.primaryDeep
  },
  message: {
    flex: 1,
    color: colors.textStrong,
    fontFamily: "Inter",
    fontSize: 13,
    lineHeight: 16
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  progressLabel: {
    color: colors.textGray,
    fontFamily: "Inter",
    fontSize: 12,
    fontWeight: "600"
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 3,
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.warning,
    borderRadius: 3
  },
  progressFillComplete: {
    backgroundColor: colors.primaryStrong
  }
});
