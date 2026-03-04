import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Fixture, Prediction } from "@fulbito/domain";
import { colors, spacing } from "@fulbito/design-tokens";
import { isPredictionInputComplete, normalizePredictionInput } from "@fulbito/domain";
import { ScreenFrame } from "@/components/ScreenFrame";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { fixtureRepository, predictionsRepository } from "@/repositories";
import { useGroupSelection } from "@/state/GroupContext";
import { usePeriod } from "@/state/PeriodContext";

type DraftByFixture = Record<string, { home: string; away: string }>;
type PronosticosMode = "upcoming" | "history";

function toTeamCode(name: string) {
  const clean = name.trim();
  if (!clean) {
    return "---";
  }
  const words = clean
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => !["de", "del", "la", "el", "the", "fc", "club"].includes(word.toLowerCase()));
  if (words.length === 0) {
    return clean.slice(0, 3).toUpperCase();
  }
  if (words.length === 1) {
    return words[0].slice(0, 3).toUpperCase();
  }
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

export function PronosticosScreen() {
  const queryClient = useQueryClient();
  const { memberships, selectedGroupId, setSelectedGroupId } = useGroupSelection();
  const { fecha, options, setFecha } = usePeriod();
  const groupId = memberships.find((membership) => membership.groupId === selectedGroupId)?.groupId ?? memberships[0]?.groupId ?? "grupo-1";
  const [draftByFixture, setDraftByFixture] = useState<DraftByFixture>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<PronosticosMode>("upcoming");
  const [pendingFixtureId, setPendingFixtureId] = useState<string | null>(null);
  const [saveErrorByFixture, setSaveErrorByFixture] = useState<Record<string, string>>({});

  const fixtureQuery = useQuery({
    queryKey: ["fixture", groupId, fecha],
    queryFn: () =>
      fixtureRepository.listFixture({
        groupId,
        fecha
      })
  });

  const predictionsQuery = useQuery({
    queryKey: ["predictions", groupId, fecha],
    queryFn: () =>
      predictionsRepository.listPredictions({
        groupId,
        fecha
      })
  });

  useEffect(() => {
    if (!fixtureQuery.data || !predictionsQuery.data) {
      return;
    }

    const predictionByFixture = new Map(predictionsQuery.data.map((row) => [row.fixtureId, row]));
    const nextDrafts = fixtureQuery.data.reduce<DraftByFixture>((acc, fixture) => {
      const existing = predictionByFixture.get(fixture.id);
      acc[fixture.id] = {
        home: existing ? String(existing.home) : "",
        away: existing ? String(existing.away) : ""
      };
      return acc;
    }, {});

    setDraftByFixture(nextDrafts);
  }, [fixtureQuery.data, predictionsQuery.data]);

  const savePredictionMutation = useMutation({
    mutationFn: async (input: Prediction) => {
      await predictionsRepository.savePrediction({
        groupId,
        fecha,
        prediction: input
      });
    },
    onMutate: async (prediction) => {
      setStatusMessage(null);
      setPendingFixtureId(prediction.fixtureId);
      setSaveErrorByFixture((previous) => {
        if (!previous[prediction.fixtureId]) {
          return previous;
        }
        const next = { ...previous };
        delete next[prediction.fixtureId];
        return next;
      });
      await queryClient.cancelQueries({ queryKey: ["predictions", groupId, fecha] });
      const previous = queryClient.getQueryData<Prediction[]>(["predictions", groupId, fecha]) ?? [];
      const withoutCurrent = previous.filter((item) => item.fixtureId !== prediction.fixtureId);
      queryClient.setQueryData<Prediction[]>(["predictions", groupId, fecha], [...withoutCurrent, prediction]);
      return { previous };
    },
    onError: (_error, prediction, context) => {
      if (context?.previous) {
        queryClient.setQueryData<Prediction[]>(["predictions", groupId, fecha], context.previous);
      }
      setSaveErrorByFixture((previous) => ({
        ...previous,
        [prediction.fixtureId]: "No se pudo guardar este pronóstico."
      }));
      setStatusMessage("No se pudo guardar el pronóstico. Reintentá.");
    },
    onSuccess: () => {
      setStatusMessage("Pronóstico guardado.");
    },
    onSettled: async () => {
      setPendingFixtureId(null);
      await queryClient.invalidateQueries({ queryKey: ["predictions", groupId, fecha] });
    }
  });

  const upcomingFixtures = useMemo(
    () => (fixtureQuery.data ?? []).filter((fixture) => fixture.status === "upcoming"),
    [fixtureQuery.data]
  );
  const historyFixtures = useMemo(
    () => (fixtureQuery.data ?? []).filter((fixture) => fixture.status !== "upcoming"),
    [fixtureQuery.data]
  );
  const visibleFixtures = mode === "upcoming" ? upcomingFixtures : historyFixtures;
  const predictionByFixture = useMemo(
    () => new Map((predictionsQuery.data ?? []).map((prediction) => [prediction.fixtureId, prediction])),
    [predictionsQuery.data]
  );
  const selectedMembership = useMemo(
    () => memberships.find((membership) => membership.groupId === groupId) ?? memberships[0],
    [groupId, memberships]
  );
  const safeOptions = options.length > 0 ? options : [{ id: fecha, label: fecha }];
  const periodIndex = Math.max(
    0,
    safeOptions.findIndex((option) => option.id === fecha)
  );
  const currentPeriod = safeOptions[periodIndex] ?? safeOptions[0];
  const fechaClosed = (fixtureQuery.data ?? []).every((fixture) => fixture.status !== "upcoming");
  const groupSummary = selectedMembership ? `${selectedMembership.leagueName} · ${selectedMembership.groupName}` : "Sin grupo activo";

  const completionSummary = useMemo(() => {
    const total = Math.max(1, (fixtureQuery.data ?? []).length);
    const completed = (fixtureQuery.data ?? []).filter((fixture) => {
      const draft = draftByFixture[fixture.id];
      if (!draft) return false;
      return isPredictionInputComplete(normalizePredictionInput(draft));
    }).length;
    const pct = Math.round((completed / total) * 100);
    return { total, completed, pct };
  }, [draftByFixture, fixtureQuery.data]);

  function updateDraft(fixtureId: string, side: "home" | "away", value: string) {
    const sanitized = value.replace(/[^\d]/g, "");
    setDraftByFixture((previous) => ({
      ...previous,
      [fixtureId]: {
        home: side === "home" ? sanitized : (previous[fixtureId]?.home ?? ""),
        away: side === "away" ? sanitized : (previous[fixtureId]?.away ?? "")
      }
    }));
  }

  function saveFixturePrediction(fixtureId: string) {
    const fixture = fixtureQuery.data?.find((item) => item.id === fixtureId);
    if (!fixture || fixture.status !== "upcoming") {
      setStatusMessage("Este partido ya está cerrado para edición.");
      return;
    }

    const draft = draftByFixture[fixtureId] ?? { home: "", away: "" };
    const normalized = normalizePredictionInput(draft);
    if (!isPredictionInputComplete(normalized)) {
      setStatusMessage("Completá ambos goles antes de guardar.");
      return;
    }

    void savePredictionMutation.mutateAsync({
      fixtureId,
      home: normalized.home,
      away: normalized.away
    });
  }

  function cycleGroup() {
    if (memberships.length <= 1) {
      return;
    }
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

  function renderFixtureCard(fixture: Fixture) {
    const draft = draftByFixture[fixture.id] ?? { home: "", away: "" };
    const normalized = normalizePredictionInput(draft);
    const isEditable = mode === "upcoming" && fixture.status === "upcoming";
    const canSave = isEditable && isPredictionInputComplete(normalized) && !savePredictionMutation.isPending;
    const statusBadgeLabel = fixture.status === "upcoming" ? "Abierto" : fixture.status === "live" ? "En juego" : "Finalizado";
    const kickoffLabel = new Date(fixture.kickoffAt).toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
    const homeCode = toTeamCode(fixture.homeTeam);
    const awayCode = toTeamCode(fixture.awayTeam);
    const hasDraft = draft.home.length > 0 || draft.away.length > 0;
    const isSavingThisFixture = pendingFixtureId === fixture.id && savePredictionMutation.isPending;
    const fixtureSaveError = saveErrorByFixture[fixture.id];

    const committed = predictionByFixture.get(fixture.id);
    const readOnlyHome = committed ? String(committed.home) : draft.home || "0";
    const readOnlyAway = committed ? String(committed.away) : draft.away || "0";

    return (
      <View key={fixture.id} style={styles.cardWrap}>
        <View style={styles.card}>
          <View style={styles.matchRow}>
            <View style={styles.teamBlock}>
              <View style={[styles.teamBadgeCircle, { borderColor: teamBadgeTone(fixture.homeTeam) }]}>
                <Text style={styles.teamBadgeText}>{homeCode.slice(0, 2)}</Text>
              </View>
              <Text numberOfLines={1} style={styles.teamCode}>
                {homeCode}
              </Text>
            </View>

            {isEditable ? (
              <View style={[styles.inputsPill, hasDraft ? styles.inputsPillActive : null]}>
                <TextInput
                  style={styles.scoreInput}
                  value={draft.home}
                  onChangeText={(value) => updateDraft(fixture.id, "home", value)}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="-"
                  placeholderTextColor={colors.textSecondary}
                  editable={isEditable}
                />
                <Text style={styles.separator}>:</Text>
                <TextInput
                  style={styles.scoreInput}
                  value={draft.away}
                  onChangeText={(value) => updateDraft(fixture.id, "away", value)}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="-"
                  placeholderTextColor={colors.textSecondary}
                  editable={isEditable}
                />
              </View>
            ) : (
              <View style={styles.resultPill}>
                <Text style={styles.resultText}>
                  {readOnlyHome} - {readOnlyAway}
                </Text>
                <Text style={styles.resultSub}>{statusBadgeLabel.toUpperCase()}</Text>
              </View>
            )}

            <View style={[styles.teamBlock, styles.teamBlockRight]}>
              <Text numberOfLines={1} style={styles.teamCode}>
                {awayCode}
              </Text>
              <View style={[styles.teamBadgeCircle, { borderColor: teamBadgeTone(fixture.awayTeam) }]}>
                <Text style={styles.teamBadgeText}>{awayCode.slice(0, 2)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.timeRow}>
            <Text style={styles.kickoffBadge}>{kickoffLabel}</Text>
          </View>
        </View>

        {isEditable ? (
          <Pressable
            onPress={() => saveFixturePrediction(fixture.id)}
            disabled={!canSave}
            style={({ pressed }) => [
              styles.saveButton,
              !canSave ? styles.saveButtonDisabled : null,
              pressed && canSave ? styles.saveButtonPressed : null
            ]}
          >
            <Text style={styles.saveButtonText}>{isSavingThisFixture ? "Guardando..." : "Guardar pronóstico"}</Text>
          </Pressable>
        ) : null}
        {!isEditable ? <Text style={styles.lockedChip}>Partido bloqueado: no se pueden editar pronósticos.</Text> : null}
        {isSavingThisFixture ? <Text style={styles.infoChip}>Guardando pronóstico...</Text> : null}
        {fixtureSaveError ? <Text style={styles.errorChip}>{fixtureSaveError}</Text> : null}
      </View>
    );
  }

  if (fixtureQuery.isLoading || predictionsQuery.isLoading) {
    return (
      <ScreenFrame title="Pronósticos" subtitle="Ingresa y guarda tus predicciones">
        <LoadingState message="Cargando partidos..." />
      </ScreenFrame>
    );
  }

  if (fixtureQuery.isError || predictionsQuery.isError) {
    return (
      <ScreenFrame title="Pronósticos" subtitle="Ingresa y guarda tus predicciones">
        <ErrorState
          message="No se pudo cargar la información de pronósticos."
          retryLabel="Reintentar"
          onRetry={() => {
            void fixtureQuery.refetch();
            void predictionsQuery.refetch();
          }}
        />
      </ScreenFrame>
    );
  }

  return (
    <ScreenFrame
      title="Pronósticos"
      subtitle="Ingresa y guarda tus predicciones"
      hideDataModeBadge
      contentStyle={styles.screenContent}
      header={
        <View style={styles.headerCard}>
          <View style={styles.brandRow}>
            <View style={styles.brandBadge}>
              <Text style={styles.brandBadgeText}>🏆</Text>
            </View>
            <Text style={styles.brandTitle}>
              <Text style={styles.brandTitleDark}>FULBITO</Text>
              <Text style={styles.brandTitleAccent}>PRODE</Text>
            </Text>
            <View style={styles.headerActions}>
              <Pressable style={styles.headerActionButton} accessibilityRole="button" accessibilityLabel="Cambiar tema">
                <View style={styles.iconSunOuter}>
                  <View style={styles.iconSunCore} />
                </View>
              </Pressable>
              <Pressable style={styles.headerActionButton} accessibilityRole="button" accessibilityLabel="Notificaciones">
                <View style={styles.iconBellBody} />
                <View style={styles.iconBellDot} />
              </Pressable>
              <Pressable style={styles.headerActionButton} accessibilityRole="button" accessibilityLabel="Configuración">
                <View style={styles.iconGearOuter}>
                  <View style={styles.iconGearCore} />
                </View>
              </Pressable>
              <View style={styles.profileDot}>
                <Text style={styles.profileDotText}>FC</Text>
              </View>
            </View>
          </View>
          <View style={styles.titleRow}>
            <View style={styles.sectionIcon}>
              <Text style={styles.sectionIconText}>∿</Text>
            </View>
            <Text style={styles.sectionTitle}>Pronósticos</Text>
            <Text style={styles.sectionSubtitle}>Resultados y carga</Text>
          </View>
        </View>
      }
    >
      <View style={styles.block}>
        <Text style={styles.blockLabel}>SELECCION ACTUAL</Text>
        <Pressable style={styles.selectionButton} onPress={cycleGroup}>
          <Text numberOfLines={1} style={styles.selectionText}>
            {groupSummary}
          </Text>
          <Text style={styles.selectionChevron}>⌄</Text>
        </Pressable>
      </View>

      <View style={styles.block}>
        <View style={styles.fechaRow}>
          <Pressable testID="fecha-prev" onPress={goPrevFecha} style={styles.fechaNavButton}>
            <Text style={styles.fechaNavLabel}>‹</Text>
          </Pressable>
          <View style={styles.fechaCenter}>
            <Text style={styles.fechaTitle}>{currentPeriod.label}</Text>
            <Text style={styles.fechaStatus}>{fechaClosed ? "Cerrada" : "Abierta"}</Text>
          </View>
          <Pressable testID="fecha-next" onPress={goNextFecha} style={styles.fechaNavButton}>
            <Text style={styles.fechaNavLabel}>›</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.summaryModeRow}>
        <View style={styles.progressCard}>
          <Text style={styles.progressLabel}>
            {completionSummary.completed}/{completionSummary.total}
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${completionSummary.pct}%` }]} />
          </View>
        </View>
        <View style={styles.modeTabs}>
          <Pressable onPress={() => setMode("upcoming")} style={[styles.modeTab, mode === "upcoming" ? styles.modeTabActive : null]}>
            <Text style={[styles.modeTabLabel, mode === "upcoming" ? styles.modeTabLabelActive : null]}>Por jugar</Text>
          </Pressable>
          <Pressable onPress={() => setMode("history")} style={[styles.modeTab, mode === "history" ? styles.modeTabActive : null]}>
            <Text style={[styles.modeTabLabel, mode === "history" ? styles.modeTabLabelActive : null]}>Jugados</Text>
          </Pressable>
        </View>
      </View>
      {visibleFixtures.length === 0 ? (
        <EmptyState
          title={mode === "upcoming" ? "Sin partidos próximos" : "Sin partidos finalizados"}
          description={mode === "upcoming" ? "Volvé más tarde para cargar tus próximos pronósticos." : "Todavía no hay partidos en historial para esta fecha."}
        />
      ) : null}
      {visibleFixtures.map((fixture) => renderFixtureCard(fixture))}
      {statusMessage ? <Text style={styles.statusText}>{statusMessage}</Text> : null}
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    gap: 12
  },
  headerCard: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: "#D7DCE3"
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
  brandBadgeText: {
    fontSize: 13
  },
  brandTitle: {
    flex: 1,
    fontSize: 27,
    fontWeight: "900",
    letterSpacing: -0.8
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
    justifyContent: "center",
    position: "relative"
  },
  iconSunOuter: {
    height: 14,
    width: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#6B7280",
    alignItems: "center",
    justifyContent: "center"
  },
  iconSunCore: {
    height: 4,
    width: 4,
    borderRadius: 999,
    backgroundColor: "#6B7280"
  },
  iconBellBody: {
    height: 12,
    width: 11,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    borderWidth: 1.5,
    borderColor: "#6B7280"
  },
  iconBellDot: {
    position: "absolute",
    top: 7,
    right: 9,
    height: 4,
    width: 4,
    borderRadius: 999,
    backgroundColor: "#D94651"
  },
  iconGearOuter: {
    height: 14,
    width: 14,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#6B7280",
    alignItems: "center",
    justifyContent: "center"
  },
  iconGearCore: {
    height: 4,
    width: 4,
    borderRadius: 999,
    backgroundColor: "#6B7280"
  },
  titleRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
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
    fontSize: 36,
    fontWeight: "800"
  },
  sectionSubtitle: {
    marginLeft: "auto",
    color: "#7A8698",
    fontSize: 24,
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
    fontSize: 17
  },
  selectionChevron: {
    color: "#98A2B3",
    fontSize: 18
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
    fontSize: 34,
    fontWeight: "900"
  },
  fechaStatus: {
    marginTop: 2,
    color: "#8A94A4",
    fontSize: 14,
    fontWeight: "700"
  },
  summaryModeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  cardWrap: {
    gap: 6
  },
  card: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D7DCE3",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8
  },
  matchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6
  },
  teamBlock: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7
  },
  teamBlockRight: {
    justifyContent: "flex-end"
  },
  teamBadgeCircle: {
    height: 30,
    width: 30,
    borderRadius: 999,
    borderWidth: 2,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center"
  },
  teamBadgeText: {
    color: "#1F2937",
    fontSize: 10,
    fontWeight: "800"
  },
  teamCode: {
    color: "#111827",
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -1
  },
  inputsPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 132,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#CED5DE",
    backgroundColor: "#EEF2F5"
  },
  inputsPillActive: {
    borderColor: "#B7D70A",
    backgroundColor: "#F4F8E7"
  },
  resultPill: {
    minWidth: 132,
    borderRadius: 10,
    backgroundColor: "#E9EDF2",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 8
  },
  resultText: {
    color: "#111827",
    fontWeight: "900",
    fontSize: 18
  },
  resultSub: {
    marginTop: 1,
    color: "#6B7280",
    fontSize: 10,
    fontWeight: "800"
  },
  scoreInput: {
    width: 36,
    height: 34,
    color: "#4B5563",
    textAlign: "center",
    fontSize: 36,
    fontWeight: "900",
    paddingVertical: 0
  },
  separator: {
    color: "#9AA4B2",
    fontSize: 28,
    fontWeight: "800",
    marginHorizontal: 2
  },
  timeRow: {
    alignItems: "center"
  },
  kickoffBadge: {
    color: "#97A1B1",
    fontSize: 15,
    fontWeight: "800"
  },
  saveButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38,
    borderRadius: 10,
    backgroundColor: "#B7D70A",
    paddingHorizontal: 10
  },
  saveButtonDisabled: {
    opacity: 0.5
  },
  saveButtonPressed: {
    transform: [{ scale: 0.98 }]
  },
  saveButtonText: {
    color: "#1F2937",
    fontWeight: "800",
    fontSize: 14
  },
  lockedChip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F1C38C",
    backgroundColor: "#FDF3E8",
    color: "#D09044",
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 14,
    fontWeight: "700"
  },
  infoChip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D8DEE7",
    backgroundColor: "#F5F7FA",
    color: "#7A8698",
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13
  },
  errorChip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F1A4AC",
    backgroundColor: "#FFECEE",
    color: "#DB5E6D",
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13
  },
  modeTabs: {
    flexDirection: "row",
    backgroundColor: "#E8EDF2",
    borderRadius: 10,
    padding: 2,
    gap: 2
  },
  modeTab: {
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    height: 34,
    paddingHorizontal: 12
  },
  modeTabActive: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DDE3EA"
  },
  modeTabLabel: {
    color: "#8A94A4",
    fontSize: 13,
    fontWeight: "700"
  },
  modeTabLabelActive: {
    color: "#374151"
  },
  progressCard: {
    width: "56%",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#D7DCE3",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6
  },
  progressLabel: {
    color: "#7A8698",
    fontSize: 14,
    fontWeight: "700"
  },
  progressTrack: {
    flex: 1,
    height: 9,
    borderRadius: 999,
    backgroundColor: "#E8EDF2",
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#B7D70A"
  },
  statusText: {
    color: "#7A8698",
    fontSize: 13
  }
});
