import { StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { colors, spacing } from "@fulbito/design-tokens";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { ScreenFrame } from "@/components/ScreenFrame";
import { mockLeaderboardRepository } from "@/repositories/mockDataRepositories";
import { useAuth } from "@/state/AuthContext";

const DEFAULT_FECHA = "2026-01";

export function PosicionesScreen() {
  const { session } = useAuth();
  const groupId = session?.memberships[0]?.groupId ?? "grupo-1";
  const leaderboardQuery = useQuery({
    queryKey: ["leaderboard", groupId, DEFAULT_FECHA],
    queryFn: () =>
      mockLeaderboardRepository.getLeaderboard({
        groupId,
        fecha: DEFAULT_FECHA
      })
  });

  return (
    <ScreenFrame title="Posiciones" subtitle="Tabla del grupo y métricas clave">
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    gap: spacing.sm
  },
  rankBadge: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted
  },
  rankLabel: {
    color: colors.textPrimary,
    fontWeight: "700"
  },
  nameColumn: {
    flex: 1
  },
  name: {
    color: colors.textPrimary,
    fontWeight: "600"
  },
  points: {
    color: colors.primary,
    fontWeight: "700"
  }
});
