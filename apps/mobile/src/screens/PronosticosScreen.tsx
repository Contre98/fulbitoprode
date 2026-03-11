import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Fixture, Prediction, PredictionHistoryEntry } from "@fulbito/domain";
import { colors, spacing } from "@fulbito/design-tokens";
import { calculatePredictionPoints, isPredictionInputComplete, normalizePredictionInput } from "@fulbito/domain";
import { ScreenFrame } from "@/components/ScreenFrame";
import { HeaderGroupSelector } from "@/components/HeaderGroupSelector";
import { HeaderActionIcons } from "@/components/HeaderActionIcons";
import { FechaSelector } from "@/components/FechaSelector";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { TeamCrest } from "@/components/TeamCrest";
import { fixtureRepository, predictionsRepository } from "@/repositories";
import { useGroupSelection } from "@/state/GroupContext";
import { usePeriod } from "@/state/PeriodContext";

type DraftByFixture = Record<string, { home: string; away: string }>;
type PronosticosMode = "upcoming" | "history";
type FixtureSaveStatus = "idle" | "saving" | "error";

function toTeamCode(name: string) {
  const clean = name.trim();
  if (!clean) {
    return "---";
  }
  const lettersOnly = clean.replace(/[^A-Za-zÀ-ÿ]/g, "");
  if (lettersOnly.length >= 3) {
    return lettersOnly.slice(0, 3).toUpperCase();
  }
  return lettersOnly.toUpperCase().padEnd(3, "-");
}

function stageLabel(value: string | undefined) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function competitionLabelForPronosticos(input: {
  leagueName?: string;
  competitionName?: string;
  competitionStage?: string;
}) {
  const leagueOrCompetition = input.competitionName?.trim() || input.leagueName?.trim() || "";
  const stage = stageLabel(input.competitionStage?.trim());
  if (leagueOrCompetition && stage && !leagueOrCompetition.toLowerCase().includes(stage.toLowerCase())) {
    return `${leagueOrCompetition} ${stage}`;
  }
  return leagueOrCompetition || stage || "Sin competencia";
}

function isOpenUpcomingFixture(fixture: Fixture) {
  if (fixture.status !== "upcoming") {
    return false;
  }
  const kickoffMs = new Date(fixture.kickoffAt).getTime();
  return Number.isFinite(kickoffMs) && kickoffMs > Date.now();
}

export function PronosticosScreen() {
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { memberships, selectedGroupId, setSelectedGroupId } = useGroupSelection();
  const { fecha, options, setFecha } = usePeriod();
  const groupId = memberships.find((membership) => membership.groupId === selectedGroupId)?.groupId ?? memberships[0]?.groupId ?? "grupo-1";
  const safePeriodOptions = options.length > 0 ? options : [{ id: fecha, label: fecha }];
  const currentPeriodIndex = safePeriodOptions.findIndex((option) => option.id === fecha);
  const resolvedPeriodIndex = currentPeriodIndex >= 0 ? currentPeriodIndex : 0;
  const [draftByFixture, setDraftByFixture] = useState<DraftByFixture>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<PronosticosMode>("upcoming");
  const [saveStatusByFixture, setSaveStatusByFixture] = useState<Record<string, FixtureSaveStatus>>({});
  const [saveErrorByFixture, setSaveErrorByFixture] = useState<Record<string, string>>({});
  const draftByFixtureRef = useRef<DraftByFixture>({});
  const autoSaveTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const autoSaveQueueRef = useRef<Map<string, Prediction>>(new Map());
  const autoSaveInFlightRef = useRef<Set<string>>(new Set());
  const missingFinalScoreLoggedRef = useRef<Set<string>>(new Set());
  const lastAutoModeKeyRef = useRef<string>("");

  const fixtureQuery = useQuery({
    queryKey: ["fixture", groupId, fecha],
    queryFn: () =>
      fixtureRepository.listFixture({
        groupId,
        fecha
      })
  });

  const historyFixtureQuery = useQuery({
    queryKey: ["fixture-history", groupId, fecha, options.map((option) => option.id).join("|")],
    queryFn: async () => {
      const fallbackPeriods = options
        .map((option) => option.id)
        .filter((periodId) => periodId !== fecha);
      const candidatePeriods = Array.from(new Set([fecha, ...fallbackPeriods, ""]));
      let firstSuccessfulRows: Fixture[] | null = null;

      try {
        const selectedRows = await fixtureRepository.listFixture({
          groupId,
          fecha
        });
        firstSuccessfulRows = selectedRows;
        const selectedHistoricalRows = selectedRows.filter((fixture) => !isOpenUpcomingFixture(fixture));
        if (selectedRows.length > 0) {
          return selectedHistoricalRows;
        }
      } catch {
        // Continue with fallback search when selected period fails.
      }

      for (const period of candidatePeriods.slice(1)) {
        try {
          const rows = await fixtureRepository.listFixture({
            groupId,
            fecha: period
          });
          if (firstSuccessfulRows === null) {
            firstSuccessfulRows = rows;
          }
          const historicalRows = rows.filter((fixture) => !isOpenUpcomingFixture(fixture));
          if (historicalRows.length > 0) {
            return historicalRows;
          }
        } catch {
          // Continue searching other periods for history rows.
        }
      }

      return (firstSuccessfulRows ?? []).filter((fixture) => !isOpenUpcomingFixture(fixture));
    },
    enabled: mode === "history"
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

  useEffect(() => {
    draftByFixtureRef.current = draftByFixture;
  }, [draftByFixture]);

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
      setSaveStatusByFixture((previous) => ({
        ...previous,
        [prediction.fixtureId]: "saving"
      }));
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
      setSaveStatusByFixture((previous) => ({
        ...previous,
        [prediction.fixtureId]: "error"
      }));
      setStatusMessage("No se pudo guardar el pronóstico. Reintentá.");
    },
    onSuccess: () => {
      setStatusMessage(null);
    },
    onSettled: async (_data, _error, prediction) => {
      setSaveStatusByFixture((previous) => ({
        ...previous,
        [prediction.fixtureId]: "idle"
      }));
      await queryClient.invalidateQueries({ queryKey: ["predictions", groupId, fecha] });
    }
  });

  const upcomingFixtures = useMemo(
    () => (fixtureQuery.data ?? []).filter((fixture) => isOpenUpcomingFixture(fixture)),
    [fixtureQuery.data]
  );
  const historyFixtures = useMemo(
    () => (fixtureQuery.data ?? []).filter((fixture) => !isOpenUpcomingFixture(fixture)),
    [fixtureQuery.data]
  );
  const shouldDefaultToUpcomingMode = useMemo(
    () => (fixtureQuery.data ?? []).some((fixture) => fixture.status === "live" || isOpenUpcomingFixture(fixture)),
    [fixtureQuery.data]
  );
  const fallbackHistoryFixtures = historyFixtureQuery.data ?? [];
  const visibleFixtures = useMemo(() => {
    if (mode === "upcoming") {
      return upcomingFixtures;
    }

    return historyFixtures.length > 0 ? historyFixtures : fallbackHistoryFixtures;
  }, [mode, upcomingFixtures, historyFixtures, fallbackHistoryFixtures]);
  const predictionByFixture = useMemo(
    () => new Map((predictionsQuery.data ?? []).map((prediction) => [prediction.fixtureId, prediction])),
    [predictionsQuery.data]
  );
  const fixtureById = useMemo(
    () => new Map((fixtureQuery.data ?? []).map((fixture) => [fixture.id, fixture])),
    [fixtureQuery.data]
  );
  const completionSummary = useMemo(() => {
    const total = (fixtureQuery.data ?? []).length;
    const completed = (fixtureQuery.data ?? []).filter((fixture) => {
      const draft = draftByFixture[fixture.id];
      if (!draft) return false;
      return isPredictionInputComplete(normalizePredictionInput(draft));
    }).length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pct };
  }, [draftByFixture, fixtureQuery.data]);

  useEffect(
    () => () => {
      autoSaveTimersRef.current.forEach((timer) => clearTimeout(timer));
      autoSaveTimersRef.current.clear();
      autoSaveQueueRef.current.clear();
      autoSaveInFlightRef.current.clear();
    },
    []
  );

  useEffect(() => {
    autoSaveTimersRef.current.forEach((timer) => clearTimeout(timer));
    autoSaveTimersRef.current.clear();
    autoSaveQueueRef.current.clear();
    autoSaveInFlightRef.current.clear();
    missingFinalScoreLoggedRef.current.clear();
    lastAutoModeKeyRef.current = "";
  }, [groupId, fecha]);

  useEffect(() => {
    if (!fixtureQuery.data) {
      return;
    }
    const autoModeKey = `${groupId}:${fecha}`;
    if (lastAutoModeKeyRef.current === autoModeKey) {
      return;
    }
    setMode(shouldDefaultToUpcomingMode ? "upcoming" : "history");
    lastAutoModeKeyRef.current = autoModeKey;
  }, [fixtureQuery.data, groupId, fecha, shouldDefaultToUpcomingMode]);

  useEffect(() => {
    if (mode !== "history") {
      return;
    }

    const missingFixtureIds = visibleFixtures
      .filter((fixture) => fixture.status === "final" && !fixture.score)
      .map((fixture) => fixture.id)
      .filter((fixtureId) => {
        const logKey = `${groupId}:${fecha}:${fixtureId}`;
        if (missingFinalScoreLoggedRef.current.has(logKey)) {
          return false;
        }
        missingFinalScoreLoggedRef.current.add(logKey);
        return true;
      });

    if (missingFixtureIds.length === 0) {
      return;
    }

    console.error("[pronosticos] final fixtures missing actual result score", {
      fixtureIds: missingFixtureIds,
      count: missingFixtureIds.length,
      groupId,
      fecha
    });
  }, [mode, visibleFixtures, groupId, fecha]);

  const flushQueuedPrediction = async (fixtureId: string) => {
    if (autoSaveInFlightRef.current.has(fixtureId)) {
      return;
    }

    const queued = autoSaveQueueRef.current.get(fixtureId);
    if (!queued) {
      return;
    }

    autoSaveInFlightRef.current.add(fixtureId);
    await savePredictionMutation.mutateAsync(queued);
    autoSaveInFlightRef.current.delete(fixtureId);

    const latest = autoSaveQueueRef.current.get(fixtureId);
    if (latest && (latest.home !== queued.home || latest.away !== queued.away)) {
      void flushQueuedPrediction(fixtureId);
    }
  };

  const queuePredictionAutosave = (prediction: Prediction) => {
    autoSaveQueueRef.current.set(prediction.fixtureId, prediction);
    const pendingTimer = autoSaveTimersRef.current.get(prediction.fixtureId);
    if (pendingTimer) {
      clearTimeout(pendingTimer);
    }

    const timer = setTimeout(() => {
      autoSaveTimersRef.current.delete(prediction.fixtureId);
      void flushQueuedPrediction(prediction.fixtureId);
    }, 800);
    autoSaveTimersRef.current.set(prediction.fixtureId, timer);
  };

  function swipeToPreviousFecha() {
    if (safePeriodOptions.length === 0) {
      return;
    }
    const previousIndex = (resolvedPeriodIndex - 1 + safePeriodOptions.length) % safePeriodOptions.length;
    setFecha(safePeriodOptions[previousIndex].id);
  }

  function swipeToNextFecha() {
    if (safePeriodOptions.length === 0) {
      return;
    }
    const nextIndex = (resolvedPeriodIndex + 1) % safePeriodOptions.length;
    setFecha(safePeriodOptions[nextIndex].id);
  }

  function updateDraft(fixtureId: string, side: "home" | "away", value: string) {
    const sanitized = value.replace(/[^\d]/g, "");
    const currentDraft = draftByFixtureRef.current[fixtureId] ?? { home: "", away: "" };
    const nextDraft = {
      home: side === "home" ? sanitized : currentDraft.home,
      away: side === "away" ? sanitized : currentDraft.away
    };
    setSaveErrorByFixture((previous) => {
      if (!previous[fixtureId]) {
        return previous;
      }
      const next = { ...previous };
      delete next[fixtureId];
      return next;
    });

    setDraftByFixture((previous) => {
      const nextState = {
        ...previous,
        [fixtureId]: nextDraft
      };
      draftByFixtureRef.current = nextState;
      return nextState;
    });

    const fixture = fixtureById.get(fixtureId);
    if (!fixture || !isOpenUpcomingFixture(fixture)) {
      return;
    }

    const normalized = normalizePredictionInput(nextDraft);
    if (!isPredictionInputComplete(normalized)) {
      return;
    }

    queuePredictionAutosave({
      fixtureId,
      home: normalized.home,
      away: normalized.away
    });
  }

  function renderFixtureCard(fixture: Fixture) {
    const draft = draftByFixture[fixture.id] ?? { home: "", away: "" };
    const isEditable = mode === "upcoming" && isOpenUpcomingFixture(fixture);
    const statusBadgeLabel =
      fixture.status === "upcoming"
        ? isOpenUpcomingFixture(fixture)
          ? "Abierto"
          : "Cerrado"
        : fixture.status === "live"
          ? "En juego"
          : "Finalizado";
    const kickoffLabel = new Date(fixture.kickoffAt).toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
    const homeCode = toTeamCode(fixture.homeTeam);
    const awayCode = toTeamCode(fixture.awayTeam);
    const hasDraft = draft.home.length > 0 || draft.away.length > 0;
    const isSavingThisFixture = saveStatusByFixture[fixture.id] === "saving";
    const fixtureSaveError = saveErrorByFixture[fixture.id];

    const committed = predictionByFixture.get(fixture.id);
    const historyEntry: PredictionHistoryEntry | null =
      mode === "history"
        ? {
            fixtureId: fixture.id,
            status: fixture.status,
            kickoffAt: fixture.kickoffAt,
            homeTeam: fixture.homeTeam,
            awayTeam: fixture.awayTeam,
            homeLogoUrl: fixture.homeLogoUrl,
            awayLogoUrl: fixture.awayLogoUrl,
            userPrediction: committed ? { home: committed.home, away: committed.away } : null,
            actualResult: fixture.score ?? null
          }
        : null;
    const readOnlyScore =
      mode === "history"
        ? historyEntry?.actualResult ?? null
        : fixture.score ?? (committed ? { home: committed.home, away: committed.away } : null);
    const readOnlyHome = readOnlyScore ? String(readOnlyScore.home) : "-";
    const readOnlyAway = readOnlyScore ? String(readOnlyScore.away) : "-";
    const userPredictionLabel = historyEntry?.userPrediction
      ? `${historyEntry.userPrediction.home} - ${historyEntry.userPrediction.away}`
      : "Sin pronóstico";
    const earnedPointsLabel =
      historyEntry?.status === "final"
        ? historyEntry.actualResult && historyEntry.userPrediction
          ? String(calculatePredictionPoints(historyEntry.userPrediction, historyEntry.actualResult))
          : historyEntry.actualResult
            ? "0"
            : "Pendiente"
        : "Pendiente";

    return (
      <View key={fixture.id} style={styles.cardWrap}>
        <View style={styles.card}>
          <View style={styles.matchRow}>
            <View style={styles.teamBlock}>
              <TeamCrest teamName={fixture.homeTeam} code={homeCode} logoUrl={fixture.homeLogoUrl} />
              <Text allowFontScaling={false} numberOfLines={1} style={styles.teamCode}>
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
                <Text allowFontScaling={false} style={styles.separator}>:</Text>
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
                <Text allowFontScaling={false} style={styles.resultText}>
                  {readOnlyHome} - {readOnlyAway}
                </Text>
                <Text allowFontScaling={false} style={styles.resultSub}>{statusBadgeLabel.toUpperCase()}</Text>
              </View>
            )}

            <View style={[styles.teamBlock, styles.teamBlockRight]}>
              <Text allowFontScaling={false} numberOfLines={1} style={styles.teamCode}>
                {awayCode}
              </Text>
              <TeamCrest teamName={fixture.awayTeam} code={awayCode} logoUrl={fixture.awayLogoUrl} />
            </View>
          </View>

          <View style={styles.timeRow}>
            <Text allowFontScaling={false} style={styles.kickoffBadge}>{kickoffLabel}</Text>
          </View>
          {mode === "history" ? (
            <View style={styles.historySummary}>
              <Text allowFontScaling={false} style={styles.historySummaryText}>Tu pronóstico: {userPredictionLabel}</Text>
              <Text allowFontScaling={false} style={styles.historySummaryText}>Puntos: {earnedPointsLabel}</Text>
            </View>
          ) : null}
        </View>

        {mode === "upcoming" && !isEditable ? <Text allowFontScaling={false} style={styles.lockedChip}>Partido bloqueado: no se pueden editar pronósticos.</Text> : null}
        {isSavingThisFixture ? <Text allowFontScaling={false} style={styles.infoChip}>Guardando pronóstico...</Text> : null}
        {fixtureSaveError ? <Text allowFontScaling={false} style={styles.errorChip}>{fixtureSaveError}</Text> : null}
      </View>
    );
  }

  const historyIsLoadingFallback = mode === "history" && historyFixtures.length === 0 && historyFixtureQuery.isLoading;
  const historyHasFallbackError = mode === "history" && historyFixtures.length === 0 && historyFixtureQuery.isError;
  const isLoading = fixtureQuery.isLoading || predictionsQuery.isLoading || historyIsLoadingFallback;
  const hasError = fixtureQuery.isError || predictionsQuery.isError || historyHasFallbackError;

  return (
    <ScreenFrame
      title="Pronósticos"
      subtitle="Ingresa y guarda tus predicciones"
      hideDataModeBadge
      containerStyle={styles.screenContainer}
      contentStyle={styles.screenContent}
      onSwipeLeft={swipeToNextFecha}
      onSwipeRight={swipeToPreviousFecha}
      header={
        <View style={[styles.headerCard, { paddingTop: Math.max(insets.top, 10) + 2 }]}>
          <View style={styles.headerRow}>
            <HeaderGroupSelector memberships={memberships} selectedGroupId={selectedGroupId} onSelectGroup={(nextGroupId) => void setSelectedGroupId(nextGroupId)} />
            <HeaderActionIcons />
          </View>
        </View>
      }
    >
      <FechaSelector />
      {isLoading ? <LoadingState message="Cargando partidos..." variant="predictions" /> : null}
      {hasError ? (
        <ErrorState
          message="No se pudo cargar la información de pronósticos."
          retryLabel="Reintentar"
          onRetry={() => {
            void fixtureQuery.refetch();
            void predictionsQuery.refetch();
            void historyFixtureQuery.refetch();
          }}
        />
      ) : null}
      {!isLoading && !hasError ? (
        <>
          <View style={styles.progressCard}>
            <Text allowFontScaling={false} style={styles.progressLabel}>
              {completionSummary.completed}/{completionSummary.total}
            </Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${completionSummary.pct}%` }]} />
            </View>
          </View>

          <View style={styles.filterTabs}>
            <Pressable onPress={() => setMode("upcoming")} style={[styles.filterTab, mode === "upcoming" ? styles.filterTabActive : null]}>
              <Text allowFontScaling={false} style={mode === "upcoming" ? styles.filterTabLabelActive : styles.filterTabLabel}>Por Jugar</Text>
            </Pressable>
            <Pressable onPress={() => setMode("history")} style={[styles.filterTab, mode === "history" ? styles.filterTabActive : null]}>
              <Text allowFontScaling={false} style={mode === "history" ? styles.filterTabLabelActive : styles.filterTabLabel}>Jugados</Text>
            </Pressable>
          </View>
          {visibleFixtures.length === 0 ? (
            <EmptyState
              title={mode === "upcoming" ? "Sin partidos próximos" : "Sin partidos finalizados"}
              description={mode === "upcoming" ? "Volvé más tarde para cargar tus próximos pronósticos." : "Todavía no hay partidos en historial para esta fecha."}
            />
          ) : null}
          {visibleFixtures.map((fixture) => renderFixtureCard(fixture))}
          {statusMessage ? <Text allowFontScaling={false} style={styles.statusText}>{statusMessage}</Text> : null}
        </>
      ) : null}
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
    gap: 12
  },
  headerCard: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginHorizontal: -12
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8
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
    fontSize: 14,
    fontWeight: "800",
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
  cardWrap: {
    gap: 6
  },
  card: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
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
  teamCode: {
    color: colors.textHigh,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.3
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
    borderColor: colors.borderMutedAlt,
    backgroundColor: colors.surfaceTintNeutral
  },
  inputsPillActive: {
    borderColor: colors.primaryStrong,
    backgroundColor: colors.primarySoftAlt
  },
  resultPill: {
    minWidth: 132,
    borderRadius: 10,
    backgroundColor: colors.brandTintAlt,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 8
  },
  resultText: {
    color: colors.textHigh,
    fontWeight: "900",
    fontSize: 18
  },
  resultSub: {
    marginTop: 1,
    color: colors.textGray,
    fontSize: 12,
    fontWeight: "800"
  },
  scoreInput: {
    width: 28,
    height: 28,
    color: colors.textBodyStrong,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "900",
    paddingVertical: 0
  },
  separator: {
    color: colors.textSoftAlt2,
    fontSize: 18,
    fontWeight: "800",
    marginHorizontal: 2
  },
  timeRow: {
    alignItems: "center"
  },
  kickoffBadge: {
    color: colors.textSoftAlt,
    fontSize: 12,
    fontWeight: "800"
  },
  lockedChip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderWarningSoft,
    backgroundColor: colors.surfaceTintWarning,
    color: colors.warningMuted,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 11,
    fontWeight: "700"
  },
  historySummary: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderMutedSoft,
    backgroundColor: colors.surfaceTintCard,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 3
  },
  historySummaryText: {
    color: colors.textSteel,
    fontSize: 12,
    fontWeight: "700"
  },
  infoChip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderMutedSoft,
    backgroundColor: colors.surfaceTintCard,
    color: colors.textMutedAlt,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12
  },
  errorChip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderDangerSoft,
    backgroundColor: colors.surfaceTintDanger,
    color: colors.dangerMuted,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12
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
    minHeight: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center"
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
    color: colors.textHigh,
    fontSize: 14,
    fontWeight: "800"
  },
  progressCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceSoft,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6
  },
  progressLabel: {
    color: colors.textMutedAlt,
    fontSize: 12,
    fontWeight: "700"
  },
  progressTrack: {
    flex: 1,
    height: 9,
    borderRadius: 999,
    backgroundColor: colors.brandTintAlt2,
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.primaryStrong
  },
  statusText: {
    color: colors.textMutedAlt,
    fontSize: 12
  }
});
