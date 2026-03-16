import { useCallback, useMemo } from "react";
import { Animated as NativeAnimated, Pressable, StyleSheet, Text, View } from "react-native";
import { getColors } from "@fulbito/design-tokens";
import type { ColorTokens } from "@fulbito/design-tokens";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from "react-native-reanimated";
import type { Fixture, Prediction } from "@fulbito/domain";
import { TeamCrest } from "@/components/TeamCrest";
import { LivePulseBorder, estimateMatchMinute, useLivePulse } from "@/components/LiveMatchIndicator";
import { FormDots, MatchSideGradient } from "@/components/MatchCardVisuals";
import { formatShortDateTime24 } from "@/lib/dateTime";
import { buildTeamFormLookup, teamPredominantColor } from "@/lib/matchVisuals";
import { useThemePreference } from "@/state/ThemePreferenceContext";
import { useThemeColors } from "@/theme/useThemeColors";

interface FeaturedMatchesCardProps {
  fixtures: Fixture[];
  formFixtures?: Fixture[];
  predictions: Prediction[];
  onPressPrediction?: (fixtureId: string) => void;
}
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const EDIT_CTA_PRESS_IN_SPRING = {
  damping: 22,
  stiffness: 420,
  mass: 0.4
} as const;
const EDIT_CTA_PRESS_OUT_SPRING = {
  damping: 18,
  stiffness: 340,
  mass: 0.45
} as const;
let activeColors: ColorTokens = getColors("light");

function toTeamCode(name: string): string {
  return name.replace(/\s+/g, "").slice(0, 3).toUpperCase();
}

export function FeaturedMatchesCard({ fixtures, formFixtures, predictions, onPressPrediction }: FeaturedMatchesCardProps) {
  const themeColors = useThemeColors();
  activeColors = themeColors;
  styles = useMemo(() => createStyles(), [themeColors]);
  const { themePreference } = useThemePreference();
  const isDark = themePreference === "dark";
  const featured = fixtures
    .filter((f) => f.status === "live" || f.status === "upcoming")
    .sort((a, b) => {
      if (a.status === "live" && b.status !== "live") return -1;
      if (a.status !== "live" && b.status === "live") return 1;
      return new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime();
    })
    .slice(0, 4);
  const formLookup = useMemo(() => buildTeamFormLookup(formFixtures ?? fixtures), [formFixtures, fixtures]);

  if (featured.length === 0) return null;

  const predictionFor = (fixtureId: string) => predictions.find((p) => p.fixtureId === fixtureId);

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>PARTIDOS DESTACADOS</Text>
      {featured.map((fixture) => (
        <MatchCard
          key={fixture.id}
          fixture={fixture}
          homeForm={formLookup(fixture.homeTeam, fixture.kickoffAt)}
          awayForm={formLookup(fixture.awayTeam, fixture.kickoffAt)}
          prediction={predictionFor(fixture.id)}
          onPressPrediction={onPressPrediction}
        />
      ))}
    </View>
  );
}

/* ─── Single Match Card ──────────────────────────────────────── */

function MatchCard({
  fixture,
  homeForm,
  awayForm,
  prediction,
  onPressPrediction
}: {
  fixture: Fixture;
  homeForm: ("win" | "draw" | "loss" | "none")[];
  awayForm: ("win" | "draw" | "loss" | "none")[];
  prediction?: Prediction;
  onPressPrediction?: (fixtureId: string) => void;
}) {
  const themeColors = useThemeColors();
  activeColors = themeColors;
  styles = useMemo(() => createStyles(), [themeColors]);
  const { themePreference } = useThemePreference();
  const isDark = themePreference === "dark";
  const isLive = fixture.status === "live";
  const homeColor = teamPredominantColor(fixture.homeTeam);
  const awayColor = teamPredominantColor(fixture.awayTeam);

  const card = (
    <View style={[styles.card, isLive && styles.cardLive, isDark && styles.cardDark]}>
      <MatchSideGradient homeColor={homeColor} awayColor={awayColor} intensity={0.09} />
      <View style={styles.cardContent}>
        <MatchRow fixture={fixture} homeForm={homeForm} awayForm={awayForm} />
        <KickoffRow fixture={fixture} />
        {isLive && prediction && <LivePredictionRow fixture={fixture} prediction={prediction} />}
        {!isLive && onPressPrediction && (
          <EditPredictionButton
            fixture={fixture}
            prediction={prediction}
            onPress={() => onPressPrediction(fixture.id)}
          />
        )}
      </View>
    </View>
  );

  if (isLive) return <LivePulseBorder>{card}</LivePulseBorder>;
  return card;
}

/* ─── Match Row ──────────────────────────────────────────────── */

function MatchRow({
  fixture,
  homeForm,
  awayForm
}: {
  fixture: Fixture;
  homeForm: ("win" | "draw" | "loss" | "none")[];
  awayForm: ("win" | "draw" | "loss" | "none")[];
}) {
  const themeColors = useThemeColors();
  activeColors = themeColors;
  styles = useMemo(() => createStyles(), [themeColors]);
  const { themePreference } = useThemePreference();
  const isDark = themePreference === "dark";
  const homeCode = toTeamCode(fixture.homeTeam);
  const awayCode = toTeamCode(fixture.awayTeam);

  return (
    <View style={styles.matchRow}>
      <View style={styles.teamBlock}>
        <TeamCrest teamName={fixture.homeTeam} code={homeCode} logoUrl={fixture.homeLogoUrl} />
        <View style={styles.teamInfoCol}>
          <Text allowFontScaling={false} numberOfLines={1} style={[styles.teamCode, isDark && styles.teamCodeDark]}>{homeCode}</Text>
          <FormDots form={homeForm} />
        </View>
      </View>

      <StatusScorePill fixture={fixture} />

      <View style={[styles.teamBlock, styles.teamBlockRight]}>
        <View style={[styles.teamInfoCol, styles.teamInfoColRight]}>
          <Text allowFontScaling={false} numberOfLines={1} style={[styles.teamCode, isDark && styles.teamCodeDark]}>{awayCode}</Text>
          <FormDots form={awayForm} align="right" />
        </View>
        <TeamCrest teamName={fixture.awayTeam} code={awayCode} logoUrl={fixture.awayLogoUrl} />
      </View>
    </View>
  );
}

function statusTextForFixture(fixture: Fixture): string {
  if (fixture.status === "live") return "EN VIVO";
  if (fixture.status === "postponed") return "POSTERGADO";
  if (fixture.status === "final") return "FINAL";
  return "PRÓXIMO";
}

function StatusScorePill({ fixture }: { fixture: Fixture }) {
  const themeColors = useThemeColors();
  activeColors = themeColors;
  styles = useMemo(() => createStyles(), [themeColors]);
  const { themePreference } = useThemePreference();
  const isDark = themePreference === "dark";
  const livePulseOpacity = useLivePulse();
  const isLive = fixture.status === "live";
  const statusText = statusTextForFixture(fixture);
  const liveMinute = isLive ? estimateMatchMinute(fixture.kickoffAt) : "";
  const scoreText = fixture.score ? `${fixture.score.home} : ${fixture.score.away}` : "- : -";

  return (
    <View style={[styles.resultPill, !isLive ? styles.resultPillUpcoming : null, isDark && styles.resultPillDark, isDark && !isLive ? styles.resultPillUpcomingDark : null]}>
      {isLive ? (
        <NativeAnimated.Text allowFontScaling={false} style={[styles.resultSub, styles.resultSubLive, isDark && styles.resultSubDark, { opacity: livePulseOpacity }]}>
          {liveMinute || "0'"}
        </NativeAnimated.Text>
      ) : (
        <Text allowFontScaling={false} style={[styles.resultSub, isDark && styles.resultSubDark]}>{statusText}</Text>
      )}
      <Text allowFontScaling={false} style={[styles.resultText, isDark && styles.resultTextDark]}>
        {scoreText}
      </Text>
    </View>
  );
}

/* ─── Kickoff Row ────────────────────────────────────────────── */

function KickoffRow({ fixture }: { fixture: Fixture }) {
  const themeColors = useThemeColors();
  activeColors = themeColors;
  styles = useMemo(() => createStyles(), [themeColors]);
  const { themePreference } = useThemePreference();
  const isDark = themePreference === "dark";
  return (
    <View style={styles.timeRow}>
      <Text allowFontScaling={false} style={[styles.kickoffBadge, isDark && styles.kickoffBadgeDark]}>{formatShortDateTime24(fixture.kickoffAt)}</Text>
    </View>
  );
}

/* ─── Live Prediction Row ────────────────────────────────────── */

function LivePredictionRow({ fixture, prediction }: { fixture: Fixture; prediction: Prediction }) {
  const themeColors = useThemeColors();
  activeColors = themeColors;
  styles = useMemo(() => createStyles(), [themeColors]);
  const { themePreference } = useThemePreference();
  const isDark = themePreference === "dark";
  const statusLabel = getPointsStatus(fixture, prediction);

  return (
    <View style={[styles.footerChip, isDark && styles.footerChipDark]}>
      <Text allowFontScaling={false} style={[styles.footerChipText, isDark && styles.footerChipTextDark]}>
        Tu pronóstico: {prediction.home} - {prediction.away}
      </Text>
      {statusLabel && (
        <Text allowFontScaling={false} style={[styles.footerChipText, isDark && styles.footerChipTextDark, { color: statusLabel.color }]}>
          {statusLabel.text}
        </Text>
      )}
    </View>
  );
}

/* ─── Edit Prediction Button ─────────────────────────────────── */

function EditPredictionButton({
  fixture,
  prediction,
  onPress
}: {
  fixture: Fixture;
  prediction?: Prediction;
  onPress: () => void;
}) {
  const themeColors = useThemeColors();
  activeColors = themeColors;
  styles = useMemo(() => createStyles(), [themeColors]);
  const { themePreference } = useThemePreference();
  const isDark = themePreference === "dark";
  const reducedMotion = useReducedMotion();
  const buttonScale = useSharedValue(1);
  const label = prediction
    ? `Editar Pronóstico (${prediction.home} - ${prediction.away})`
    : "Cargar Pronóstico";
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }]
  }));

  const handlePressIn = useCallback(() => {
    if (reducedMotion) {
      buttonScale.value = 1;
      return;
    }
    buttonScale.value = withSpring(0.97, EDIT_CTA_PRESS_IN_SPRING);
  }, [buttonScale, reducedMotion]);

  const handlePressOut = useCallback(() => {
    if (reducedMotion) {
      buttonScale.value = 1;
      return;
    }
    buttonScale.value = withSpring(1, EDIT_CTA_PRESS_OUT_SPRING);
  }, [buttonScale, reducedMotion]);

  return (
    <AnimatedPressable
      accessibilityRole="button"
      style={[styles.editBtn, isDark && styles.editBtnDark, buttonAnimatedStyle]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Text allowFontScaling={false} style={[styles.editBtnText, isDark && styles.editBtnTextDark]}>{label}</Text>
    </AnimatedPressable>
  );
}

/* ─── Helpers ────────────────────────────────────────────────── */

function getPointsStatus(fixture: Fixture, prediction?: Prediction): { text: string; color: string } | null {
  if (!prediction || !fixture.score) return null;
  const { home: pH, away: pA } = prediction;
  const { home: sH, away: sA } = fixture.score;

  if (pH === sH && pA === sA) return { text: "Exacto +3 pts", color: activeColors.successDeep };
  const predOutcome = Math.sign(pH - pA);
  const scoreOutcome = Math.sign(sH - sA);
  if (predOutcome === scoreOutcome) return { text: "Resultado +1 pt", color: activeColors.primaryStrong };
  return { text: "Perdiendo 0 pts", color: activeColors.dangerAccent };
}

/* ─── Styles ─────────────────────────────────────────────────── */

const createStyles = () => StyleSheet.create({
  wrapper: {
    gap: 10
  },
  sectionTitle: {
    color: activeColors.textMuted,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 2
  },
  sectionTitleDark: {
    color: "#8EA3B8"
  },
  card: {
    backgroundColor: activeColors.surfaceSoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: activeColors.borderSubtle,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    overflow: "hidden",
    position: "relative"
  },
  cardDark: {
    backgroundColor: "#121C29",
    borderColor: "#2A3A50"
  },
  cardContent: {
    gap: 8
  },
  cardLive: {
    borderWidth: 0
  },

  /* Match row */
  matchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6
  },
  teamBlock: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7
  },
  teamInfoCol: {
    flexShrink: 1
  },
  teamInfoColRight: {
    alignItems: "flex-end"
  },
  teamBlockRight: {
    justifyContent: "flex-end"
  },
  teamCode: {
    color: activeColors.textHigh,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.3
  },
  teamCodeDark: {
    color: "#E7EEF8"
  },

  /* Result pill */
  resultPill: {
    minWidth: 132,
    borderRadius: 10,
    backgroundColor: activeColors.brandTintAlt,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 8
  },
  resultPillDark: {
    backgroundColor: "#22344A"
  },
  resultPillUpcoming: {
    backgroundColor: activeColors.surfaceTintNeutral,
    borderWidth: 1,
    borderColor: activeColors.borderMutedAlt
  },
  resultPillUpcomingDark: {
    backgroundColor: "#1A2738",
    borderColor: "#324963"
  },
  resultText: {
    color: activeColors.textHigh,
    fontWeight: "900",
    fontSize: 18
  },
  resultTextDark: {
    color: "#E7EEF8"
  },
  resultSub: {
    marginTop: 1,
    color: activeColors.textGray,
    fontSize: 12,
    fontWeight: "800"
  },
  resultSubDark: {
    color: "#9AAFC4"
  },
  resultSubLive: {
    color: activeColors.dangerAccent
  },

  /* Kickoff badge */
  timeRow: {
    alignItems: "center"
  },
  kickoffBadge: {
    color: activeColors.textSoftAlt,
    fontSize: 12,
    fontWeight: "800"
  },
  kickoffBadgeDark: {
    color: "#93A4B8"
  },

  /* Footer chip (live prediction) */
  footerChip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: activeColors.borderMutedSoft,
    backgroundColor: activeColors.surfaceTintCard,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8
  },
  footerChipDark: {
    borderColor: "#324963",
    backgroundColor: "#1A2738"
  },
  footerChipText: {
    color: activeColors.textSteel,
    fontSize: 12,
    fontWeight: "700"
  },
  footerChipTextDark: {
    color: "#C3D0DE"
  },

  /* Edit prediction button */
  editBtn: {
    borderRadius: 12,
    minHeight: 38,
    borderWidth: 1,
    borderColor: activeColors.borderMutedSoft,
    backgroundColor: activeColors.surfaceTintCard,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
    overflow: "hidden",
    position: "relative"
  },
  editBtnDark: {
    borderColor: "#324963",
    backgroundColor: "#162536"
  },
  editBtnText: {
    color: activeColors.textGray,
    fontSize: 13,
    fontWeight: "700"
  },
  editBtnTextDark: {
    color: "#AFC2D8"
  }
});

let styles = createStyles();
