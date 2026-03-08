import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { leaderboardRepository } from "@/repositories";
import { useGroupSelection } from "@/state/GroupContext";
import { usePeriod } from "@/state/PeriodContext";
import { ScreenFrame } from "@/components/ScreenFrame";
import { HeaderGroupSelector } from "@/components/HeaderGroupSelector";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { BrandBadgeIcon } from "@/components/BrandBadgeIcon";

type PosicionesMode = "positions" | "stats";

const awardVisualById: Record<string, { icon: string; tone: string }> = {
  nostradamus: { icon: "✣", tone: "#B7D70A" },
  bilardista: { icon: "◻", tone: "#94A3B8" },
  "la-racha": { icon: "◔", tone: "#F59E0B" },
  batacazo: { icon: "⚡", tone: "#F59E0B" },
  "robin-hood": { icon: "◎", tone: "#22C55E" },
  "el-casi": { icon: "⌖", tone: "#60A5FA" },
  "el-mufa": { icon: "☂", tone: "#9CA3AF" }
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
  const { fecha, options, setFecha } = usePeriod();
  const [mode, setMode] = useState<PosicionesMode>("positions");

  const groupId = memberships.find((membership) => membership.groupId === selectedGroupId)?.groupId ?? memberships[0]?.groupId ?? "grupo-1";
  const selectedMembership = useMemo(
    () => memberships.find((membership) => membership.groupId === groupId) ?? memberships[0],
    [groupId, memberships]
  );
  const safeOptions = options.length > 0 ? options : [{ id: fecha, label: fecha }];
  const periodIndex = Math.max(0, safeOptions.findIndex((option) => option.id === fecha));
  const currentPeriod = safeOptions[periodIndex] ?? safeOptions[0];

  const leaderboardQuery = useQuery({
    queryKey: ["leaderboard-payload", groupId, fecha, mode],
    queryFn: () =>
      leaderboardRepository.getLeaderboardPayload({
        groupId,
        fecha,
        mode: mode === "stats" ? "stats" : "posiciones"
      })
  });

  function goPrevFecha() {
    const next = safeOptions[(periodIndex - 1 + safeOptions.length) % safeOptions.length];
    if (next) {
      setFecha(next.id);
    }
  }

  function goNextFecha() {
    const next = safeOptions[(periodIndex + 1) % safeOptions.length];
    if (next) {
      setFecha(next.id);
    }
  }

  const entries = leaderboardQuery.data?.rows ?? [];
  const summary = leaderboardQuery.data?.stats?.summary ?? null;
  const awards = leaderboardQuery.data?.stats?.awards ?? [];
  const historicalSeries = leaderboardQuery.data?.stats?.historicalSeries ?? [];
  const selectedModeLabel = mode === "positions" ? "GLOBAL ACUMULADO" : "PREMIOS Y CASTIGOS";
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

  return (
    <ScreenFrame
      title="Posiciones"
      subtitle="Rendimiento del grupo"
      hideDataModeBadge
      containerStyle={styles.screenContainer}
      contentStyle={styles.screenContent}
      header={
        <View style={[styles.headerCard, { paddingTop: Math.max(insets.top, 10) + 2 }]}>
          <View style={styles.brandRow}>
            <View style={styles.brandBadge}>
              <BrandBadgeIcon size={16} />
            </View>
            <Text allowFontScaling={false} numberOfLines={1} style={styles.brandTitle}>
              <Text style={styles.brandTitleDark}>FULBITO</Text>
              <Text style={styles.brandTitleAccent}>PRODE</Text>
            </Text>
            <View style={styles.profileDot}>
              <Text allowFontScaling={false} style={styles.profileDotText}>FC</Text>
            </View>
          </View>
          <View style={styles.titleRow}>
            <View style={styles.sectionIcon}>
              <Text allowFontScaling={false} style={styles.sectionIconText}>≡</Text>
            </View>
            <Text allowFontScaling={false} style={styles.sectionTitle}>Posiciones</Text>
            <HeaderGroupSelector memberships={memberships} selectedGroupId={selectedGroupId} onSelectGroup={(nextGroupId) => void setSelectedGroupId(nextGroupId)} />
          </View>
        </View>
      }
    >
      <View style={styles.modeTabs}>
        <Pressable onPress={() => setMode("positions")} style={[styles.modeTab, mode === "positions" ? styles.modeTabActive : null]}>
          <Text allowFontScaling={false} style={[styles.modeTabLabel, mode === "positions" ? styles.modeTabLabelActive : null]}>
            POSICIONES
          </Text>
        </Pressable>
        <Pressable onPress={() => setMode("stats")} style={[styles.modeTab, mode === "stats" ? styles.modeTabActive : null]}>
          <Text allowFontScaling={false} style={[styles.modeTabLabel, mode === "stats" ? styles.modeTabLabelActive : null]}>
            STATS
          </Text>
        </Pressable>
      </View>

      <View style={styles.fechaBlock}>
        <Pressable onPress={goPrevFecha} style={styles.fechaNavButton}>
          <Text allowFontScaling={false} style={styles.fechaNavLabel}>‹</Text>
        </Pressable>
        <Text allowFontScaling={false} style={styles.fechaTitle}>{selectedModeLabel}</Text>
        <Pressable onPress={goNextFecha} style={styles.fechaNavButton}>
          <Text allowFontScaling={false} style={styles.fechaNavLabel}>›</Text>
        </Pressable>
      </View>

      {leaderboardQuery.isLoading ? <LoadingState message="Cargando posiciones..." /> : null}
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
        <View style={styles.tableCard}>
          <View style={styles.tableHeaderRow}>
            <Text allowFontScaling={false} style={styles.tableTitle}>{selectedMembership?.groupName ?? "Grupo"}</Text>
            <View style={styles.tableCols}>
              <Text allowFontScaling={false} style={styles.tableCol}>PRED</Text>
              <Text allowFontScaling={false} style={styles.tableCol}>EX/RE/NA</Text>
              <Text allowFontScaling={false} style={styles.tableCol}>PTS</Text>
            </View>
          </View>
          {entries.map((entry, index) => (
            <View key={entry.userId ?? `row-${entry.rank}-${entry.name}`} style={[styles.row, index === 0 ? styles.rowLeader : null]}>
              <View style={styles.rowRankWrap}>
                <Text allowFontScaling={false} style={styles.rowRank}>{entry.rank}</Text>
              </View>
              <Text allowFontScaling={false} numberOfLines={1} style={styles.rowName}>
                {entry.name}
                {index === 0 ? " ⭐" : ""}
              </Text>
              <Text allowFontScaling={false} style={styles.rowMetric}>{entry.predictions}</Text>
              <Text allowFontScaling={false} style={styles.rowMetricSmall}>{entry.record}</Text>
              <Text allowFontScaling={false} style={styles.rowPoints}>{entry.points}</Text>
            </View>
          ))}
        </View>
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
            const visual = awardVisualById[award.id] || { icon: "◎", tone: "#94A3B8" };
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
    backgroundColor: "#DDE2E8"
  },
  screenContent: {
    gap: 14
  },
  headerCard: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: "#D7DCE3",
    marginHorizontal: -12,
    marginTop: 0
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  brandBadge: {
    height: 28,
    width: 28,
    borderRadius: 10,
    backgroundColor: "#EFF4E6",
    alignItems: "center",
    justifyContent: "center"
  },
  brandTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: -0.2,
    marginRight: 6
  },
  brandTitleDark: {
    color: "#0F172A"
  },
  brandTitleAccent: {
    color: "#A3C90A"
  },
  profileDot: {
    height: 32,
    width: 32,
    borderRadius: 999,
    backgroundColor: "#E8EDCD",
    alignItems: "center",
    justifyContent: "center"
  },
  profileDotText: {
    color: "#374151",
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.2
  },
  titleRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  sectionIcon: {
    height: 34,
    width: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#B7D70A"
  },
  sectionIconText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1F2937"
  },
  sectionTitle: {
    color: "#0F172A",
    fontSize: 22,
    fontWeight: "800"
  },
  sectionSubtitle: {
    marginLeft: "auto",
    color: "#7A8698",
    fontSize: 11,
    fontWeight: "700"
  },
  block: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D7DCE3",
    padding: 10
  },
  blockLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#8A94A4",
    letterSpacing: 0.8
  },
  selectionButton: {
    marginTop: 8,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: "#EDF1F5",
    borderWidth: 1,
    borderColor: "#DDE3EA",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center"
  },
  selectionText: {
    flex: 1,
    color: "#0F172A",
    fontWeight: "800",
    fontSize: 10
  },
  selectionChevron: {
    color: "#98A2B3",
    fontSize: 14
  },
  modeTabs: {
    flexDirection: "row",
    gap: 12
  },
  modeTab: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center"
  },
  modeTabActive: {
    backgroundColor: "#B7D70A"
  },
  modeTabLabel: {
    color: "#8A94A4",
    fontSize: 11,
    fontWeight: "900"
  },
  modeTabLabelActive: {
    color: "#111827"
  },
  fechaBlock: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D7DCE3",
    backgroundColor: "#F8FAFC",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8
  },
  fechaNavButton: {
    height: 28,
    width: 28,
    borderRadius: 8,
    backgroundColor: "#EDF1F5",
    alignItems: "center",
    justifyContent: "center"
  },
  fechaNavLabel: {
    color: "#98A2B3",
    fontSize: 20,
    fontWeight: "700"
  },
  fechaTitle: {
    flex: 1,
    textAlign: "center",
    color: "#A3C90A",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8
  },
  tableCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D7DCE3",
    backgroundColor: "#F8FAFC",
    overflow: "hidden"
  },
  tableHeaderRow: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center"
  },
  tableTitle: {
    flex: 1,
    fontSize: 11,
    fontWeight: "800",
    color: "#111827"
  },
  tableCols: {
    flexDirection: "row",
    gap: 10
  },
  tableCol: {
    width: 32,
    textAlign: "center",
    fontSize: 9,
    color: "#8A94A4",
    fontWeight: "700"
  },
  row: {
    minHeight: 38,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#E1E6ED"
  },
  rowLeader: {
    backgroundColor: "#E9EFCF",
    borderLeftWidth: 3,
    borderLeftColor: "#B7D70A"
  },
  rowRankWrap: {
    width: 24,
    alignItems: "center"
  },
  rowRank: {
    color: "#89B300",
    fontWeight: "900",
    fontSize: 10
  },
  rowName: {
    flex: 1,
    color: "#1F2937",
    fontWeight: "800",
    fontSize: 11
  },
  rowMetric: {
    width: 32,
    textAlign: "center",
    color: "#667085",
    fontSize: 11,
    fontWeight: "700"
  },
  rowMetricSmall: {
    width: 44,
    textAlign: "center",
    color: "#667085",
    fontSize: 11,
    fontWeight: "700"
  },
  rowPoints: {
    width: 28,
    textAlign: "center",
    color: "#1F2937",
    fontWeight: "900",
    fontSize: 11
  },
  statsSummaryRow: {
    flexDirection: "row",
    gap: 10
  },
  statsSummaryCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D7DCE3",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 4
  },
  statsIconCircle: {
    height: 34,
    width: 34,
    borderRadius: 999,
    backgroundColor: "#EFF4E6",
    alignItems: "center",
    justifyContent: "center"
  },
  statsIconText: {
    fontSize: 14
  },
  statsLabel: {
    color: "#8A94A4",
    fontSize: 9,
    fontWeight: "800"
  },
  statsValue: {
    color: "#111827",
    fontSize: 24,
    fontWeight: "900"
  },
  statsValueAccent: {
    color: "#A3C90A"
  },
  rewardsTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "900"
  },
  rewardRow: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D7DCE3",
    backgroundColor: "#F8FAFC",
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
    color: "#8A94A4",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8
  },
  rewardWinner: {
    color: "#111827",
    fontSize: 11,
    fontWeight: "900"
  },
  rewardHint: {
    marginTop: 2,
    color: "#666F7E",
    fontSize: 10,
    fontWeight: "600"
  },
  rewardChevron: {
    color: "#98A2B3",
    fontSize: 16
  },
  performanceCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D7DCE3",
    backgroundColor: "#F8FAFC",
    overflow: "hidden"
  },
  performanceRow: {
    minHeight: 40,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  performanceRowBorder: {
    borderTopWidth: 1,
    borderTopColor: "#E1E6ED"
  },
  performanceLabel: {
    color: "#667085",
    fontSize: 11,
    fontWeight: "700"
  },
  performanceValue: {
    color: "#111827",
    fontSize: 13,
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
    borderColor: "#D7DCE3",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 2
  },
  roundSummaryTag: {
    color: "#8A94A4",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.7
  },
  roundSummaryName: {
    color: "#111827",
    fontSize: 12,
    fontWeight: "900"
  },
  roundSummaryMeta: {
    color: "#667085",
    fontSize: 10,
    fontWeight: "700"
  },
  trendRow: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D7DCE3",
    backgroundColor: "#F8FAFC",
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
    color: "#111827",
    fontSize: 12,
    fontWeight: "900"
  },
  trendMeta: {
    marginTop: 2,
    color: "#667085",
    fontSize: 10,
    fontWeight: "700"
  },
  trendStats: {
    alignItems: "flex-end"
  },
  trendStatPrimary: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "900"
  },
  trendStatSecondary: {
    marginTop: 2,
    color: "#667085",
    fontSize: 10,
    fontWeight: "700"
  }
});
