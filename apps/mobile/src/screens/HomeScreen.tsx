import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fixtureRepository, leaderboardRepository } from "@/repositories";
import { ScreenFrame } from "@/components/ScreenFrame";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { BrandBadgeIcon } from "@/components/BrandBadgeIcon";
import { TeamCrest } from "@/components/TeamCrest";
import { useAuth } from "@/state/AuthContext";
import { useGroupSelection } from "@/state/GroupContext";
import { usePeriod } from "@/state/PeriodContext";

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
  const { memberships, selectedGroupId } = useGroupSelection();
  const { fecha } = usePeriod();
  const activeMembership = memberships.find((membership) => membership.groupId === selectedGroupId) ?? memberships[0];
  const groupId = activeMembership?.groupId ?? "grupo-1";

  const leaderboardQuery = useQuery({
    queryKey: ["leaderboard", groupId, fecha],
    queryFn: () =>
      leaderboardRepository.getLeaderboard({
        groupId,
        fecha
      })
  });

  const fixtureQuery = useQuery({
    queryKey: ["fixture", groupId, fecha],
    queryFn: () =>
      fixtureRepository.listFixture({
        groupId,
        fecha
      })
  });

  const summaryCards = useMemo(() => {
    const top = leaderboardQuery.data?.[0];
    const points = top?.points ?? 0;
    return [
      { label: "RANKING", value: top ? `#${top.rank}` : "#-" },
      { label: "PENDIENTES", value: String((fixtureQuery.data ?? []).filter((f) => f.status === "upcoming").length) },
      { label: "EN VIVO", value: String((fixtureQuery.data ?? []).filter((f) => f.status === "live").length) }
    ];
  }, [fixtureQuery.data, leaderboardQuery.data]);

  const membershipsCards = memberships.slice(0, 2);
  const fixtures = (fixtureQuery.data ?? []).slice(0, 4);

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
            <View style={styles.headerActions}>
              <Pressable style={styles.headerActionButton}>
                <Text allowFontScaling={false} style={styles.headerActionGlyph}>◔</Text>
              </Pressable>
              <Pressable style={styles.headerActionButton}>
                <Text allowFontScaling={false} style={styles.headerActionGlyph}>⌂</Text>
                <View style={styles.headerAlertDot} />
              </Pressable>
              <Pressable style={styles.headerActionButton}>
                <Text allowFontScaling={false} style={styles.headerActionGlyph}>⚙</Text>
              </Pressable>
              <View style={styles.profileDot}>
                <Text allowFontScaling={false} style={styles.profileDotText}>
                  {session?.user.name?.slice(0, 2).toUpperCase() || "FC"}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.titleRow}>
            <View style={styles.sectionIcon}>
              <Text allowFontScaling={false} style={styles.sectionIconText}>⌂</Text>
            </View>
            <Text allowFontScaling={false} style={styles.sectionTitle}>Inicio</Text>
            <Text allowFontScaling={false} style={styles.sectionSubtitle}>Tablero general</Text>
          </View>
        </View>
      }
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topCardsRow}>
        {membershipsCards.map((membership) => (
          <View key={membership.groupId} style={styles.topCard}>
            <Text allowFontScaling={false} style={styles.topCardLabel}>TEMP {membership.season}</Text>
            <Text allowFontScaling={false} numberOfLines={1} style={styles.topCardTitle}>
              {membership.groupName}
            </Text>
            <View style={styles.topCardStatsRow}>
              <View style={styles.statBox}>
                <Text allowFontScaling={false} style={styles.statBoxLabel}>RANKING</Text>
                <Text allowFontScaling={false} style={styles.statBoxValue}>#1</Text>
              </View>
              <View style={[styles.statBox, styles.statBoxAccent]}>
                <Text allowFontScaling={false} style={styles.statBoxLabelAccent}>PUNTOS</Text>
                <Text allowFontScaling={false} style={styles.statBoxValueAccent}>{leaderboardQuery.data?.[0]?.points ?? 0}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.summaryRow}>
        {summaryCards.map((item) => (
          <View key={item.label} style={styles.summaryCard}>
            <Text allowFontScaling={false} style={styles.summaryLabel}>{item.label}</Text>
            <Text allowFontScaling={false} style={styles.summaryValue}>{item.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.sectionHeaderRow}>
        <Text allowFontScaling={false} style={styles.sectionHeader}>Próximos Partidos</Text>
        <Text allowFontScaling={false} style={styles.sectionHeaderGlyph}>∿</Text>
      </View>

      <View style={styles.filterTabs}>
        <View style={[styles.filterTab, styles.filterTabActive]}>
          <Text allowFontScaling={false} style={styles.filterTabLabelActive}>Todos</Text>
        </View>
        <View style={styles.filterTab}>
          <Text allowFontScaling={false} style={styles.filterTabLabel}>En vivo</Text>
        </View>
        <View style={styles.filterTab}>
          <Text allowFontScaling={false} style={styles.filterTabLabel}>Próximos</Text>
        </View>
      </View>

      {fixtureQuery.isLoading ? <LoadingState message="Cargando partidos..." /> : null}
      {fixtureQuery.isError ? <ErrorState message="No se pudo cargar el tablero de partidos." retryLabel="Reintentar" onRetry={() => void fixtureQuery.refetch()} /> : null}
      {!fixtureQuery.isLoading && !fixtureQuery.isError && fixtures.length === 0 ? (
        <EmptyState title="Sin partidos" description="Cuando haya partidos en esta fecha vas a verlos acá." />
      ) : null}

      {fixtures.map((fixture) => {
        const homeCode = toTeamCode(fixture.homeTeam);
        const awayCode = toTeamCode(fixture.awayTeam);
        const kickoff = new Date(fixture.kickoffAt);
        return (
          <View key={fixture.id} style={styles.matchCard}>
            <View style={styles.matchMainRow}>
              <View style={styles.side}>
                <TeamCrest teamName={fixture.homeTeam} code={homeCode} size={32} />
                <Text allowFontScaling={false} numberOfLines={1} style={styles.teamName}>{fixture.homeTeam}</Text>
              </View>
              <View style={styles.centerBlock}>
                <Text allowFontScaling={false} style={styles.centerVersus}>{fixture.status === "final" ? "1-1" : "VS"}</Text>
                <Text allowFontScaling={false} style={styles.centerMeta}>{`${kickoff.getDate()}/${kickoff.getMonth() + 1}`}</Text>
                <Text allowFontScaling={false} style={styles.centerMeta}>{kickoff.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</Text>
              </View>
              <View style={[styles.side, styles.sideRight]}>
                <TeamCrest teamName={fixture.awayTeam} code={awayCode} size={32} />
                <Text allowFontScaling={false} numberOfLines={1} style={styles.teamName}>{fixture.awayTeam}</Text>
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  headerActionButton: {
    height: 32,
    width: 32,
    borderRadius: 999,
    backgroundColor: "#ECEFF3",
    alignItems: "center",
    justifyContent: "center"
  },
  headerActionGlyph: {
    color: "#6B7280",
    fontSize: 14
  },
  headerAlertDot: {
    position: "absolute",
    top: 8,
    right: 9,
    height: 4,
    width: 4,
    borderRadius: 999,
    backgroundColor: "#D94651"
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
  topCardsRow: {
    gap: 10,
    paddingRight: 4
  },
  topCard: {
    width: 234,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D7DCE3",
    backgroundColor: "#F8FAFC",
    padding: 11
  },
  topCardLabel: {
    color: "#8A94A4",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8
  },
  topCardTitle: {
    marginTop: 6,
    color: "#111827",
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "800"
  },
  topCardStatsRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8
  },
  statBox: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D7DCE3",
    backgroundColor: "#E9EDF2",
    paddingVertical: 8,
    paddingHorizontal: 10
  },
  statBoxAccent: {
    borderColor: "#B7D70A",
    backgroundColor: "#E9EFCF"
  },
  statBoxLabel: {
    color: "#8A94A4",
    fontSize: 9,
    fontWeight: "800"
  },
  statBoxLabelAccent: {
    color: "#A3C90A",
    fontSize: 9,
    fontWeight: "800"
  },
  statBoxValue: {
    marginTop: 2,
    color: "#111827",
    fontSize: 28,
    lineHeight: 30,
    fontWeight: "900"
  },
  statBoxValueAccent: {
    marginTop: 2,
    color: "#A3C90A",
    fontSize: 28,
    lineHeight: 30,
    fontWeight: "900"
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
    fontSize: 8,
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
  centerMeta: {
    color: "#8A94A4",
    fontSize: 9,
    fontWeight: "700"
  }
});
