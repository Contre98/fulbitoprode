import { useCallback, useEffect, useMemo, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { compareFixturesByStatusAndKickoff, groupFixturesByDate } from "@fulbito/domain";
import { colors } from "@fulbito/design-tokens";
import type { Fixture } from "@fulbito/domain";
import { fixtureRepository } from "@/repositories";
import { useGroupSelection } from "@/state/GroupContext";
import { usePeriod } from "@/state/PeriodContext";
import { ScreenFrame } from "@/components/ScreenFrame";
import { AppHeader } from "@/components/AppHeader";
import { FechaSelector } from "@/components/FechaSelector";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { CreateOrJoinGroupPrompt } from "@/components/CreateOrJoinGroupPrompt";
import { TeamCrest } from "@/components/TeamCrest";
import { estimateMatchMinute, useLivePulse } from "@/components/LiveMatchIndicator";
import { FormDots } from "@/components/MatchCardVisuals";
import { formatClock24 } from "@/lib/dateTime";
import { buildTeamFormLookup } from "@/lib/matchVisuals";

type FixtureFilter = "all" | "live" | "final" | "upcoming";

const filterLabels: Record<FixtureFilter, string> = {
  all: "Todos",
  live: "En vivo",
  final: "Finalizados",
  upcoming: "Próximos"
};
const LPF_APERTURA_2026_LABEL = "LPF: Apertura (2026)";

function stageLabel(value: string | undefined) {
  if (!value) return "";
  if (value.trim().toLowerCase() === "apertura") return LPF_APERTURA_2026_LABEL;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function competitionLabelForFixture(input: {
  competitionStage?: string;
  competitionName?: string;
  leagueName?: string;
}) {
  return stageLabel(input.competitionStage?.trim()) || input.competitionName?.trim() || input.leagueName?.trim() || "Sin competencia";
}

function toTeamCode(name: string) {
  const clean = name.trim();
  if (!clean) return "---";
  const words = clean
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => !["de", "del", "la", "el", "fc", "club"].includes(word.toLowerCase()));
  if (words.length === 0) return clean.slice(0, 3).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words
    .slice(0, 3)
    .map((word) => word[0] ?? "")
    .join("")
    .toUpperCase();
}

function statusLabel(status: Fixture["status"]) {
  if (status === "live") return "EN VIVO";
  if (status === "final") return "FINAL";
  if (status === "postponed") return "POSTERGADO";
  return "PRÓXIMO";
}

export function FixtureScreen() {
  const queryClient = useQueryClient();
  const { memberships, selectedGroupId } = useGroupSelection();
  const { fecha, options, setFecha } = usePeriod();
  const [filter, setFilter] = useState<FixtureFilter>("all");
  const hasMemberships = memberships.length > 0;

  const groupId = memberships.find((membership) => membership.groupId === selectedGroupId)?.groupId ?? memberships[0]?.groupId ?? null;
  const safeOptions = options.length > 0 ? options : [{ id: fecha, label: fecha }];
  const currentOptionIndex = safeOptions.findIndex((option) => option.id === fecha);
  const resolvedOptionIndex = currentOptionIndex >= 0 ? currentOptionIndex : 0;
  const fixtureQuery = useQuery({
    queryKey: ["fixture", groupId, fecha],
    queryFn: () =>
      fixtureRepository.listFixture({
        groupId: groupId!,
        fecha
      }),
    enabled: Boolean(groupId)
  });
  const formFixtureQuery = useQuery({
    queryKey: ["fixture-form-history", groupId, fecha, options.map((item) => item.id).join("|")],
    queryFn: async () => {
      const optionIds = options.map((item) => item.id).filter(Boolean);
      const candidatePeriods = Array.from(new Set([fecha, ...optionIds]));
      const periodLists = await Promise.all(
        candidatePeriods.map((period) =>
          fixtureRepository
            .listFixture({ groupId: groupId!, fecha: period })
            .catch(() => [])
        )
      );
      const merged = periodLists.flat();
      const deduped = new Map<string, (typeof merged)[number]>();
      merged.forEach((fixture) => deduped.set(fixture.id, fixture));
      return [...deduped.values()];
    },
    enabled: Boolean(groupId)
  });

  const hasLiveFixtures = useMemo(
    () => (fixtureQuery.data ?? []).some((f) => f.status === "live"),
    [fixtureQuery.data]
  );
  const livePulseOpacity = useLivePulse();
  const [matchClockTick, setMatchClockTick] = useState(0);
  useEffect(() => {
    if (!hasLiveFixtures) return;
    const interval = setInterval(() => setMatchClockTick((t) => t + 1), 30_000);
    return () => clearInterval(interval);
  }, [hasLiveFixtures]);

  const grouped = useMemo(() => {
    const sorted = [...(fixtureQuery.data ?? [])].sort(compareFixturesByStatusAndKickoff);
    return groupFixturesByDate(sorted, { locale: "es-AR" });
  }, [fixtureQuery.data]);
  const teamFormLookup = useMemo(
    () => buildTeamFormLookup(formFixtureQuery.data ?? fixtureQuery.data ?? []),
    [formFixtureQuery.data, fixtureQuery.data]
  );

  const groupedByFilter = useMemo(() => {
    if (filter === "all") return grouped;
    return grouped
      .map((group) => ({
        ...group,
        fixtures: group.fixtures.filter((fixture) =>
          filter === "upcoming" ? fixture.status === "upcoming" || fixture.status === "postponed" : fixture.status === filter
        )
      }))
      .filter((group) => group.fixtures.length > 0);
  }, [filter, grouped]);

  const handleRefresh = useCallback(async () => {
    await queryClient.resetQueries();
  }, [queryClient]);

  function swipeToPreviousFecha() {
    if (safeOptions.length === 0) {
      return;
    }
    const previousIndex = (resolvedOptionIndex - 1 + safeOptions.length) % safeOptions.length;
    setFecha(safeOptions[previousIndex].id);
  }

  function swipeToNextFecha() {
    if (safeOptions.length === 0) {
      return;
    }
    const nextIndex = (resolvedOptionIndex + 1) % safeOptions.length;
    setFecha(safeOptions[nextIndex].id);
  }

  return (
    <ScreenFrame
      title="Fixture"
      subtitle="Partidos por fecha"
      hideDataModeBadge
      containerStyle={styles.screenContainer}
      contentStyle={styles.screenContent}
      onSwipeLeft={swipeToNextFecha}
      onSwipeRight={swipeToPreviousFecha}
      showSwipeCue
      onRefresh={handleRefresh}
      header={<AppHeader />}
    >
      {!hasMemberships ? (
        <CreateOrJoinGroupPrompt />
      ) : (
        <>
          <FechaSelector />

          <View style={styles.filterTabs}>
            {(Object.keys(filterLabels) as FixtureFilter[]).map((key) => {
              const selected = filter === key;
              return (
                <Pressable key={key} onPress={() => setFilter(key)} style={[styles.filterTab, selected ? styles.filterTabActive : null]}>
                  <Text allowFontScaling={false} style={[styles.filterTabLabel, selected ? styles.filterTabLabelActive : null]}>
                    {filterLabels[key]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {fixtureQuery.isLoading ? <LoadingState message="Cargando fixture..." variant="fixtures" /> : null}
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
            <View key={group.dateKey} style={styles.groupCard}>
              <Text allowFontScaling={false} style={styles.dateLabel}>{group.dateLabel}</Text>
              {group.fixtures.map((fixture, index) => {
                void matchClockTick;
                const score = fixture.score ? `${fixture.score.home}-${fixture.score.away}` : null;
                const homeCode = toTeamCode(fixture.homeTeam);
                const awayCode = toTeamCode(fixture.awayTeam);
                const isLive = fixture.status === "live";
                const liveMinute = isLive ? estimateMatchMinute(fixture.kickoffAt) : "";
                const kickoffHour = formatClock24(fixture.kickoffAt);
                const rowMetaLabel = isLive
                  ? (liveMinute || "0'")
                  : `${statusLabel(fixture.status)} · ${kickoffHour}`;
                const homeForm = teamFormLookup(fixture.homeTeam, fixture.kickoffAt);
                const awayForm = teamFormLookup(fixture.awayTeam, fixture.kickoffAt);

                const row = (
                  <View key={fixture.id} style={[styles.row, index > 0 && !isLive ? styles.rowWithBorder : null, isLive ? styles.rowLive : null]}>
                    <View style={styles.teamSide}>
                      <TeamCrest teamName={fixture.homeTeam} code={homeCode} logoUrl={fixture.homeLogoUrl} size={24} />
                      <View style={styles.teamInfoCol}>
                        <Text allowFontScaling={false} numberOfLines={1} style={styles.teamName}>{fixture.homeTeam}</Text>
                        <FormDots form={homeForm} />
                      </View>
                    </View>

                    <View style={styles.middleCol}>
                      {isLive ? (
                        <Animated.Text allowFontScaling={false} style={[styles.metaLabel, styles.metaLabelLive, { opacity: livePulseOpacity }]}>
                          {rowMetaLabel}
                        </Animated.Text>
                      ) : (
                        <Text allowFontScaling={false} style={styles.metaLabel}>{rowMetaLabel}</Text>
                      )}
                      <Text allowFontScaling={false} style={styles.scoreText}>
                        {score ?? (isLive ? "0-0" : fixture.status === "final" ? "--" : fixture.status === "postponed" ? "POST." : "vs")}
                      </Text>
                    </View>

                    <View style={[styles.teamSide, styles.teamSideRight]}>
                      <View style={[styles.teamInfoCol, styles.teamInfoColRight]}>
                        <Text allowFontScaling={false} numberOfLines={1} style={styles.teamNameRight}>{fixture.awayTeam}</Text>
                        <FormDots form={awayForm} align="right" />
                      </View>
                      <TeamCrest teamName={fixture.awayTeam} code={awayCode} logoUrl={fixture.awayLogoUrl} size={24} />
                    </View>
                  </View>
                );

                return row;
              })}
            </View>
          ))}
        </>
      )}
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    paddingHorizontal: 12,
    paddingTop: 0,
    paddingBottom: 0,
    backgroundColor: colors.canvas
  },
  screenContent: {
    gap: 14
  },
  sectionIcon: {
    height: 34,
    width: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryStrong
  },
  sectionIconText: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.textStrong
  },
  sectionTitle: {
    color: colors.textTitle,
    fontSize: 24,
    fontWeight: "800"
  },
  sectionSubtitle: {
    marginLeft: "auto",
    color: colors.textMutedAlt,
    fontSize: 12,
    fontWeight: "700"
  },
  block: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 10
  },
  blockLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.textMuted,
    letterSpacing: 0.8
  },
  selectionButton: {
    marginTop: 8,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center"
  },
  selectionText: {
    flex: 1,
    color: colors.textTitle,
    fontWeight: "800",
    fontSize: 14
  },
  selectionChevron: {
    color: colors.textSoft,
    fontSize: 14
  },
  filterTabs: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceSoft,
    padding: 3,
    gap: 2
  },
  filterTab: {
    flex: 1,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44
  },
  filterTabActive: {
    backgroundColor: colors.primaryStrong
  },
  filterTabLabel: {
    color: colors.textMutedAlt,
    fontSize: 14,
    fontWeight: "800"
  },
  filterTabLabelActive: {
    color: colors.textHigh
  },
  groupCard: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: "hidden"
  },
  dateLabel: {
    color: colors.textMuted,
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 10,
    minHeight: 74,
    overflow: "hidden",
    position: "relative"
  },
  rowWithBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight
  },
  teamSide: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    minWidth: 0
  },
  teamSideRight: {
    justifyContent: "flex-end"
  },
  teamInfoCol: {
    flex: 1,
    justifyContent: "center",
    gap: 2,
    minWidth: 0
  },
  teamInfoColRight: {
    alignItems: "flex-end"
  },
  teamName: {
    color: colors.textStrong,
    fontWeight: "800",
    fontSize: 14,
    flexShrink: 1
  },
  teamNameRight: {
    color: colors.textStrong,
    fontWeight: "800",
    fontSize: 14,
    textAlign: "right",
    flexShrink: 1
  },
  middleCol: {
    minWidth: 86,
    alignItems: "center"
  },
  rowLive: {
    backgroundColor: colors.surfaceSoft,
    borderTopWidth: 0
  },
  metaLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800"
  },
  metaLabelLive: {
    color: colors.dangerAccent,
    fontSize: 11,
    fontWeight: "800"
  },
  scoreText: {
    marginTop: 1,
    color: colors.textHigh,
    fontWeight: "900",
    fontSize: 20,
    letterSpacing: -0.4
  }
});
