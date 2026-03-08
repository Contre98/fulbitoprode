import { useMemo, useState } from "react";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fixtureRepository, leaderboardRepository, notificationsRepository } from "@/repositories";
import { ScreenFrame } from "@/components/ScreenFrame";
import { HeaderGroupSelector } from "@/components/HeaderGroupSelector";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { BrandBadgeIcon } from "@/components/BrandBadgeIcon";
import { TeamCrest } from "@/components/TeamCrest";
import { useAuth } from "@/state/AuthContext";
import { useGroupSelection } from "@/state/GroupContext";
import { usePeriod } from "@/state/PeriodContext";
import { filterHomeFixtures, type HomeFixtureFilter } from "@/screens/homeFilters";

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

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { memberships, selectedGroupId, setSelectedGroupId } = useGroupSelection();
  const { fecha, options } = usePeriod();
  const [fixtureFilter, setFixtureFilter] = useState<HomeFixtureFilter>("all");
  const activeMembership = memberships.find((membership) => membership.groupId === selectedGroupId) ?? memberships[0];
  const groupId = activeMembership?.groupId ?? "grupo-1";

  const leaderboardQuery = useQuery({
    queryKey: ["leaderboard", groupId],
    queryFn: () =>
      leaderboardRepository.getLeaderboard({
        groupId,
        fecha: ""
      })
  });

  const fixtureQuery = useQuery({
    queryKey: ["fixture-home", groupId, fecha, options.map((option) => option.id).join("|")],
    queryFn: async () => {
      const candidatePeriods = Array.from(new Set([fecha, ...options.map((option) => option.id), ""]));
      let firstSuccessfulRows: Awaited<ReturnType<typeof fixtureRepository.listFixture>> | null = null;
      let firstError: unknown = null;

      for (const period of candidatePeriods) {
        try {
          const rows = await fixtureRepository.listFixture({
            groupId,
            fecha: period
          });

          if (firstSuccessfulRows === null) {
            firstSuccessfulRows = rows;
          }

          if (filterHomeFixtures(rows, "all").length > 0) {
            return rows;
          }
        } catch (error) {
          if (!firstError) {
            firstError = error;
          }
        }
      }

      if (firstSuccessfulRows) {
        return firstSuccessfulRows;
      }

      throw (firstError ?? new Error("No se pudo cargar el fixture."));
    }
  });
  const notificationsQuery = useQuery({
    queryKey: ["notifications-weekly-winner"],
    queryFn: () => notificationsRepository.listInbox()
  });

  const summaryCards = useMemo(() => {
    const top = leaderboardQuery.data?.[0];
    return [
      { label: "RANKING", value: top ? `#${top.rank}` : "#-" },
      { label: "PENDIENTES", value: String((fixtureQuery.data ?? []).filter((f) => f.status === "upcoming").length) },
      { label: "EN VIVO", value: String((fixtureQuery.data ?? []).filter((f) => f.status === "live").length) }
    ];
  }, [fixtureQuery.data, leaderboardQuery.data]);

  const filteredFixtures = useMemo(
    () => filterHomeFixtures(fixtureQuery.data ?? [], fixtureFilter),
    [fixtureQuery.data, fixtureFilter]
  );
  const fixtures = filteredFixtures.slice(0, 5);
  const weeklyWinner = notificationsQuery.data?.weeklyWinner ?? null;

  async function shareWeeklyWinner() {
    if (!weeklyWinner) {
      return;
    }
    const message = `Ganador ${weeklyWinner.periodLabel}: ${weeklyWinner.winnerName} con ${weeklyWinner.points} pts en Fulbito Prode.`;
    await Share.share({ message });
  }

  return (
    <ScreenFrame
      title="Inicio"
      subtitle="Tablero general"
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
            <View style={styles.profileDot}>
              <Text allowFontScaling={false} style={styles.profileDotText}>
                {session?.user.name?.slice(0, 2).toUpperCase() || "FC"}
              </Text>
            </View>
          </View>
          <View style={styles.titleRow}>
            <View style={styles.sectionIcon}>
              <Text allowFontScaling={false} style={styles.sectionIconText}>⌂</Text>
            </View>
            <Text allowFontScaling={false} style={styles.sectionTitle}>Inicio</Text>
            <HeaderGroupSelector memberships={memberships} selectedGroupId={selectedGroupId} onSelectGroup={(nextGroupId) => void setSelectedGroupId(nextGroupId)} />
          </View>
        </View>
      }
    >
      <View style={styles.summaryRow}>
        {summaryCards.map((item) => (
          <View key={item.label} style={styles.summaryCard}>
            <Text allowFontScaling={false} style={styles.summaryLabel}>{item.label}</Text>
            <Text allowFontScaling={false} style={styles.summaryValue}>{item.value}</Text>
          </View>
        ))}
      </View>

      {weeklyWinner ? (
        <View style={styles.winnerCard}>
          <Text allowFontScaling={false} style={styles.winnerLabel}>GANADOR SEMANAL</Text>
          <Text allowFontScaling={false} style={styles.winnerTitle}>
            {weeklyWinner.periodLabel}: {weeklyWinner.winnerName}
          </Text>
          <Text allowFontScaling={false} style={styles.winnerSub}>
            {weeklyWinner.points} pts {weeklyWinner.tied ? "· empatado" : ""}
          </Text>
          <Pressable onPress={() => void shareWeeklyWinner()} style={styles.winnerShareButton}>
            <Text allowFontScaling={false} style={styles.winnerShareText}>Compartir resultado</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.sectionHeaderRow}>
        <Text allowFontScaling={false} style={styles.sectionHeader}>Próximos Partidos</Text>
        <Text allowFontScaling={false} style={styles.sectionHeaderGlyph}>∿</Text>
      </View>

      <View style={styles.filterTabs}>
        <Pressable onPress={() => setFixtureFilter("all")} style={[styles.filterTab, fixtureFilter === "all" ? styles.filterTabActive : null]}>
          <Text allowFontScaling={false} style={fixtureFilter === "all" ? styles.filterTabLabelActive : styles.filterTabLabel}>Todos</Text>
        </Pressable>
        <Pressable onPress={() => setFixtureFilter("live")} style={[styles.filterTab, fixtureFilter === "live" ? styles.filterTabActive : null]}>
          <Text allowFontScaling={false} style={fixtureFilter === "live" ? styles.filterTabLabelActive : styles.filterTabLabel}>En vivo</Text>
        </Pressable>
        <Pressable onPress={() => setFixtureFilter("upcoming")} style={[styles.filterTab, fixtureFilter === "upcoming" ? styles.filterTabActive : null]}>
          <Text allowFontScaling={false} style={fixtureFilter === "upcoming" ? styles.filterTabLabelActive : styles.filterTabLabel}>Próximos</Text>
        </Pressable>
      </View>

      {fixtureQuery.isLoading ? <LoadingState message="Cargando partidos..." /> : null}
      {fixtureQuery.isError ? <ErrorState message="No se pudo cargar el tablero de partidos." retryLabel="Reintentar" onRetry={() => void fixtureQuery.refetch()} /> : null}
      {!fixtureQuery.isLoading && !fixtureQuery.isError && fixtures.length === 0 ? (
        <EmptyState
          title="Sin partidos"
          description={
            fixtureFilter === "all"
              ? "Cuando haya partidos en esta fecha vas a verlos acá."
              : fixtureFilter === "live"
                ? "No hay partidos en vivo para este grupo y fecha."
                : "No hay partidos próximos para este grupo y fecha."
          }
        />
      ) : null}

      {fixtures.map((fixture) => {
        const homeCode = toTeamCode(fixture.homeTeam);
        const awayCode = toTeamCode(fixture.awayTeam);
        const kickoff = new Date(fixture.kickoffAt);
        const finalScore = fixture.status === "final" && fixture.score ? `${fixture.score.home}-${fixture.score.away}` : null;
        return (
          <View key={fixture.id} style={[styles.matchCard, fixture.status === "live" ? styles.matchCardLive : null]}>
            <View style={styles.matchMainRow}>
              <View style={styles.side}>
                <TeamCrest teamName={fixture.homeTeam} code={homeCode} logoUrl={fixture.homeLogoUrl} size={32} />
                <Text allowFontScaling={false} numberOfLines={2} style={styles.teamName}>{fixture.homeTeam}</Text>
              </View>
              <View style={styles.centerBlock}>
                <Text allowFontScaling={false} style={fixture.status === "final" ? styles.centerFinalScore : styles.centerVersus}>
                  {fixture.status === "final" ? finalScore ?? "--" : fixture.status === "live" ? "EN VIVO" : "VS"}
                </Text>
                <Text allowFontScaling={false} style={fixture.status === "live" ? styles.centerLiveMeta : styles.centerMeta}>
                  {fixture.status === "final" ? "FINAL" : `${kickoff.getDate()}/${kickoff.getMonth() + 1}`}
                </Text>
                <Text allowFontScaling={false} style={styles.centerMeta}>{kickoff.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</Text>
              </View>
              <View style={[styles.side, styles.sideRight]}>
                <TeamCrest teamName={fixture.awayTeam} code={awayCode} logoUrl={fixture.awayLogoUrl} size={32} />
                <Text allowFontScaling={false} numberOfLines={2} style={styles.teamName}>{fixture.awayTeam}</Text>
              </View>
            </View>
          </View>
        );
      })}
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
    gap: 10
  },
  headerCard: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: "#D7DCE3",
    marginHorizontal: -12
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
  summaryRow: {
    flexDirection: "row",
    gap: 10
  },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D7DCE3",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 58
  },
  summaryLabel: {
    color: "#8A94A4",
    fontSize: 9,
    fontWeight: "800"
  },
  summaryValue: {
    marginTop: 3,
    color: "#111827",
    fontSize: 24,
    lineHeight: 26,
    fontWeight: "900"
  },
  winnerCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D7DCE3",
    backgroundColor: "#F8FAFC",
    padding: 12
  },
  winnerLabel: {
    color: "#8A94A4",
    fontSize: 9,
    fontWeight: "900"
  },
  winnerTitle: {
    marginTop: 6,
    color: "#111827",
    fontSize: 14,
    fontWeight: "900"
  },
  winnerSub: {
    marginTop: 3,
    color: "#4B5563",
    fontSize: 11,
    fontWeight: "700"
  },
  winnerShareButton: {
    marginTop: 10,
    minHeight: 34,
    borderRadius: 8,
    backgroundColor: "#E8EDCD",
    alignItems: "center",
    justifyContent: "center"
  },
  winnerShareText: {
    color: "#44511B",
    fontSize: 11,
    fontWeight: "900"
  },
  sectionHeaderRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center"
  },
  sectionHeader: {
    color: "#111827",
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "800"
  },
  sectionHeaderGlyph: {
    marginLeft: "auto",
    color: "#8A94A4",
    fontSize: 18
  },
  filterTabs: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D7DCE3",
    backgroundColor: "#F8FAFC",
    padding: 2
  },
  filterTab: {
    flex: 1,
    minHeight: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  filterTabActive: {
    backgroundColor: "#B7D70A"
  },
  filterTabLabel: {
    color: "#7A8698",
    fontSize: 11,
    fontWeight: "700"
  },
  filterTabLabelActive: {
    color: "#111827",
    fontSize: 11,
    fontWeight: "800"
  },
  matchCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D7DCE3",
    backgroundColor: "#F8FAFC",
    paddingVertical: 10,
    paddingHorizontal: 12
  },
  matchCardLive: {
    borderColor: "#EF4444",
    borderWidth: 2
  },
  matchMainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  side: {
    flex: 1,
    alignItems: "center",
    gap: 6
  },
  sideRight: {
    alignItems: "center"
  },
  teamName: {
    color: "#1F2937",
    fontWeight: "800",
    fontSize: 10,
    lineHeight: 12,
    textAlign: "center"
  },
  centerBlock: {
    minWidth: 78,
    alignItems: "center"
  },
  centerVersus: {
    color: "#111827",
    fontSize: 20,
    lineHeight: 22,
    fontWeight: "900"
  },
  centerFinalScore: {
    color: "#111827",
    fontSize: 26,
    lineHeight: 28,
    fontWeight: "900"
  },
  centerLiveMeta: {
    color: "#DC2626",
    fontSize: 9,
    fontWeight: "800"
  },
  centerMeta: {
    color: "#8A94A4",
    fontSize: 9,
    fontWeight: "700"
  }
});
