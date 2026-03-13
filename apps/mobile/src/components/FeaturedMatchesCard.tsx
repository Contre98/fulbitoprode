import { useMemo } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@fulbito/design-tokens";
import type { Fixture, Prediction } from "@fulbito/domain";
import { TeamCrest } from "@/components/TeamCrest";
import { LivePulseBorder, useLivePulse } from "@/components/LiveMatchIndicator";
import { FormDots, MatchSideGradient } from "@/components/MatchCardVisuals";
import { formatShortDateTime24 } from "@/lib/dateTime";
import { buildTeamFormLookup, teamPredominantColor } from "@/lib/matchVisuals";

interface FeaturedMatchesCardProps {
  fixtures: Fixture[];
  formFixtures?: Fixture[];
  predictions: Prediction[];
  onPressPrediction?: (fixtureId: string) => void;
}

function toTeamCode(name: string): string {
  return name.replace(/\s+/g, "").slice(0, 3).toUpperCase();
}

export function FeaturedMatchesCard({ fixtures, formFixtures, predictions, onPressPrediction }: FeaturedMatchesCardProps) {
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
      <Text style={styles.sectionTitle}>PARTIDOS DESTACADOS</Text>
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
  const isLive = fixture.status === "live";
  const homeColor = teamPredominantColor(fixture.homeTeam);
  const awayColor = teamPredominantColor(fixture.awayTeam);

  const card = (
    <View style={[styles.card, isLive && styles.cardLive]}>
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
  const homeCode = toTeamCode(fixture.homeTeam);
  const awayCode = toTeamCode(fixture.awayTeam);

  return (
    <View style={styles.matchRow}>
      <View style={styles.teamBlock}>
        <TeamCrest teamName={fixture.homeTeam} code={homeCode} logoUrl={fixture.homeLogoUrl} />
        <View style={styles.teamInfoCol}>
          <Text allowFontScaling={false} numberOfLines={1} style={styles.teamCode}>{homeCode}</Text>
          <FormDots form={homeForm} />
        </View>
      </View>

      <StatusScorePill fixture={fixture} />

      <View style={[styles.teamBlock, styles.teamBlockRight]}>
        <View style={[styles.teamInfoCol, styles.teamInfoColRight]}>
          <Text allowFontScaling={false} numberOfLines={1} style={styles.teamCode}>{awayCode}</Text>
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
  const livePulseOpacity = useLivePulse();
  const isLive = fixture.status === "live";
  const statusText = statusTextForFixture(fixture);

  return (
    <View style={[styles.resultPill, !isLive ? styles.resultPillUpcoming : null]}>
      {isLive ? (
        <Animated.Text allowFontScaling={false} style={[styles.resultSub, styles.resultSubLive, { opacity: livePulseOpacity }]}>
          {statusText}
        </Animated.Text>
      ) : (
        <Text allowFontScaling={false} style={styles.resultSub}>{statusText}</Text>
      )}
      <Text allowFontScaling={false} style={styles.resultText}>
        - : -
      </Text>
    </View>
  );
}

/* ─── Kickoff Row ────────────────────────────────────────────── */

function KickoffRow({ fixture }: { fixture: Fixture }) {
  const kickoffLabel = formatShortDateTime24(fixture.kickoffAt);

  return (
    <View style={styles.timeRow}>
      <Text allowFontScaling={false} style={styles.kickoffBadge}>{kickoffLabel}</Text>
    </View>
  );
}

/* ─── Live Prediction Row ────────────────────────────────────── */

function LivePredictionRow({ fixture, prediction }: { fixture: Fixture; prediction: Prediction }) {
  const statusLabel = getPointsStatus(fixture, prediction);

  return (
    <View style={styles.footerChip}>
      <Text allowFontScaling={false} style={styles.footerChipText}>
        Tu pronóstico: {prediction.home} - {prediction.away}
      </Text>
      {statusLabel && (
        <Text allowFontScaling={false} style={[styles.footerChipText, { color: statusLabel.color }]}>
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
  const label = prediction
    ? `Editar Pronóstico (${prediction.home} - ${prediction.away})`
    : "Cargar Pronóstico";

  return (
    <Pressable
      style={({ pressed }) => [styles.editBtn, pressed && styles.editBtnPressed]}
      onPress={onPress}
    >
      <Text allowFontScaling={false} style={styles.editBtnText}>{label}</Text>
    </Pressable>
  );
}

/* ─── Helpers ────────────────────────────────────────────────── */

function getPointsStatus(fixture: Fixture, prediction?: Prediction): { text: string; color: string } | null {
  if (!prediction || !fixture.score) return null;
  const { home: pH, away: pA } = prediction;
  const { home: sH, away: sA } = fixture.score;

  if (pH === sH && pA === sA) return { text: "Exacto +3 pts", color: colors.successDeep };
  const predOutcome = Math.sign(pH - pA);
  const scoreOutcome = Math.sign(sH - sA);
  if (predOutcome === scoreOutcome) return { text: "Resultado +1 pt", color: colors.primaryStrong };
  return { text: "Perdiendo 0 pts", color: colors.dangerAccent };
}

/* ─── Styles ─────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  wrapper: {
    gap: 10
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 2
  },
  card: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    overflow: "hidden",
    position: "relative"
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
    color: colors.textHigh,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.3
  },

  /* Result pill */
  resultPill: {
    minWidth: 132,
    borderRadius: 10,
    backgroundColor: colors.brandTintAlt,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 8
  },
  resultPillUpcoming: {
    backgroundColor: colors.surfaceTintNeutral,
    borderWidth: 1,
    borderColor: colors.borderMutedAlt
  },
  resultText: {
    color: colors.textHigh,
    fontWeight: "900",
    fontSize: 18
  },
  resultSub: {
    marginTop: 1,
    color: colors.textGray,
    fontSize: 12,
    fontWeight: "800"
  },
  resultSubLive: {
    color: colors.dangerAccent
  },

  /* Kickoff badge */
  timeRow: {
    alignItems: "center"
  },
  kickoffBadge: {
    color: colors.textSoftAlt,
    fontSize: 12,
    fontWeight: "800"
  },

  /* Footer chip (live prediction) */
  footerChip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderMutedSoft,
    backgroundColor: colors.surfaceTintCard,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8
  },
  footerChipText: {
    color: colors.textSteel,
    fontSize: 12,
    fontWeight: "700"
  },

  /* Edit prediction button */
  editBtn: {
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  editBtnPressed: {
    opacity: 0.8
  },
  editBtnText: {
    color: colors.primaryDeep,
    fontSize: 13,
    fontWeight: "700"
  }
});
