import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@fulbito/design-tokens";
import { leaderboardRepository } from "@/repositories";
import { useAuth } from "@/state/AuthContext";
import { useGroupSelection } from "@/state/GroupContext";
import { usePeriod } from "@/state/PeriodContext";
import { ScreenFrame } from "@/components/ScreenFrame";
import { AppHeader } from "@/components/AppHeader";
import { FechaSelector } from "@/components/FechaSelector";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { CreateOrJoinGroupPrompt } from "@/components/CreateOrJoinGroupPrompt";
import { useAppDialog } from "@/state/AppDialogContext";

type PosicionesMode = "positions" | "stats";

function formatPct(value: number) {
  return `${Math.round(value)}%`;
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatSigned(value: number, suffix = "") {
  const rounded = Math.round(value * 10) / 10;
  if (rounded > 0) return `+${formatNumber(rounded)}${suffix}`;
  if (rounded < 0) return `${formatNumber(rounded)}${suffix}`;
  return `0${suffix}`;
}

type StatRow = { label: string; value: string; info: string };

export function PosicionesScreen() {
  const queryClient = useQueryClient();
  const dialog = useAppDialog();
  const { session } = useAuth();
  const currentUserId = session?.user.id;
  const { memberships, selectedGroupId } = useGroupSelection();
  const { fecha, options } = usePeriod();
  const hasMemberships = memberships.length > 0;
  const [mode, setMode] = useState<PosicionesMode>("positions");
  const [positionsPeriod, setPositionsPeriod] = useState("global");

  const groupId = memberships.find((membership) => membership.groupId === selectedGroupId)?.groupId ?? memberships[0]?.groupId ?? null;
  const selectedMembership = useMemo(
    () => memberships.find((membership) => membership.groupId === groupId) ?? memberships[0] ?? null,
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
        groupId: groupId!,
        fecha: selectedLeaderboardPeriod,
        mode: mode === "stats" ? "stats" : "posiciones"
      }),
    enabled: Boolean(groupId)
  });

  const entries = leaderboardQuery.data?.rows ?? [];
  const tableGroupLabel = leaderboardQuery.data?.groupLabel?.trim() || selectedMembership?.groupName || "Grupo";
  const tablePeriodLabel = leaderboardQuery.data?.periodLabel?.trim() || "Acumulado";
  const qualificationCutoff = Math.min(8, Math.max(1, entries.length));
  const standingsLegendItems = [
    "P: pronósticos",
    "E: exactos (+3 pts)",
    "R: resultado (+1 pt)",
    "N: sin acierto (0 pts)"
  ];

  const handleRefresh = useCallback(async () => {
    await queryClient.resetQueries();
  }, [queryClient]);
  const openStatInfo = useCallback((label: string, info: string) => {
    dialog.alert(label, info);
  }, [dialog]);

  const userStatRows = useMemo<StatRow[]>(() => {
    if (!leaderboardQuery.data?.stats?.userSection) {
      return [];
    }

    return [
      {
        label: "Precisión total",
        value: formatPct(leaderboardQuery.data.stats.userSection.precisionPct),
        info: "Porcentaje de pronósticos con acierto de resultado o pleno."
      },
      {
        label: "Plenos",
        value: formatPct(leaderboardQuery.data.stats.userSection.exactPct),
        info: "Porcentaje de partidos donde acertaste el marcador exacto."
      },
      {
        label: "Puntos por fecha",
        value: formatNumber(leaderboardQuery.data.stats.userSection.averagePointsPerRound),
        info: "Promedio de puntos que sumás por cada fecha cerrada."
      },
      {
        label: "Tendencia",
        value: `${formatSigned(leaderboardQuery.data.stats.userSection.trend.pointsPerRoundDelta)} pts · ${formatSigned(
          leaderboardQuery.data.stats.userSection.trend.accuracyPctDelta,
          " pp"
        )}`,
        info: "Cambio reciente de rendimiento contra tu promedio anterior."
      },
      {
        label: "Consistencia (desvío)",
        value: formatNumber(leaderboardQuery.data.stats.userSection.consistencyStdDev),
        info: "Qué tan estable es tu puntaje entre fechas. Más bajo es más regular."
      },
      {
        label: "Brecha vs mediana",
        value: `${formatSigned(leaderboardQuery.data.stats.comparatives?.vsMedianPointsPerRound ?? 0)} pts · ${formatSigned(
          leaderboardQuery.data.stats.comparatives?.vsMedianAccuracyPct ?? 0,
          " pp"
        )}`,
        info: "Diferencia entre tu rendimiento y la mediana del grupo."
      },
      {
        label: "Errores evitables",
        value: formatPct(leaderboardQuery.data.stats.userSection.nearMissRatePct),
        info: "Partidos donde estuviste cerca de sumar más puntos."
      },
      {
        label: "Split local / visitante",
        value: `${formatPct(leaderboardQuery.data.stats.userSection.homeAccuracyPct)} / ${formatPct(leaderboardQuery.data.stats.userSection.awayAccuracyPct)}`,
        info: "Comparación de acierto en partidos de local versus visitante."
      }
    ];
  }, [leaderboardQuery.data?.stats]);

  const groupStatRows = useMemo<StatRow[]>(() => {
    if (!leaderboardQuery.data?.stats?.groupSection) {
      return [];
    }

    return [
      {
        label: "Precisión grupal",
        value: formatPct(leaderboardQuery.data.stats.groupSection.precisionPct),
        info: "Porcentaje de aciertos del grupo sobre todos los pronósticos."
      },
      {
        label: "Distribución (P25 / Mediana / P75)",
        value: `${formatNumber(leaderboardQuery.data.stats.groupSection.pointsDistribution.p25)} / ${formatNumber(leaderboardQuery.data.stats.groupSection.pointsDistribution.median)} / ${formatNumber(leaderboardQuery.data.stats.groupSection.pointsDistribution.p75)}`,
        info: "Rango de puntos del grupo: 25%, 50% (mediana) y 75%."
      },
      {
        label: "Paridad competitiva",
        value: `${formatNumber(leaderboardQuery.data.stats.groupSection.parityGapTopVsMedian)} pts`,
        info: "Distancia entre la cima y el rendimiento medio del grupo."
      },
      {
        label: "Índice de dificultad",
        value: `${formatNumber(leaderboardQuery.data.stats.groupSection.difficultyIndexAvgPointsPerRound)} pts/fecha`,
        info: "Puntos promedio por fecha en el grupo; menor valor suele indicar fechas más difíciles."
      },
      {
        label: "Acierto de consenso",
        value: formatPct(leaderboardQuery.data.stats.groupSection.consensusHitPct),
        info: "Qué tan seguido el pronóstico más elegido termina siendo correcto."
      },
      {
        label: "Oportunidades de ventaja",
        value: String(leaderboardQuery.data.stats.groupSection.advantageOpportunityCount),
        info: "Cantidad de partidos donde se podía sacar diferencia con una elección distinta."
      },
      {
        label: "Participación activa",
        value: formatPct(leaderboardQuery.data.stats.groupSection.activeParticipationPct),
        info: "Porcentaje de miembros que participaron con pronósticos en fechas recientes."
      },
      {
        label: "Racha colectiva",
        value: `${leaderboardQuery.data.stats.groupSection.bestRound?.periodLabel ?? "-"} / ${leaderboardQuery.data.stats.groupSection.worstRound?.periodLabel ?? "-"}`,
        info: "Mejor y peor fecha del grupo según puntos promedio."
      }
    ];
  }, [leaderboardQuery.data?.stats]);

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
      showSwipeCue
      onRefresh={handleRefresh}
      header={<AppHeader />}
    >
      {!hasMemberships ? (
        <CreateOrJoinGroupPrompt />
      ) : (
        <>
          <View style={styles.filterTabs}>
            <Pressable onPress={() => setMode("positions")} style={[styles.filterTab, mode === "positions" ? styles.filterTabActive : null]}>
              <Text allowFontScaling={false} style={mode === "positions" ? styles.filterTabLabelActive : styles.filterTabLabel}>Posiciones</Text>
            </Pressable>
            <Pressable onPress={() => setMode("stats")} style={[styles.filterTab, mode === "stats" ? styles.filterTabActive : null]}>
              <Text allowFontScaling={false} style={mode === "stats" ? styles.filterTabLabelActive : styles.filterTabLabel}>Estadísticas</Text>
            </Pressable>
          </View>

          {mode === "positions" ? (
            <FechaSelector options={positionsCycleOptions} value={positionsPeriod} onChange={setPositionsPeriod} />
          ) : null}

          {leaderboardQuery.isLoading ? <LoadingState message={mode === "positions" ? "Cargando posiciones..." : "Cargando estadísticas..."} variant={mode === "positions" ? "leaderboard" : "stats"} /> : null}
          {leaderboardQuery.isError ? (
            <ErrorState
              message={mode === "positions" ? "No se pudo cargar la tabla de posiciones." : "No se pudieron cargar las estadísticas."}
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
                const isMe = !!currentUserId && entry.userId === currentUserId;
                return (
                  <View
                    key={entry.userId ?? `row-${entry.rank}-${entry.name}`}
                    style={[
                      styles.standingsRow,
                      isFirst ? styles.standingsRowFirst : null,
                      isLast ? styles.standingsRowLast : null,
                      isMe ? styles.standingsRowMe : null
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
                    <Text allowFontScaling={false} style={[styles.standingsRank, isMe ? styles.standingsRankMe : null]}>{entry.rank}</Text>
                    <Text allowFontScaling={false} numberOfLines={1} style={[styles.standingsName, isMe ? styles.standingsNameMe : null]}>
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
            <View style={styles.standingsLegend}>
              {standingsLegendItems.map((item) => (
                <Text key={item} allowFontScaling={false} style={styles.standingsLegendItem}>
                  {item}
                </Text>
              ))}
            </View>
          ) : null}

          {!leaderboardQuery.isLoading && !leaderboardQuery.isError && mode === "stats" ? (
            <>
              {!leaderboardQuery.data?.stats?.userSection || !leaderboardQuery.data?.stats?.groupSection ? (
                <EmptyState title="Sin estadísticas disponibles" description="Necesitamos más resultados cerrados para construir tus métricas." />
              ) : (
                <>
                  <View style={styles.statsSection}>
                    <View style={styles.sectionHeaderRow}>
                      <Text allowFontScaling={false} style={styles.sectionTitleSmall}>Tus estadísticas</Text>
                      <Text allowFontScaling={false} style={styles.sectionSubtitleSmall}>{leaderboardQuery.data.stats.userSection.userName}</Text>
                    </View>
                    <View style={styles.performanceCard}>
                      {userStatRows.map((row, index) => (
                        <View key={row.label} style={[styles.performanceRow, index > 0 ? styles.performanceRowBorder : null]}>
                          <View style={styles.performanceLabelRow}>
                            <Text allowFontScaling={false} style={styles.performanceLabel}>{row.label}</Text>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Info de ${row.label}`}
                              hitSlop={8}
                              onPress={() => openStatInfo(row.label, row.info)}
                              style={styles.infoBadge}
                            >
                              <Ionicons name="information-circle-outline" size={16} color={colors.textMutedAlt} />
                            </Pressable>
                          </View>
                          <Text allowFontScaling={false} style={styles.performanceValue}>{row.value}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <View style={styles.statsSection}>
                    <View style={styles.sectionHeaderRow}>
                      <Text allowFontScaling={false} style={styles.sectionTitleSmall}>Estadísticas del grupo</Text>
                    </View>
                    <View style={styles.performanceCard}>
                      {groupStatRows.map((row, index) => (
                        <View key={row.label} style={[styles.performanceRow, index > 0 ? styles.performanceRowBorder : null]}>
                          <View style={styles.performanceLabelRow}>
                            <Text allowFontScaling={false} style={styles.performanceLabel}>{row.label}</Text>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Info de ${row.label}`}
                              hitSlop={8}
                              onPress={() => openStatInfo(row.label, row.info)}
                              style={styles.infoBadge}
                            >
                              <Ionicons name="information-circle-outline" size={16} color={colors.textMutedAlt} />
                            </Pressable>
                          </View>
                          <Text allowFontScaling={false} style={styles.performanceValue}>{row.value}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </>
              )}
            </>
          ) : null}
        </>
      )}
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
  standingsRowMe: {
    backgroundColor: colors.primaryStrong + "1A"
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
  standingsRankMe: {
    color: colors.primaryStrong,
    fontWeight: "800"
  },
  standingsName: {
    flex: 1,
    color: colors.textStrong,
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 4
  },
  standingsNameMe: {
    color: colors.textTitle,
    fontWeight: "800"
  },
  standingsMetric: {
    width: 36,
    textAlign: "center",
    color: colors.textTertiary,
    fontSize: 13,
    fontWeight: "600"
  },
  standingsLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
    rowGap: 2,
    marginTop: -6
  },
  standingsLegendItem: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "500",
    textAlign: "center"
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
  statsSection: {
    gap: 0
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 8
  },
  sectionTitleSmall: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginLeft: 4
  },
  sectionSubtitleSmall: {
    marginLeft: "auto",
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4
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
  performanceLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  infoBadge: {
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center"
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
