import { Pressable, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { colors, spacing } from "@fulbito/design-tokens";
import { FechaSelector } from "@/components/FechaSelector";
import { GroupSelector } from "@/components/GroupSelector";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { ScreenFrame } from "@/components/ScreenFrame";
import { leaderboardRepository } from "@/repositories";
import { useGroupSelection } from "@/state/GroupContext";
import { usePeriod } from "@/state/PeriodContext";

export function PosicionesScreen() {
  const { memberships, selectedGroupId } = useGroupSelection();
  const { fecha } = usePeriod();
  const groupId = memberships.find((membership) => membership.groupId === selectedGroupId)?.groupId ?? memberships[0]?.groupId ?? "grupo-1";
  const leaderboardQuery = useQuery({
    queryKey: ["leaderboard", groupId, fecha],
    queryFn: () =>
      leaderboardRepository.getLeaderboard({
        groupId,
        fecha
      })
  });

  const topEntry = (leaderboardQuery.data ?? [])[0] ?? null;

  return (
    <ScreenFrame
      title="Posiciones"
      subtitle="Tabla del grupo y métricas clave"
      header={
        <View style={styles.headerCard}>
          <View style={styles.brandRow}>
            <View style={styles.brandBadge}>
              <Text style={styles.brandBadgeText}>FP</Text>
            </View>
            <View style={styles.brandTextWrap}>
              <Text style={styles.brandTitle}>Fulbito Prode</Text>
              <Text style={styles.brandSubtitle}>Posiciones · Rendimiento del grupo</Text>
            </View>
            <View style={styles.profileDot}>
              <Text style={styles.profileDotText}>U</Text>
            </View>
          </View>
        </View>
      }
    >
      <GroupSelector />
      <FechaSelector />
      <View style={styles.modeTabs}>
        <Pressable style={[styles.modeTab, styles.modeTabActive]}>
          <Text style={[styles.modeTabLabel, styles.modeTabLabelActive]}>Posiciones</Text>
        </Pressable>
        <Pressable style={styles.modeTab}>
          <Text style={styles.modeTabLabel}>Stats</Text>
        </Pressable>
      </View>
      {topEntry ? (
        <View style={styles.topCard}>
          <Text style={styles.topLabel}>Líder actual</Text>
          <View style={styles.topRow}>
            <View style={styles.topRankBadge}>
              <Text style={styles.topRankText}>#{topEntry.rank}</Text>
            </View>
            <Text numberOfLines={1} style={styles.topName}>
              {topEntry.displayName}
            </Text>
            <Text style={styles.topPoints}>{topEntry.points} pts</Text>
          </View>
        </View>
      ) : null}
      {leaderboardQuery.isLoading ? <LoadingState message="Cargando posiciones..." /> : null}
      {leaderboardQuery.isError ? (
        <ErrorState
          message="No se pudo cargar la tabla de posiciones."
          retryLabel="Reintentar"
          onRetry={() => void leaderboardQuery.refetch()}
        />
      ) : null}
      {!leaderboardQuery.isLoading && !leaderboardQuery.isError && (leaderboardQuery.data?.length ?? 0) === 0 ? (
        <EmptyState title="Sin posiciones disponibles" description="Cuando haya puntajes del grupo vas a verlos acá." />
      ) : null}
      {(leaderboardQuery.data ?? []).map((entry) => (
        <View key={entry.userId} style={styles.row}>
          <View style={styles.rankBadge}>
            <Text style={styles.rankLabel}>{entry.rank}</Text>
          </View>
          <View style={styles.nameColumn}>
            <Text style={styles.name}>{entry.displayName}</Text>
          </View>
          <Text style={styles.points}>{entry.points} pts</Text>
        </View>
      ))}
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
    backgroundColor: colors.surface,
    padding: spacing.md
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  brandBadge: {
    height: 34,
    width: 34,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  brandBadgeText: {
    color: colors.primaryText,
    fontSize: 12,
    fontWeight: "800"
  },
  brandTextWrap: {
    flex: 1
  },
  brandTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "900"
  },
  brandSubtitle: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2
  },
  profileDot: {
    height: 30,
    width: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center"
  },
  profileDotText: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: 12
  },
  modeTabs: {
    flexDirection: "row",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    padding: spacing.xs,
    gap: spacing.xs
  },
  modeTab: {
    flex: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    height: 36
  },
  modeTabActive: {
    backgroundColor: colors.primary
  },
  modeTabLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "700"
  },
  modeTabLabelActive: {
    color: colors.primaryText
  },
  topCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm
  },
  topLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    textTransform: "uppercase",
    fontWeight: "700"
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  topRankBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: "#123221",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  topRankText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 11
  },
  topName: {
    flex: 1,
    color: colors.textPrimary,
    fontWeight: "800",
    fontSize: 15
  },
  topPoints: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "800"
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    gap: spacing.sm
  },
  rankBadge: {
    minWidth: 34,
    height: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted
  },
  rankLabel: {
    color: colors.textPrimary,
    fontWeight: "800"
  },
  nameColumn: {
    flex: 1
  },
  name: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: 14
  },
  points: {
    color: colors.primary,
    fontWeight: "800"
  }
});
