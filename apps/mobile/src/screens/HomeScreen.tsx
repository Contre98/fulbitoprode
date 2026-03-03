import { Text } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { colors } from "@fulbito/design-tokens";
import { ErrorState } from "@/components/ErrorState";
import { GroupSelector } from "@/components/GroupSelector";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { ScreenFrame } from "@/components/ScreenFrame";
import { leaderboardRepository } from "@/repositories";
import { useAuth } from "@/state/AuthContext";
import { useGroupSelection } from "@/state/GroupContext";

export function HomeScreen() {
  const { session } = useAuth();
  const { memberships, selectedGroupId } = useGroupSelection();
  const activeMembership = memberships.find((membership) => membership.groupId === selectedGroupId) ?? memberships[0];
  const groupId = activeMembership?.groupId ?? "grupo-1";
  const leaderboardQuery = useQuery({
    queryKey: ["leaderboard", groupId, "2026-01"],
    queryFn: () =>
      leaderboardRepository.getLeaderboard({
        groupId,
        fecha: "2026-01"
      })
  });

  const top = leaderboardQuery.data?.[0];

  return (
    <ScreenFrame title="Inicio" subtitle="Resumen del torneo y actividad reciente">
      <Text style={{ color: colors.textPrimary }}>Hola {session?.user.name}</Text>
      <GroupSelector />
      <Text style={{ color: colors.textSecondary }}>Grupo activo: {activeMembership?.groupName ?? "Sin grupo"}</Text>
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
