import { useCallback, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getColors } from "@fulbito/design-tokens";
import type { ColorTokens } from "@fulbito/design-tokens";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from "react-native-reanimated";
import type { LeaderboardStatsRow, LeaderboardAward } from "@fulbito/domain";
import { CardSideAccentGradient } from "@/components/MatchCardVisuals";
import { useThemePreference } from "@/state/ThemePreferenceContext";
import { useThemeColors } from "@/theme/useThemeColors";

interface LeaderboardOverviewCardProps {
  groupLabel: string;
  row: LeaderboardStatsRow;
  awards?: LeaderboardAward[];
  currentUserId?: string;
  onPress?: () => void;
}

let activeColors: ColorTokens = getColors("light");

function getAwardGlyph(): Record<string, { icon: string; tone: string }> {
  return {
    nostradamus: { icon: "✣", tone: activeColors.primaryStrong },
    bilardista: { icon: "◻", tone: activeColors.slate },
    "la-racha": { icon: "◔", tone: activeColors.warning },
    batacazo: { icon: "⚡", tone: activeColors.warning },
    "robin-hood": { icon: "◎", tone: activeColors.successAccent },
    "el-casi": { icon: "⌖", tone: activeColors.info },
    "el-mufa": { icon: "☂", tone: activeColors.slateMuted }
  };
}
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const CHEVRON_PRESS_IN_SPRING = {
  damping: 20,
  stiffness: 430,
  mass: 0.4
} as const;
const CHEVRON_PRESS_OUT_SPRING = {
  damping: 17,
  stiffness: 340,
  mass: 0.45
} as const;

export function LeaderboardOverviewCard({ groupLabel, row, awards, currentUserId, onPress }: LeaderboardOverviewCardProps) {
  const themeColors = useThemeColors();
  activeColors = themeColors;
  styles = useMemo(() => createStyles(), [themeColors]);
  const { themePreference } = useThemePreference();
  const isDark = themePreference === "dark";
  const reducedMotion = useReducedMotion();
  const chevronScale = useSharedValue(1);
  const delta = row.deltaRank ?? 0;
  const streak = row.streak ?? 0;
  const myAwards = awards?.filter((a) => a.winnerUserId === (row.userId ?? currentUserId)) ?? [];
  const chevronAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: chevronScale.value }]
  }));

  const handleChevronPressIn = useCallback(() => {
    if (reducedMotion) {
      chevronScale.value = 1;
      return;
    }
    chevronScale.value = withSpring(0.92, CHEVRON_PRESS_IN_SPRING);
  }, [chevronScale, reducedMotion]);

  const handleChevronPressOut = useCallback(() => {
    if (reducedMotion) {
      chevronScale.value = 1;
      return;
    }
    chevronScale.value = withSpring(1, CHEVRON_PRESS_OUT_SPRING);
  }, [chevronScale, reducedMotion]);

  const awardGlyph = getAwardGlyph();
  const awardBadges = myAwards.map((award) => {
    const visual = awardGlyph[award.id] ?? { icon: "◈", tone: activeColors.trophy };
    return { icon: visual.icon, tone: visual.tone, label: award.title };
  });

  const flameColor = streak > 0 ? activeColors.warning : activeColors.textMuted;
  const streakLabel = streak > 0 ? `Racha: ${streak} aciertos` : "Sin racha";

  const podiumConfig: Record<number, { color: string; label: string }> = {
    1: { color: activeColors.trophy, label: "1° lugar" },
    2: { color: activeColors.slate, label: "2° lugar" },
    3: { color: activeColors.warningMuted, label: "3° lugar" }
  };
  const podium = podiumConfig[row.rank];

  return (
    <View style={[styles.card, isDark && styles.cardDark]}>
      <CardSideAccentGradient color={activeColors.primaryStrong} intensity={0.07} side="left" widthPct={28} />
      <View style={styles.headerRow}>
        <Text style={[styles.header, isDark && styles.headerDark]}>{groupLabel.toUpperCase()}</Text>
        {onPress && (
          <AnimatedPressable
            accessibilityRole="button"
            onPress={onPress}
            onPressIn={handleChevronPressIn}
            onPressOut={handleChevronPressOut}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={chevronAnimatedStyle}
          >
            <Ionicons name="chevron-forward" size={18} color={isDark ? "#93A4B8" : activeColors.textGray} />
          </AnimatedPressable>
        )}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.col}>
          <Text style={[styles.label, isDark && styles.labelDark]}>Tu Posición</Text>
          <View style={styles.posRow}>
            <Text style={[styles.bigNum, isDark && styles.bigNumDark]}>#{row.rank}</Text>
            {delta !== 0 && (
              <View style={[styles.badge, delta > 0 ? styles.badgeUp : styles.badgeDown]}>
                <Text style={[styles.badgeText, delta > 0 ? styles.badgeTextUp : styles.badgeTextDown]}>
                  {delta > 0 ? `▲ +${delta}` : `▼ ${delta}`}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.col, styles.colRight]}>
          <Text style={[styles.label, isDark && styles.labelDark]}>Puntos</Text>
          <Text style={[styles.bigNum, isDark && styles.bigNumDark]}>{row.points}</Text>
        </View>
      </View>

      <View style={[styles.divider, isDark && styles.dividerDark]} />
      <View style={styles.badgesRow}>
        {podium && (
          <View style={[styles.pill, isDark && styles.pillDark]}>
            <Ionicons name="trophy" size={14} color={podium.color} />
            <Text style={[styles.pillText, isDark && styles.pillTextDark]}>{podium.label}</Text>
          </View>
        )}
        <View style={[styles.pill, isDark && styles.pillDark]}>
          <Ionicons name="flame" size={14} color={flameColor} />
          <Text style={[styles.pillText, isDark && styles.pillTextDark]}>{streakLabel}</Text>
        </View>
        {awardBadges.map((b, i) => (
          <View key={i} style={[styles.pill, isDark && styles.pillDark]}>
            <Text allowFontScaling={false} style={[styles.pillIcon, { color: b.tone }]}>{b.icon}</Text>
            <Text style={[styles.pillText, isDark && styles.pillTextDark]}>{b.label}</Text>
          </View>
        ))}
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
    padding: 20,
    paddingBottom: 16,
    gap: 14,
    overflow: "hidden",
    position: "relative"
  },
  cardDark: {
    backgroundColor: "#121C29"
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  header: {
    color: activeColors.textGray,
    fontFamily: "Inter",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2
  },
  headerDark: {
    color: "#8EA3B8"
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  col: {
    gap: 4
  },
  colRight: {
    alignItems: "flex-end"
  },
  label: {
    color: activeColors.textGray,
    fontSize: 12
  },
  labelDark: {
    color: "#8EA3B8"
  },
  posRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  bigNum: {
    color: activeColors.textHigh,
    fontSize: 40,
    fontWeight: "800",
    lineHeight: 40
  },
  bigNumDark: {
    color: "#E7EEF8"
  },
  badge: {
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 2
  },
  badgeUp: {
    backgroundColor: "#DCFCE7"
  },
  badgeDown: {
    backgroundColor: "#FEE2E2"
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600"
  },
  badgeTextUp: {
    color: "#16A34A"
  },
  badgeTextDown: {
    color: "#DC2626"
  },
  divider: {
    height: 1,
    backgroundColor: activeColors.borderLight
  },
  dividerDark: {
    backgroundColor: "#243449"
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  pill: {
    backgroundColor: activeColors.surfaceMuted,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12
  },
  pillDark: {
    backgroundColor: "#1C2A3D"
  },
  pillIcon: {
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 16
  },
  pillText: {
    color: activeColors.iconStrong,
    fontSize: 12,
    fontWeight: "500"
  },
  pillTextDark: {
    color: "#C3D0DE"
  }
});

let styles = createStyles();
