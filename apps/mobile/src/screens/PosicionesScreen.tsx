import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@fulbito/design-tokens";
import { leaderboardRepository } from "@/repositories";
import { useGroupSelection } from "@/state/GroupContext";
import { usePeriod } from "@/state/PeriodContext";
import { ScreenFrame } from "@/components/ScreenFrame";
import { HeaderGroupSelector } from "@/components/HeaderGroupSelector";
import { HeaderActionIcons } from "@/components/HeaderActionIcons";
import { FechaSelector } from "@/components/FechaSelector";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";

type PosicionesMode = "positions" | "stats";

const awardVisualById: Record<string, { icon: string; tone: string }> = {
  nostradamus: { icon: "✣", tone: colors.primaryStrong },
  bilardista: { icon: "◻", tone: colors.slate },
  "la-racha": { icon: "◔", tone: colors.warning },
  batacazo: { icon: "⚡", tone: colors.warning },
  "robin-hood": { icon: "◎", tone: colors.successAccent },
  "el-casi": { icon: "⌖", tone: colors.info },
  "el-mufa": { icon: "☂", tone: colors.slateMuted }
};

function stageLabel(value: string | undefined) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function competitionLabelForPosiciones(input: {
  competitionStage?: string;
  competitionName?: string;
  leagueName?: string;
}) {
  return stageLabel(input.competitionStage?.trim()) || input.competitionName?.trim() || input.leagueName?.trim() || "Sin competencia";
}

export function PosicionesScreen() {
  const insets = useSafeAreaInsets();
  const { memberships, selectedGroupId, setSelectedGroupId } = useGroupSelection();
  const { fecha, options } = usePeriod();
  const [mode, setMode] = useState<PosicionesMode>("positions");
  const [positionsPeriod, setPositionsPeriod] = useState("global");

  const groupId = memberships.find((membership) => membership.groupId === selectedGroupId)?.groupId ?? memberships[0]?.groupId ?? "grupo-1";
  const selectedMembership = useMemo(
    () => memberships.find((membership) => membership.groupId === groupId) ?? memberships[0],
    [groupId, memberships]
  );
  const positionsCycleOptions = useMemo(() => {
    const fallbackOption = fecha ? [{ id: fecha, label: fecha }] : [];
    const roundOptions = (options.length > 0 ? options : fallbackOption).filter((option) => option.id !== "global");
    return [{ id: "global", label: "Global acumulado" }, ...roundOptions];
  }, [fecha, options]);
  const currentPositionsOptionIndex = positionsCycleOptions.findIndex((option) => option.id === positionsPeriod);
  const resolvedPositionsOptionIndex = currentPositionsOptionIndex >= 0 ? currentPositionsOptionIndex : 0;

  useEffect(() => {
    if (!positionsCycleOptions.some((option) => option.id === positionsPeriod)) {
      setPositionsPeriod("global");
    }
  }, [positionsCycleOptions, positionsPeriod]);

  const selectedLeaderboardPeriod = mode === "positions" ? positionsPeriod : fecha;

  const leaderboardQuery = useQuery({
    queryKey: ["leaderboard-payload", groupId, selectedLeaderboardPeriod, mode],
    queryFn: () =>
      leaderboardRepository.getLeaderboardPayload({
        groupId,
        fecha: selectedLeaderboardPeriod,
        mode: mode === "stats" ? "stats" : "posiciones"
      })
  });

  const entries = leaderboardQuery.data?.rows ?? [];
  const summary = leaderboardQuery.data?.stats?.summary ?? null;
  const awards = leaderboardQuery.data?.stats?.awards ?? [];
  const historicalSeries = leaderboardQuery.data?.stats?.historicalSeries ?? [];
  const tableGroupLabel = leaderboardQuery.data?.groupLabel?.trim() || selectedMembership?.groupName || "Grupo";
  const tablePeriodLabel = leaderboardQuery.data?.periodLabel?.trim() || "Acumulado";
  const qualificationCutoff = Math.min(8, Math.max(1, entries.length));
  const performanceMetrics = [
    { key: "exact", label: "Aciertos exactos", value: summary?.exactPredictions ?? 0 },
    { key: "result", label: "Resultado", value: summary?.resultPredictions ?? 0 },
    { key: "miss", label: "Sin acierto", value: summary?.missPredictions ?? 0 },
    { key: "accuracy", label: "Precisión", value: `${summary?.accuracyPct ?? 0}%` },
    {
      key: "average",
      label: "Promedio x miembro",
      value:
        summary && Number.isInteger(summary.averageMemberPoints)
          ? String(summary.averageMemberPoints)
          : (summary?.averageMemberPoints ?? 0).toFixed(1)
    }
  ];

  const trendRows = useMemo(
    () =>
      historicalSeries
        .map((series) => {
          const points = series.points ?? [];
          const last = points[points.length - 1];
          const bestRank = points.length > 0 ? Math.min(...points.map((point) => point.rank)) : 0;
          const totalPoints = points.reduce((acc, point) => acc + point.points, 0);
          return {
            userId: series.userId,
            userName: series.userName,
            latestPeriodLabel: last?.periodLabel ?? "-",
            latestRank: last?.rank ?? 0,
            latestPoints: last?.points ?? 0,
            bestRank,
            totalPoints
          };
        })
        .sort((a, b) => a.bestRank - b.bestRank || b.totalPoints - a.totalPoints || a.userName.localeCompare(b.userName, "es")),
    [historicalSeries]
  );

  function swipeToPreviousPeriod() {
    if (mode !== "positions" || positionsCycleOptions.length === 0) {
      return;
    }
    const previousIndex = (resolvedPositionsOptionIndex - 1 + positionsCycleOptions.length) % positionsCycleOptions.length;
    setPositionsPeriod(positionsCycleOptions[previousIndex].id);
  }

  function swipeToNextPeriod() {
    if (mode !== "positions" || positionsCycleOptions.length === 0) {
      return;
    }
    const nextIndex = (resolvedPositionsOptionIndex + 1) % positionsCycleOptions.length;
    setPositionsPeriod(positionsCycleOptions[nextIndex].id);
  }

  return (
    <ScreenFrame
      title="Posiciones"
      subtitle="Rendimiento del grupo"
      hideDataModeBadge
      containerStyle={styles.screenContainer}
      contentStyle={styles.screenContent}
      onSwipeLeft={mode === "positions" ? swipeToNextPeriod : undefined}
      onSwipeRight={mode === "positions" ? swipeToPreviousPeriod : undefined}
      header={
        <View style={[styles.headerCard, { paddingTop: Math.max(insets.top, 10) + 2 }]}>
          <View style={styles.headerRow}>
            <HeaderGroupSelector memberships={memberships} selectedGroupId={selectedGroupId} onSelectGroup={(nextGroupId) => void setSelectedGroupId(nextGroupId)} />
            <HeaderActionIcons />
          </View>
        </View>
      }
    >
      <View style={styles.filterTabs}>
        <Pressable onPress={() => setMode("positions")} style={[styles.filterTab, mode === "positions" ? styles.filterTabActive : null]}>
          <Text allowFontScaling={false} style={mode === "positions" ? styles.filterTabLabelActive : styles.filterTabLabel}>Posiciones</Text>
        </Pressable>
        <Pressable onPress={() => setMode("stats")} style={[styles.filterTab, mode === "stats" ? styles.filterTabActive : null]}>
          <Text allowFontScaling={false} style={mode === "stats" ? styles.filterTabLabelActive : styles.filterTabLabel}>Stats</Text>
        </Pressable>
      </View>

      {mode === "positions" ? (
        <FechaSelector options={positionsCycleOptions} value={positionsPeriod} onChange={setPositionsPeriod} />
      ) : null}

      {leaderboardQuery.isLoading ? <LoadingState message="Cargando posiciones..." variant={mode === "positions" ? "leaderboard" : "stats"} /> : null}
      {leaderboardQuery.isError ? (
        <ErrorState
          message="No se pudo cargar la tabla de posiciones."
          retryLabel="Reintentar"
          onRetry={() => void leaderboardQuery.refetch()}
        />
      ) : null}
      {!leaderboardQuery.isLoading && !leaderboardQuery.isError && entries.length === 0 && mode === "positions" ? (
        <EmptyState title="Sin posiciones disponibles" description="Cuando haya puntajes del grupo vas a verlos acá." />
      ) : null}

      {!leaderboardQuery.isLoading && !leaderboardQuery.isError && entries.length > 0 && mode === "positions" ? (
        <View style={styles.standingsCard}>
          <View style={styles.standingsHeader}>
            <View style={styles.standingsTitleWrap}>
              <Text allowFontScaling={false} style={styles.standingsTitle}>{tableGroupLabel}</Text>
              <Text allowFontScaling={false} style={styles.standingsSubtitle}>{tablePeriodLabel}</Text>
            </View>
            <View style={styles.standingsColsHeader}>
              <Text allowFontScaling={false} style={styles.standingsColLabel}>P</Text>
              <Text allowFontScaling={false} style={styles.standingsColLabel}>E</Text>
              <Text allowFontScaling={false} style={styles.standingsColLabel}>R</Text>
              <Text allowFontScaling={false} style={styles.standingsColLabel}>N</Text>
              <Text allowFontScaling={false} style={styles.standingsColLabel}>PTS</Text>
            </View>
          </View>
          {entries.map((entry, index) => {
            const isQualified = entry.rank <= qualificationCutoff;
            const isFirst = index === 0;
            const isLast = index === entries.length - 1;
            return (
              <View
                key={entry.userId ?? `row-${entry.rank}-${entry.name}`}
                style={[
                  styles.standingsRow,
                  isFirst ? styles.standingsRowFirst : null,
                  isLast ? styles.standingsRowLast : null
                ]}
              >
                <View
                  style={[
                    styles.standingsMarker,
                    isQualified ? styles.standingsMarkerQualified : null,
                    isFirst && isQualified ? styles.standingsMarkerFirst : null,
                    isLast && isQualified ? styles.standingsMarkerLast : null
                  ]}
                />
                <Text allowFontScaling={false} style={styles.standingsRank}>{entry.rank}</Text>
                <Text allowFontScaling={false} numberOfLines={1} style={styles.standingsName}>
                  {entry.name}
                </Text>
                <Text allowFontScaling={false} style={styles.standingsMetric}>{entry.predictions}</Text>
                <Text allowFontScaling={false} style={styles.standingsMetric}>{entry.record?.split("/")[0] ?? "-"}</Text>
                <Text allowFontScaling={false} style={styles.standingsMetric}>{entry.record?.split("/")[1] ?? "-"}</Text>
                <Text allowFontScaling={false} style={styles.standingsMetric}>{entry.record?.split("/")[2] ?? "-"}</Text>
                <Text allowFontScaling={false} style={styles.standingsPoints}>{entry.points}</Text>
              </View>
            );
          })}
        </View>
      ) : null}

      {!leaderboardQuery.isLoading && !leaderboardQuery.isError && entries.length > 0 && mode === "positions" ? (
        <Text allowFontScaling={false} style={styles.standingsLegend}>
          P: pronósticos · E: exactos · R: resultado · N: sin acierto
        </Text>
      ) : null}

      {!leaderboardQuery.isLoading && !leaderboardQuery.isError && mode === "stats" ? (
        <>
          <View style={styles.statsSummaryRow}>
            <View style={styles.statsSummaryCard}>
              <View style={styles.statsIconCircle}>
                <Text allowFontScaling={false} style={styles.statsIconText}>👥</Text>
              </View>
              <Text allowFontScaling={false} style={styles.statsLabel}>MIEMBROS</Text>
              <Text allowFontScaling={false} style={styles.statsValue}>{summary?.memberCount ?? 0}</Text>
            </View>
            <View style={styles.statsSummaryCard}>
              <View style={styles.statsIconCircle}>
                <Text allowFontScaling={false} style={styles.statsIconText}>⭐</Text>
              </View>
              <Text allowFontScaling={false} style={styles.statsLabel}>PUNTOS TOTALES</Text>
              <Text allowFontScaling={false} style={[styles.statsValue, styles.statsValueAccent]}>{summary?.totalPoints ?? 0}</Text>
            </View>
            <View style={styles.statsSummaryCard}>
              <View style={styles.statsIconCircle}>
                <Text allowFontScaling={false} style={styles.statsIconText}>◎</Text>
              </View>
              <Text allowFontScaling={false} style={styles.statsLabel}>PRECISIÓN</Text>
              <Text allowFontScaling={false} style={styles.statsValue}>{summary?.accuracyPct ?? 0}%</Text>
            </View>
          </View>

          <Text allowFontScaling={false} style={styles.rewardsTitle}>PREMIOS Y CASTIGOS</Text>
          {awards.length === 0 ? (
            <EmptyState title="Sin stats disponibles" description="Todavía no hay datos suficientes para premios y castigos." />
          ) : null}
          {awards.map((award) => {
            const visual = awardVisualById[award.id] || { icon: "◎", tone: colors.slate };
            return (
              <View key={award.id} style={styles.rewardRow}>
                <View style={[styles.rewardIcon, { backgroundColor: `${visual.tone}22` }]}>
                  <Text allowFontScaling={false} style={[styles.rewardIconText, { color: visual.tone }]}>{visual.icon}</Text>
                </View>
                <View style={styles.rewardTextCol}>
                  <Text allowFontScaling={false} style={styles.rewardLabel}>{award.title}</Text>
                  <Text allowFontScaling={false} style={styles.rewardWinner}>{award.winnerName}</Text>
                  <Text allowFontScaling={false} style={styles.rewardHint}>{award.subtitle}</Text>
                </View>
                <Text allowFontScaling={false} style={styles.rewardChevron}>⌄</Text>
              </View>
            );
          })}

          <Text allowFontScaling={false} style={styles.rewardsTitle}>RENDIMIENTO GENERAL</Text>
          <View style={styles.performanceCard}>
            {performanceMetrics.map((metric, index) => (
              <View key={metric.key} style={[styles.performanceRow, index > 0 ? styles.performanceRowBorder : null]}>
                <Text allowFontScaling={false} style={styles.performanceLabel}>{metric.label}</Text>
                <Text allowFontScaling={false} style={styles.performanceValue}>{metric.value}</Text>
              </View>
            ))}
          </View>

          <Text allowFontScaling={false} style={styles.rewardsTitle}>MEJOR Y PEOR FECHA</Text>
          <View style={styles.roundSummaryRow}>
            <View style={styles.roundSummaryCard}>
              <Text allowFontScaling={false} style={styles.roundSummaryTag}>MEJOR</Text>
              <Text allowFontScaling={false} style={styles.roundSummaryName}>{summary?.bestRound?.userName ?? "Sin datos"}</Text>
              <Text allowFontScaling={false} style={styles.roundSummaryMeta}>
                {(summary?.bestRound?.periodLabel ?? "-")} · {summary?.bestRound?.points ?? 0} pts
              </Text>
            </View>
            <View style={styles.roundSummaryCard}>
              <Text allowFontScaling={false} style={styles.roundSummaryTag}>PEOR</Text>
              <Text allowFontScaling={false} style={styles.roundSummaryName}>{summary?.worstRound?.userName ?? "Sin datos"}</Text>
              <Text allowFontScaling={false} style={styles.roundSummaryMeta}>
                {(summary?.worstRound?.periodLabel ?? "-")} · {summary?.worstRound?.points ?? 0} pts
              </Text>
            </View>
          </View>

          <Text allowFontScaling={false} style={styles.rewardsTitle}>EVOLUCIÓN POR MIEMBRO</Text>
          {trendRows.length === 0 ? (
            <EmptyState title="Sin historial disponible" description="Todavía no hay serie histórica para comparar evolución." />
          ) : null}
          {trendRows.map((row) => (
            <View key={row.userId} style={styles.trendRow}>
              <View style={styles.trendMain}>
                <Text allowFontScaling={false} style={styles.trendName}>{row.userName}</Text>
                <Text allowFontScaling={false} style={styles.trendMeta}>
                  Mejor rank #{row.bestRank || "-"} · Última {row.latestPeriodLabel}
                </Text>
              </View>
              <View style={styles.trendStats}>
                <Text allowFontScaling={false} style={styles.trendStatPrimary}>#{row.latestRank || "-"}</Text>
                <Text allowFontScaling={false} style={styles.trendStatSecondary}>{row.latestPoints} pts</Text>
              </View>
            </View>
          ))}
        </>
      ) : null}
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    paddingHorizontal: 12,
    paddingTop: 0,
    paddingBottom: 0,
    backgroundColor: colors.canvas
  },
  screenContent: {
    gap: 14
  },
  headerCard: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginHorizontal: -12
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8
  },
  sectionIcon: {
    height: 34,
    width: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryStrong
  },
  sectionIconText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.textStrong
  },
  sectionTitle: {
    color: colors.textTitle,
    fontSize: 24,
    fontWeight: "800"
  },
  sectionSubtitle: {
    marginLeft: "auto",
    color: colors.textMutedAlt,
    fontSize: 12,
    fontWeight: "700"
  },
  block: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 10
  },
  blockLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.textMuted,
    letterSpacing: 0.8
  },
  selectionButton: {
    marginTop: 8,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center"
  },
  selectionText: {
    flex: 1,
    color: colors.textTitle,
    fontWeight: "800",
    fontSize: 14
  },
  selectionChevron: {
    color: colors.textSoft,
    fontSize: 14
  },
  filterTabs: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceSoft,
    padding: 3,
    gap: 2
  },
  filterTab: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  filterTabActive: {
    backgroundColor: colors.primaryStrong
  },
  filterTabLabel: {
    color: colors.textMutedAlt,
    fontSize: 14,
    fontWeight: "800"
  },
  filterTabLabelActive: {
    color: colors.textHigh,
    fontSize: 14,
    fontWeight: "800"
  },
  standingsCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderMutedAlt,
    backgroundColor: colors.surface,
    overflow: "hidden"
  },
  standingsHeader: {
    paddingLeft: 16,
    paddingRight: 14,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "flex-end"
  },
  standingsTitleWrap: {
    flex: 1,
    paddingRight: 8
  },
  standingsTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.textTitle
  },
  standingsSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMutedAlt
  },
  standingsColsHeader: {
    flexDirection: "row",
    alignItems: "center"
  },
  standingsColLabel: {
    width: 36,
    textAlign: "center",
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "700"
  },
  standingsColLabelWide: {
    width: 56,
    textAlign: "center",
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "700"
  },
  standingsRow: {
    minHeight: 58,
    paddingHorizontal: 12,
    paddingRight: 14,
    flexDirection: "row",
    alignItems: "center"
  },
  standingsRowFirst: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight
  },
  standingsRowLast: {
    paddingBottom: 4
  },
  standingsMarker: {
    width: 3,
    alignSelf: "stretch",
    marginRight: 12,
    backgroundColor: "transparent"
  },
  standingsMarkerQualified: {
    backgroundColor: colors.primaryStrong
  },
  standingsMarkerFirst: {
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3
  },
  standingsMarkerLast: {
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3
  },
  standingsRank: {
    width: 26,
    textAlign: "center",
    color: colors.textTertiary,
    fontWeight: "600",
    fontSize: 15
  },
  standingsName: {
    flex: 1,
    color: colors.textStrong,
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 4
  },
  standingsMetric: {
    width: 36,
    textAlign: "center",
    color: colors.textTertiary,
    fontSize: 13,
    fontWeight: "600"
  },
standingsLegend: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "500",
    textAlign: "center",
    marginTop: -6
  },
  standingsPoints: {
    width: 36,
    textAlign: "center",
    color: colors.textTitle,
    fontWeight: "900",
    fontSize: 15
  },
  statsSummaryRow: {
    flexDirection: "row",
    gap: 10
  },
  statsSummaryCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 4
  },
  statsIconCircle: {
    height: 34,
    width: 34,
    borderRadius: 999,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center"
  },
  statsIconText: {
    fontSize: 14
  },
  statsLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800"
  },
  statsValue: {
    color: colors.textHigh,
    fontSize: 24,
    fontWeight: "900"
  },
  statsValueAccent: {
    color: colors.primaryAccent
  },
  rewardsTitle: {
    color: colors.textHigh,
    fontSize: 18,
    fontWeight: "900"
  },
  rewardRow: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceSoft,
    minHeight: 58,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  rewardIcon: {
    height: 30,
    width: 30,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center"
  },
  rewardIconText: {
    fontSize: 14,
    fontWeight: "800"
  },
  rewardTextCol: {
    flex: 1
  },
  rewardLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8
  },
  rewardWinner: {
    color: colors.textHigh,
    fontSize: 14,
    fontWeight: "900"
  },
  rewardHint: {
    marginTop: 2,
    color: colors.textQuaternary,
    fontSize: 12,
    fontWeight: "600"
  },
  rewardChevron: {
    color: colors.textSoft,
    fontSize: 16
  },
  performanceCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceSoft,
    overflow: "hidden"
  },
  performanceRow: {
    minHeight: 44,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  performanceRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight
  },
  performanceLabel: {
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: "700"
  },
  performanceValue: {
    color: colors.textHigh,
    fontSize: 14,
    fontWeight: "900"
  },
  roundSummaryRow: {
    flexDirection: "row",
    gap: 10
  },
  roundSummaryCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 2
  },
  roundSummaryTag: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.7
  },
  roundSummaryName: {
    color: colors.textHigh,
    fontSize: 14,
    fontWeight: "900"
  },
  roundSummaryMeta: {
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: "700"
  },
  trendRow: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceSoft,
    minHeight: 54,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  trendMain: {
    flex: 1
  },
  trendName: {
    color: colors.textHigh,
    fontSize: 14,
    fontWeight: "900"
  },
  trendMeta: {
    marginTop: 2,
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: "700"
  },
  trendStats: {
    alignItems: "flex-end"
  },
  trendStatPrimary: {
    color: colors.textHigh,
    fontSize: 14,
    fontWeight: "900"
  },
  trendStatSecondary: {
    marginTop: 2,
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: "700"
  }
});
