import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { leaderboardRepository } from "@/repositories";
import { useGroupSelection } from "@/state/GroupContext";
import { usePeriod } from "@/state/PeriodContext";
import { ScreenFrame } from "@/components/ScreenFrame";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { BrandBadgeIcon } from "@/components/BrandBadgeIcon";

type PosicionesMode = "positions" | "stats";

const rewardRows = [
  { key: "nostradamus", title: "NOSTRADAMUS", subtitle: "Mayor cantidad de plenos (3)", icon: "✣", tone: "#B7D70A" },
  { key: "bilardista", title: "BILARDISTA", subtitle: "Estrategia total", icon: "◻", tone: "#94A3B8" },
  { key: "racha", title: "LA RACHA", subtitle: "Mayor racha ganadora", icon: "◔", tone: "#F59E0B" },
  { key: "batacazo", title: "BATACAZO", subtitle: "Sorpresa de la fecha", icon: "⚡", tone: "#F59E0B" },
  { key: "robin", title: "ROBIN HOOD", subtitle: "Más repartidor de puntos", icon: "◎", tone: "#22C55E" }
];

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
    queryKey: ["leaderboard", groupId, fecha],
    queryFn: () =>
      leaderboardRepository.getLeaderboard({
        groupId,
        fecha
      })
  });

  function cycleGroup() {
    if (memberships.length <= 1) {
      return;
    }
    const currentIndex = memberships.findIndex((membership) => membership.groupId === groupId);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % memberships.length : 0;
    const nextGroupId = memberships[nextIndex]?.groupId;
    if (nextGroupId) {
      void setSelectedGroupId(nextGroupId);
    }
  }

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

  const groupSummary = selectedMembership ? `${competitionLabelForPosiciones(selectedMembership)} · ${selectedMembership.groupName}` : "Sin grupo activo";
  const entries = leaderboardQuery.data ?? [];
  const topEntry = entries[0] ?? null;
  const selectedModeLabel = mode === "positions" ? "GLOBAL ACUMULADO" : "PREMIOS Y CASTIGOS";

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
            <View style={styles.headerActions}>
              <Pressable style={styles.headerActionButton}>
                <Text allowFontScaling={false} style={styles.headerActionGlyph}>◔</Text>
              </Pressable>
              <Pressable style={styles.headerActionButton}>
                <Text allowFontScaling={false} style={styles.headerActionGlyph}>⌂</Text>
                <View style={styles.headerAlertDot} />
              </Pressable>
              <Pressable style={styles.headerActionButton}>
                <Text allowFontScaling={false} style={styles.headerActionGlyph}>⚙</Text>
              </Pressable>
              <View style={styles.profileDot}>
                <Text allowFontScaling={false} style={styles.profileDotText}>FC</Text>
              </View>
            </View>
          </View>
          <View style={styles.titleRow}>
            <View style={styles.sectionIcon}>
              <Text allowFontScaling={false} style={styles.sectionIconText}>≡</Text>
            </View>
            <Text allowFontScaling={false} style={styles.sectionTitle}>Posiciones</Text>
            <Text allowFontScaling={false} style={styles.sectionSubtitle}>Rendimiento del grupo</Text>
          </View>
        </View>
      }
    >
      <View style={styles.block}>
        <Text allowFontScaling={false} style={styles.blockLabel}>SELECCION ACTUAL</Text>
        <Pressable style={styles.selectionButton} onPress={cycleGroup}>
          <Text allowFontScaling={false} numberOfLines={1} style={styles.selectionText}>
            {groupSummary}
          </Text>
          <Text allowFontScaling={false} style={styles.selectionChevron}>⌄</Text>
        </Pressable>
      </View>

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
      {!leaderboardQuery.isLoading && !leaderboardQuery.isError && entries.length === 0 ? (
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
            <View key={entry.userId} style={[styles.row, index === 0 ? styles.rowLeader : null]}>
              <View style={styles.rowRankWrap}>
                <Text allowFontScaling={false} style={styles.rowRank}>{entry.rank}</Text>
              </View>
              <Text allowFontScaling={false} numberOfLines={1} style={styles.rowName}>
                {entry.displayName}
                {index === 0 ? " ⭐" : ""}
              </Text>
              <Text allowFontScaling={false} style={styles.rowMetric}>{Math.max(1, entry.points + 9)}</Text>
              <Text allowFontScaling={false} style={styles.rowMetricSmall}>{`${Math.max(0, entry.points - 9)}/3/15`}</Text>
              <Text allowFontScaling={false} style={styles.rowPoints}>{entry.points}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {!leaderboardQuery.isLoading && !leaderboardQuery.isError && topEntry && mode === "stats" ? (
        <>
          <View style={styles.statsSummaryRow}>
            <View style={styles.statsSummaryCard}>
              <View style={styles.statsIconCircle}>
                <Text allowFontScaling={false} style={styles.statsIconText}>🏆</Text>
              </View>
              <Text allowFontScaling={false} style={styles.statsLabel}>RANKING MUNDIAL</Text>
              <Text allowFontScaling={false} style={styles.statsValue}>#{800 + topEntry.rank * 42}</Text>
            </View>
            <View style={styles.statsSummaryCard}>
              <View style={styles.statsIconCircle}>
                <Text allowFontScaling={false} style={styles.statsIconText}>⭐</Text>
              </View>
              <Text allowFontScaling={false} style={styles.statsLabel}>PUNTOS TOTALES</Text>
              <Text allowFontScaling={false} style={[styles.statsValue, styles.statsValueAccent]}>{topEntry.points}</Text>
            </View>
          </View>

          <Text allowFontScaling={false} style={styles.rewardsTitle}>PREMIOS Y CASTIGOS</Text>
          {rewardRows.map((reward, index) => (
            <View key={reward.key} style={styles.rewardRow}>
              <View style={[styles.rewardIcon, { backgroundColor: `${reward.tone}22` }]}>
                <Text allowFontScaling={false} style={[styles.rewardIconText, { color: reward.tone }]}>{reward.icon}</Text>
              </View>
              <View style={styles.rewardTextCol}>
                <Text allowFontScaling={false} style={styles.rewardLabel}>{reward.title}</Text>
                <Text allowFontScaling={false} style={styles.rewardWinner}>{topEntry.displayName}</Text>
                {index === 0 ? <Text allowFontScaling={false} style={styles.rewardHint}>{reward.subtitle}</Text> : null}
              </View>
              <Text allowFontScaling={false} style={styles.rewardChevron}>⌄</Text>
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
    gap: 12
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  headerActionButton: {
    height: 32,
    width: 32,
    borderRadius: 999,
    backgroundColor: "#ECEFF3",
    alignItems: "center",
    justifyContent: "center"
  },
  headerActionGlyph: {
    color: "#6B7280",
    fontSize: 14
  },
  headerAlertDot: {
    position: "absolute",
    top: 8,
    right: 9,
    height: 4,
    width: 4,
    borderRadius: 999,
    backgroundColor: "#D94651"
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
    gap: 10
  },
  modeTab: {
    flex: 1,
    height: 46,
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
    fontSize: 10,
    fontWeight: "900"
  },
  modeTabLabelActive: {
    color: "#111827"
  },
  fechaBlock: {
    minHeight: 40,
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
    fontSize: 10,
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
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center"
  },
  tableTitle: {
    flex: 1,
    fontSize: 10,
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
    minHeight: 34,
    paddingHorizontal: 8,
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
    fontSize: 10
  },
  rowMetric: {
    width: 32,
    textAlign: "center",
    color: "#667085",
    fontSize: 10,
    fontWeight: "700"
  },
  rowMetricSmall: {
    width: 42,
    textAlign: "center",
    color: "#667085",
    fontSize: 10,
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
  }
});
