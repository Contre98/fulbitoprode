import { useCallback, useMemo } from "react";
import { StyleSheet } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { colors } from "@fulbito/design-tokens";
import { fixtureRepository, leaderboardRepository, predictionsRepository } from "@/repositories";
import { ScreenFrame } from "@/components/ScreenFrame";
import { AppHeader } from "@/components/AppHeader";
import { LoadingState } from "@/components/LoadingState";
import { LeaderboardOverviewCard } from "@/components/LeaderboardOverviewCard";
import { UrgentActionCard } from "@/components/UrgentActionCard";
import { FeaturedMatchesCard } from "@/components/FeaturedMatchesCard";
import { useGroupSelection } from "@/state/GroupContext";
import { useAuth } from "@/state/AuthContext";
import { usePeriod } from "@/state/PeriodContext";

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const { memberships, selectedGroupId } = useGroupSelection();
  const { session } = useAuth();
  const { fecha, defaultFecha, options, setFecha } = usePeriod();

  const queryClient = useQueryClient();
  const groupId = memberships.find((m) => m.groupId === selectedGroupId)?.groupId ?? memberships[0]?.groupId ?? "grupo-1";
  const selectedMembership = useMemo(
    () => memberships.find((m) => m.groupId === groupId) ?? memberships[0],
    [groupId, memberships]
  );

  const ctaFecha = defaultFecha || fecha;

  const leaderboardQuery = useQuery({
    queryKey: ["leaderboard-payload", groupId, "global", "posiciones"],
    queryFn: () =>
      leaderboardRepository.getLeaderboardPayload({
        groupId,
        fecha: "global",
        mode: "posiciones"
      })
  });

  const fixtureQuery = useQuery({
    queryKey: ["fixture", groupId, ctaFecha],
    queryFn: () => fixtureRepository.listFixture({ groupId, fecha: ctaFecha })
  });
  const formFixtureQuery = useQuery({
    queryKey: ["fixture-form-history", groupId, ctaFecha, options.map((item) => item.id).join("|")],
    queryFn: async () => {
      const optionIds = options.map((item) => item.id).filter(Boolean);
      const candidatePeriods = Array.from(new Set([ctaFecha, ...optionIds]));
      const periodLists = await Promise.all(
        candidatePeriods.map((period) =>
          fixtureRepository
            .listFixture({ groupId, fecha: period })
            .catch(() => [])
        )
      );
      const merged = periodLists.flat();
      const deduped = new Map<string, (typeof merged)[number]>();
      merged.forEach((fixture) => deduped.set(fixture.id, fixture));
      return [...deduped.values()];
    }
  });

  const predictionsQuery = useQuery({
    queryKey: ["predictions", groupId, ctaFecha],
    queryFn: () => predictionsRepository.listPredictions({ groupId, fecha: ctaFecha })
  });

  const myRow = leaderboardQuery.data?.rows.find((r) => r.highlight);
  const groupLabel = selectedMembership?.groupName ?? leaderboardQuery.data?.groupLabel ?? "";
  const isLoading = leaderboardQuery.isLoading || fixtureQuery.isLoading || predictionsQuery.isLoading;

  const fixtures = fixtureQuery.data ?? [];
  const formFixtures = formFixtureQuery.data ?? fixtures;
  const predictions = predictionsQuery.data ?? [];
  const hasUpcoming = fixtures.some((f) => f.status === "upcoming");
  const totalCount = fixtures.length;
  const filledCount = predictions.length;
  const allComplete = totalCount > 0 && filledCount >= totalCount;
  const showCard = hasUpcoming && totalCount > 0;
  const hasRenderableContent = Boolean(myRow || showCard || fixtures.length > 0);

  const earliestKickoff = fixtures
    .filter((f) => f.status === "upcoming")
    .map((f) => new Date(f.kickoffAt).getTime())
    .sort((a, b) => a - b)[0];

  const handleRefresh = useCallback(async () => {
    await queryClient.resetQueries();
  }, [queryClient]);

  const handleOpenPosiciones = useCallback(() => {
    navigation.navigate("Posiciones");
  }, [navigation]);

  const handleOpenPronosticos = useCallback(() => {
    if (ctaFecha && ctaFecha !== fecha) {
      setFecha(ctaFecha);
    }
    navigation.navigate("Pronosticos");
  }, [ctaFecha, fecha, navigation, setFecha]);

  const cardMessage = allComplete
    ? `Ya cargaste todos tus pronósticos para la ${fechaLabel(ctaFecha)}`
    : earliestKickoff
      ? `¡Faltan ${formatTimeUntil(earliestKickoff)}! Carga tus pronósticos para la ${fechaLabel(ctaFecha)}`
      : `Carga tus pronósticos para la ${fechaLabel(ctaFecha)}`;

  return (
    <ScreenFrame
      title="Inicio"
      subtitle="Tablero general"
      hideDataModeBadge
      containerStyle={styles.screenContainer}
      contentStyle={styles.screenContent}
      onRefresh={handleRefresh}
      header={<AppHeader />}
    >
      {isLoading && !hasRenderableContent ? <LoadingState message="Cargando inicio..." variant="home" /> : null}
      {myRow && (
        <LeaderboardOverviewCard
          groupLabel={groupLabel}
          row={myRow}
          awards={leaderboardQuery.data?.stats?.awards}
          currentUserId={session?.user?.id}
          onPress={handleOpenPosiciones}
        />
      )}
      {showCard && (
        <UrgentActionCard
          message={cardMessage}
          filled={filledCount}
          total={totalCount}
          complete={allComplete}
          onPress={handleOpenPronosticos}
        />
      )}
      {fixtures.length > 0 && (
        <FeaturedMatchesCard
          fixtures={fixtures}
          formFixtures={formFixtures}
          predictions={predictions}
          onPressPrediction={handleOpenPronosticos}
        />
      )}
    </ScreenFrame>
  );
}

function fechaLabel(fecha: string): string {
  const match = fecha.match(/\d+$/);
  return match ? `Fecha ${parseInt(match[0], 10)}` : fecha;
}

function formatTimeUntil(timestamp: number): string {
  const diff = timestamp - Date.now();
  if (diff <= 0) return "poco tiempo";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days} día${days === 1 ? "" : "s"}`;
  }
  if (hours > 0) return `${hours} hora${hours === 1 ? "" : "s"}`;
  return `${minutes} minuto${minutes === 1 ? "" : "s"}`;
}

const styles = StyleSheet.create({
  screenContainer: {
    paddingHorizontal: 12,
    paddingTop: 0,
    paddingBottom: 0,
    backgroundColor: colors.canvas
  },
  screenContent: {
    gap: 10
  }
});
