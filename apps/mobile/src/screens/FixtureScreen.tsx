import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { compareFixturesByStatusAndKickoff, groupFixturesByDate } from "@fulbito/domain";
import type { Fixture } from "@fulbito/domain";
import { colors, spacing } from "@fulbito/design-tokens";
import { FechaSelector } from "@/components/FechaSelector";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { ScreenFrame } from "@/components/ScreenFrame";
import { fixtureRepository } from "@/repositories";
import { useAuth } from "@/state/AuthContext";
import { usePeriod } from "@/state/PeriodContext";
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
  const { session } = useAuth();
  const { fecha } = usePeriod();
  const groupId = session?.memberships[0]?.groupId ?? "grupo-1";
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

  return (
    <ScreenFrame title="Fixture" subtitle="Partidos por fecha y resultados">
      <FechaSelector />
      {fixtureQuery.isLoading ? <LoadingState message="Cargando fixture..." /> : null}
      {fixtureQuery.isError ? (
        <ErrorState
          message="No se pudo cargar el fixture."
          retryLabel="Reintentar"
          onRetry={() => void fixtureQuery.refetch()}
        />
      ) : null}
      {!fixtureQuery.isLoading && !fixtureQuery.isError && grouped.length === 0 ? (
        <EmptyState title="Sin partidos disponibles" description="No hay partidos cargados para esta fecha." />
      ) : null}
      {grouped.map((group) => (
        <View key={group.dateKey} style={styles.group}>
          <Text style={styles.dateLabel}>{group.dateLabel}</Text>
          {group.fixtures.map((fixture) => (
            <View key={fixture.id} style={styles.row}>
              <View style={styles.teamsColumn}>
                <Text style={styles.teams}>
                  {fixture.homeTeam} vs {fixture.awayTeam}
                </Text>
                <Text style={styles.kickoff}>{new Date(fixture.kickoffAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
              </View>
              <Text style={[styles.status, { color: statusTone(fixture.status) }]}>{statusLabel(fixture.status)}</Text>
            </View>
          ))}
        </View>
      ))}
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  group: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.md,
    gap: spacing.sm
  },
  dateLabel: {
    color: colors.textPrimary,
    fontWeight: "700"
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  teamsColumn: {
    flex: 1,
    gap: spacing.xs
  },
  teams: {
    color: colors.textPrimary,
    fontWeight: "600"
  },
  kickoff: {
    color: colors.textSecondary,
    fontSize: 12
  },
  status: {
    fontWeight: "700",
    fontSize: 12
  }
});
