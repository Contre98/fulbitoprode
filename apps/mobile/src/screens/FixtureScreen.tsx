import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { compareFixturesByStatusAndKickoff, groupFixturesByDate } from "@fulbito/domain";
import type { Fixture } from "@fulbito/domain";
import { colors, spacing } from "@fulbito/design-tokens";
import { FechaSelector } from "@/components/FechaSelector";
import { GroupSelector } from "@/components/GroupSelector";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { ScreenFrame } from "@/components/ScreenFrame";
import { fixtureRepository } from "@/repositories";
import { useGroupSelection } from "@/state/GroupContext";
import { usePeriod } from "@/state/PeriodContext";

type FixtureFilter = "all" | "live" | "final" | "upcoming";

const filterLabels: Record<FixtureFilter, string> = {
  all: "Todos",
  live: "En vivo",
  final: "Finalizados",
  upcoming: "Próximos"
};

function statusLabel(status: Fixture["status"]) {
  if (status === "live") {
    return "EN VIVO";
  }
  if (status === "final") {
    return "FINAL";
  }
  return "PRÓXIMO";
}

function statusTone(status: Fixture["status"]) {
  if (status === "live") {
    return "#FBBF24";
  }
  if (status === "final") {
    return colors.textSecondary;
  }
  return colors.primary;
}

export function FixtureScreen() {
  const { memberships, selectedGroupId } = useGroupSelection();
  const { fecha } = usePeriod();
  const [filter, setFilter] = useState<FixtureFilter>("all");
  const groupId = memberships.find((membership) => membership.groupId === selectedGroupId)?.groupId ?? memberships[0]?.groupId ?? "grupo-1";
  const fixtureQuery = useQuery({
    queryKey: ["fixture", groupId, fecha],
    queryFn: () =>
      fixtureRepository.listFixture({
        groupId,
        fecha
      })
  });

  const grouped = useMemo(() => {
    const sorted = [...(fixtureQuery.data ?? [])].sort(compareFixturesByStatusAndKickoff);
    return groupFixturesByDate(sorted, { locale: "es-AR" });
  }, [fixtureQuery.data]);
  const groupedByFilter = useMemo(() => {
    if (filter === "all") {
      return grouped;
    }
    return grouped
      .map((group) => ({
        ...group,
        fixtures: group.fixtures.filter((fixture) => fixture.status === filter)
      }))
      .filter((group) => group.fixtures.length > 0);
  }, [filter, grouped]);

  return (
    <ScreenFrame
      title="Fixture"
      subtitle="Partidos por fecha y resultados"
      header={
        <View style={styles.headerCard}>
          <View style={styles.brandRow}>
            <View style={styles.brandBadge}>
              <Text style={styles.brandBadgeText}>FP</Text>
            </View>
            <View style={styles.brandTextWrap}>
              <Text style={styles.brandTitle}>Fulbito Prode</Text>
              <Text style={styles.brandSubtitle}>Fixture · Partidos por fecha</Text>
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
      <View style={styles.filterTabs}>
        {(Object.keys(filterLabels) as FixtureFilter[]).map((key) => {
          const selected = filter === key;
          return (
            <Pressable key={key} onPress={() => setFilter(key)} style={[styles.filterTab, selected ? styles.filterTabActive : null]}>
              <Text style={[styles.filterTabLabel, selected ? styles.filterTabLabelActive : null]}>{filterLabels[key]}</Text>
            </Pressable>
          );
        })}
      </View>
      {fixtureQuery.isLoading ? <LoadingState message="Cargando fixture..." /> : null}
      {fixtureQuery.isError ? (
        <ErrorState
          message="No se pudo cargar el fixture."
          retryLabel="Reintentar"
          onRetry={() => void fixtureQuery.refetch()}
        />
      ) : null}
      {!fixtureQuery.isLoading && !fixtureQuery.isError && groupedByFilter.length === 0 ? (
        <EmptyState title="Sin partidos disponibles" description="No hay partidos cargados para este filtro en esta fecha." />
      ) : null}
      {groupedByFilter.map((group) => (
        <View key={group.dateKey} style={styles.group}>
          <Text style={styles.dateLabel}>{group.dateLabel}</Text>
          {group.fixtures.map((fixture) => (
            <View key={fixture.id} style={styles.row}>
              <View style={styles.teamsColumn}>
                <Text numberOfLines={1} style={styles.teamName}>
                  {fixture.homeTeam}
                </Text>
                <Text style={styles.vsLabel}>vs</Text>
                <Text numberOfLines={1} style={[styles.teamName, styles.teamNameAway]}>
                  {fixture.awayTeam}
                </Text>
              </View>
              <View style={styles.metaColumn}>
                <Text style={styles.kickoff}>
                  {new Date(fixture.kickoffAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })}
                </Text>
                <Text style={[styles.status, { color: statusTone(fixture.status) }]}>{statusLabel(fixture.status)}</Text>
              </View>
            </View>
          ))}
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
  filterTabs: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
    backgroundColor: colors.surface,
    padding: spacing.xs,
    gap: spacing.xs
  },
  filterTab: {
    flex: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 30,
    paddingHorizontal: spacing.xs
  },
  filterTabActive: {
    backgroundColor: colors.primary
  },
  filterTabLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700"
  },
  filterTabLabelActive: {
    color: colors.primaryText
  },
  group: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
    padding: spacing.lg,
    gap: spacing.sm
  },
  dateLabel: {
    color: colors.textPrimary,
    fontWeight: "800",
    fontSize: 15
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md
  },
  teamsColumn: {
    flex: 1
  },
  teamName: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: 13
  },
  teamNameAway: {
    textAlign: "right"
  },
  vsLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    textTransform: "uppercase",
    textAlign: "center",
    marginVertical: 2
  },
  metaColumn: {
    minWidth: 82,
    alignItems: "flex-end",
    gap: spacing.xs
  },
  kickoff: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600"
  },
  status: {
    fontWeight: "800",
    fontSize: 11
  },
  teams: {
    color: colors.textPrimary,
    fontWeight: "600"
  },
  // legacy style key kept to avoid accidental style lookups in incremental refactors
});
