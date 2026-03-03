import { Text } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { colors } from "@fulbito/design-tokens";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { ScreenFrame } from "@/components/ScreenFrame";
import { useAuth } from "@/state/AuthContext";
import { mockLeaderboardRepository } from "@/repositories/mockDataRepositories";

export function HomeScreen() {
  const { session } = useAuth();
  const leaderboardQuery = useQuery({
    queryKey: ["leaderboard", session?.memberships[0]?.groupId],
    queryFn: () =>
      mockLeaderboardRepository.getLeaderboard({
        groupId: session?.memberships[0]?.groupId ?? "grupo-1",
        fecha: "2026-01"
      })
  });

  const top = leaderboardQuery.data?.[0];

  return (
    <ScreenFrame title="Inicio" subtitle="Resumen del torneo y actividad reciente">
      <Text style={{ color: colors.textPrimary }}>Hola {session?.user.name}</Text>
      <Text style={{ color: colors.textSecondary }}>Grupo activo: {session?.memberships[0]?.groupName ?? "Sin grupo"}</Text>
      {leaderboardQuery.isLoading ? <LoadingState message="Cargando posiciones del grupo..." /> : null}
      {leaderboardQuery.isError ? (
        <ErrorState
          message="No pudimos cargar la tabla de posiciones."
          retryLabel="Reintentar"
          onRetry={() => void leaderboardQuery.refetch()}
        />
      ) : null}
      {!leaderboardQuery.isLoading && !leaderboardQuery.isError && !top ? (
        <EmptyState title="Sin posiciones aún" description="Cuando haya actividad del grupo vas a ver el liderazgo acá." />
      ) : null}
      {top ? <Text style={{ color: colors.textSecondary }}>Líder actual: {`${top.displayName} (${top.points} pts)`}</Text> : null}
    </ScreenFrame>
  );
}
