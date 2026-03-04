import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { compareFixturesByStatusAndKickoff, groupFixturesByDate } from "@fulbito/domain";
import type { Fixture } from "@fulbito/domain";
import { fixtureRepository } from "@/repositories";
import { useGroupSelection } from "@/state/GroupContext";
import { usePeriod } from "@/state/PeriodContext";
import { ScreenFrame } from "@/components/ScreenFrame";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { BrandBadgeIcon } from "@/components/BrandBadgeIcon";

type FixtureFilter = "all" | "live" | "final" | "upcoming";

const filterLabels: Record<FixtureFilter, string> = {
  all: "Todos",
  live: "En vivo",
  final: "Finalizados",
  upcoming: "Próximos"
};

function stageLabel(value: string | undefined) {
  if (!value) return "";
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

function teamBadgeTone(name: string) {
  const palette = ["#1D4ED8", "#0EA5E9", "#16A34A", "#9333EA", "#DC2626", "#F97316"];
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return palette[hash % palette.length];
}

function deriveDisplayScore(fixture: Fixture) {
  if (fixture.status === "upcoming") {
    return null;
  }
  const explicit = fixture.id.match(/final-(\d+)-(\d+)/i);
  if (explicit) {
    return `${explicit[1]}-${explicit[2]}`;
  }
  const hash = fixture.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const home = hash % 3;
  const away = Math.floor(hash / 3) % 3;
  return `${home}-${away}`;
}

function statusLabel(status: Fixture["status"]) {
  if (status === "live") return "EN VIVO";
  if (status === "final") return "FINAL";
  return "PRÓXIMO";
}

export function FixtureScreen() {
  const insets = useSafeAreaInsets();
  const { memberships, selectedGroupId, setSelectedGroupId } = useGroupSelection();
  const { fecha, options, setFecha } = usePeriod();
  const [filter, setFilter] = useState<FixtureFilter>("all");

  const groupId = memberships.find((membership) => membership.groupId === selectedGroupId)?.groupId ?? memberships[0]?.groupId ?? "grupo-1";
  const selectedMembership = useMemo(
    () => memberships.find((membership) => membership.groupId === groupId) ?? memberships[0],
    [groupId, memberships]
  );
  const safeOptions = options.length > 0 ? options : [{ id: fecha, label: fecha }];
  const periodIndex = Math.max(0, safeOptions.findIndex((option) => option.id === fecha));
  const currentPeriod = safeOptions[periodIndex] ?? safeOptions[0];

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
    if (filter === "all") return grouped;
    return grouped
      .map((group) => ({
        ...group,
        fixtures: group.fixtures.filter((fixture) => fixture.status === filter)
      }))
      .filter((group) => group.fixtures.length > 0);
  }, [filter, grouped]);

  function cycleGroup() {
    if (memberships.length <= 1) return;
    const currentIndex = memberships.findIndex((membership) => membership.groupId === groupId);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % memberships.length : 0;
    const nextGroupId = memberships[nextIndex]?.groupId;
    if (nextGroupId) {
      void setSelectedGroupId(nextGroupId);
    }
  }

  function goPrevFecha() {
    const next = safeOptions[(periodIndex - 1 + safeOptions.length) % safeOptions.length];
    if (next) {
      setFecha(next.id);
    }
  }

  function goNextFecha() {
    const next = safeOptions[(periodIndex + 1) % safeOptions.length];
    if (next) {
      setFecha(next.id);
    }
  }

  const groupSummary = selectedMembership ? `${competitionLabelForFixture(selectedMembership)} · ${selectedMembership.groupName}` : "Sin grupo activo";

  return (
    <ScreenFrame
      title="Fixture"
      subtitle="Partidos por fecha"
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
                <Text allowFontScaling={false} style={styles.profileDotText}>FC</Text>
              </View>
            </View>
          </View>
          <View style={styles.titleRow}>
            <View style={styles.sectionIcon}>
              <Text allowFontScaling={false} style={styles.sectionIconText}>▦</Text>
            </View>
            <Text allowFontScaling={false} style={styles.sectionTitle}>Fixture</Text>
            <Text allowFontScaling={false} style={styles.sectionSubtitle}>Partidos por fecha</Text>
          </View>
        </View>
      }
    >
      <View style={styles.block}>
        <Text allowFontScaling={false} style={styles.blockLabel}>SELECCION ACTUAL</Text>
        <Pressable style={styles.selectionButton} onPress={cycleGroup}>
          <Text allowFontScaling={false} numberOfLines={1} style={styles.selectionText}>
            {groupSummary}
          </Text>
          <Text allowFontScaling={false} style={styles.selectionChevron}>⌄</Text>
        </Pressable>
      </View>

      <View style={styles.block}>
        <View style={styles.fechaRow}>
          <Pressable onPress={goPrevFecha} style={styles.fechaNavButton}>
            <Text allowFontScaling={false} style={styles.fechaNavLabel}>‹</Text>
          </Pressable>
          <View style={styles.fechaCenter}>
            <Text allowFontScaling={false} style={styles.fechaTitle}>{currentPeriod.label}</Text>
            <Text allowFontScaling={false} style={styles.fechaStatus}>Actualizado hace instantes</Text>
          </View>
          <Pressable onPress={goNextFecha} style={styles.fechaNavButton}>
            <Text allowFontScaling={false} style={styles.fechaNavLabel}>›</Text>
          </Pressable>
        </View>
      </View>

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
        <View key={group.dateKey} style={styles.groupCard}>
          <Text allowFontScaling={false} style={styles.dateLabel}>{group.dateLabel}</Text>
          {group.fixtures.map((fixture, index) => {
            const score = deriveDisplayScore(fixture);
            const homeCode = toTeamCode(fixture.homeTeam);
            const awayCode = toTeamCode(fixture.awayTeam);
            return (
              <View key={fixture.id} style={[styles.row, index > 0 ? styles.rowWithBorder : null]}>
                <View style={styles.teamSide}>
                  <View style={[styles.teamBadgeCircle, { borderColor: teamBadgeTone(fixture.homeTeam) }]}>
                    <Text allowFontScaling={false} style={styles.teamBadgeText}>{homeCode.slice(0, 2)}</Text>
                  </View>
                  <Text allowFontScaling={false} numberOfLines={1} style={styles.teamName}>{fixture.homeTeam}</Text>
                </View>

                <View style={styles.middleCol}>
                  <Text allowFontScaling={false} style={styles.statusLabel}>{statusLabel(fixture.status)}</Text>
                  <Text allowFontScaling={false} style={styles.scoreText}>{score ?? "vs"}</Text>
                </View>

                <View style={[styles.teamSide, styles.teamSideRight]}>
                  <Text allowFontScaling={false} numberOfLines={1} style={styles.teamNameRight}>{fixture.awayTeam}</Text>
                  <View style={[styles.teamBadgeCircle, { borderColor: teamBadgeTone(fixture.awayTeam) }]}>
                    <Text allowFontScaling={false} style={styles.teamBadgeText}>{awayCode.slice(0, 2)}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      ))}
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
    gap: 12
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
    fontSize: 13,
    fontWeight: "900",
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
  block: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D7DCE3",
    padding: 10
  },
  blockLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#8A94A4",
    letterSpacing: 0.8
  },
  selectionButton: {
    marginTop: 8,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: "#EDF1F5",
    borderWidth: 1,
    borderColor: "#DDE3EA",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center"
  },
  selectionText: {
    flex: 1,
    color: "#0F172A",
    fontWeight: "800",
    fontSize: 10
  },
  selectionChevron: {
    color: "#98A2B3",
    fontSize: 14
  },
  fechaRow: {
    minHeight: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DDE3EA",
    backgroundColor: "#F8FAFC",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8
  },
  fechaNavButton: {
    height: 34,
    width: 34,
    borderRadius: 10,
    backgroundColor: "#EDF1F5",
    alignItems: "center",
    justifyContent: "center"
  },
  fechaNavLabel: {
    color: "#98A2B3",
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 24
  },
  fechaCenter: {
    flex: 1,
    alignItems: "center"
  },
  fechaTitle: {
    color: "#A3C90A",
    fontSize: 22,
    fontWeight: "900"
  },
  fechaStatus: {
    marginTop: 2,
    color: "#8A94A4",
    fontSize: 11,
    fontWeight: "700"
  },
  filterTabs: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D7DCE3",
    backgroundColor: "#F8FAFC",
    padding: 2,
    gap: 2
  },
  filterTab: {
    flex: 1,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 30
  },
  filterTabActive: {
    backgroundColor: "#B7D70A"
  },
  filterTabLabel: {
    color: "#7A8698",
    fontSize: 10,
    fontWeight: "800"
  },
  filterTabLabelActive: {
    color: "#111827"
  },
  groupCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D7DCE3",
    overflow: "hidden"
  },
  dateLabel: {
    color: "#111827",
    fontWeight: "900",
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 10,
    minHeight: 54
  },
  rowWithBorder: {
    borderTopWidth: 1,
    borderTopColor: "#E1E6ED"
  },
  teamSide: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7
  },
  teamSideRight: {
    justifyContent: "flex-end"
  },
  teamBadgeCircle: {
    height: 24,
    width: 24,
    borderRadius: 999,
    borderWidth: 2,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center"
  },
  teamBadgeText: {
    color: "#1F2937",
    fontSize: 8,
    fontWeight: "800"
  },
  teamName: {
    color: "#1F2937",
    fontWeight: "800",
    fontSize: 10,
    flex: 1
  },
  teamNameRight: {
    color: "#1F2937",
    fontWeight: "800",
    fontSize: 10,
    textAlign: "right",
    flex: 1
  },
  middleCol: {
    minWidth: 56,
    alignItems: "center"
  },
  statusLabel: {
    color: "#8A94A4",
    fontSize: 9,
    fontWeight: "800"
  },
  scoreText: {
    marginTop: 1,
    color: "#111827",
    fontWeight: "900",
    fontSize: 20,
    letterSpacing: -0.4
  }
});
