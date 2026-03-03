import { Text } from "react-native";
import { useQuery } from "@tanstack/react-query";
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
      <Text style={{ color: "#F9FAFB" }}>Hola {session?.user.name}</Text>
      <Text style={{ color: "#9CA3AF" }}>Grupo activo: {session?.memberships[0]?.groupName ?? "Sin grupo"}</Text>
      <Text style={{ color: "#9CA3AF" }}>
        Lider actual: {top ? `${top.displayName} (${top.points} pts)` : "Cargando..."}
      </Text>
    </ScreenFrame>
  );
}
