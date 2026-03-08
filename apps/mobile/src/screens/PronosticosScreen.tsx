import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Fixture, Prediction, PredictionHistoryEntry } from "@fulbito/domain";
import { colors, spacing } from "@fulbito/design-tokens";
import { isPredictionInputComplete, normalizePredictionInput } from "@fulbito/domain";
import { ScreenFrame } from "@/components/ScreenFrame";
import { HeaderGroupSelector } from "@/components/HeaderGroupSelector";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { BrandBadgeIcon } from "@/components/BrandBadgeIcon";
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
  const safeOptions = options.length > 0 ? options : [{ id: fecha, label: fecha }];
  const periodIndex = Math.max(
    0,
    safeOptions.findIndex((option) => option.id === fecha)
  );
  const currentPeriod = safeOptions[periodIndex] ?? safeOptions[0];
  const fechaClosed = (fixtureQuery.data ?? []).every((fixture) => !isOpenUpcomingFixture(fixture));

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
  }, [groupId, fecha]);

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
    const actualResultLabel =
      historyEntry?.status === "final"
        ? historyEntry.actualResult
          ? `${historyEntry.actualResult.home} - ${historyEntry.actualResult.away}`
          : "Pendiente de resultado"
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
      </View>

        {mode === "upcoming" && !isEditable ? <Text allowFontScaling={false} style={styles.lockedChip}>Partido bloqueado: no se pueden editar pronósticos.</Text> : null}
        {mode === "history" ? (
          <View style={styles.historySummary}>
            <Text allowFontScaling={false} style={styles.historySummaryText}>Tu pronóstico: {userPredictionLabel}</Text>
            <Text allowFontScaling={false} style={styles.historySummaryText}>Resultado final: {actualResultLabel}</Text>
          </View>
        ) : null}
        {isSavingThisFixture ? <Text allowFontScaling={false} style={styles.infoChip}>Guardando pronóstico...</Text> : null}
        {fixtureSaveError ? <Text allowFontScaling={false} style={styles.errorChip}>{fixtureSaveError}</Text> : null}
      </View>
    );
  }

  const historyIsLoadingFallback = mode === "history" && historyFixtures.length === 0 && historyFixtureQuery.isLoading;
  const historyHasFallbackError = mode === "history" && historyFixtures.length === 0 && historyFixtureQuery.isError;

  if (fixtureQuery.isLoading || predictionsQuery.isLoading || historyIsLoadingFallback) {
    return (
      <ScreenFrame title="Pronósticos" subtitle="Ingresa y guarda tus predicciones">
        <LoadingState message="Cargando partidos..." />
      </ScreenFrame>
    );
  }

  if (fixtureQuery.isError || predictionsQuery.isError || historyHasFallbackError) {
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
      containerStyle={styles.screenContainer}
      contentStyle={styles.screenContent}
      header={
        <View style={[styles.headerCard, { paddingTop: Math.max(insets.top, 10) + 2, marginTop: 0 }]}>
          <View style={styles.brandRow}>
            <View style={styles.brandBadge}>
              <BrandBadgeIcon size={16} />
            </View>
            <Text allowFontScaling={false} numberOfLines={1} style={styles.brandTitle}>
              <Text style={styles.brandTitleDark}>FULBITO</Text>
              <Text style={styles.brandTitleAccent}>PRODE</Text>
            </Text>
            <View style={styles.profileDot}>
              <Text allowFontScaling={false} style={styles.profileDotText}>FC</Text>
            </View>
          </View>
          <View style={styles.titleRow}>
            <View style={styles.sectionIcon}>
              <Text allowFontScaling={false} style={styles.sectionIconText}>∿</Text>
            </View>
            <Text allowFontScaling={false} style={styles.sectionTitle}>Pronósticos</Text>
            <HeaderGroupSelector memberships={memberships} selectedGroupId={selectedGroupId} onSelectGroup={(nextGroupId) => void setSelectedGroupId(nextGroupId)} />
          </View>
        </View>
      }
    >
      <View style={styles.block}>
        <View style={styles.fechaRow}>
          <Pressable testID="fecha-prev" onPress={goPrevFecha} style={styles.fechaNavButton}>
            <Text allowFontScaling={false} style={styles.fechaNavLabel}>‹</Text>
          </Pressable>
          <View style={styles.fechaCenter}>
            <Text allowFontScaling={false} style={styles.fechaTitle}>{currentPeriod.label}</Text>
            <Text allowFontScaling={false} style={styles.fechaStatus}>{fechaClosed ? "Cerrada" : "Abierta"}</Text>
          </View>
          <Pressable testID="fecha-next" onPress={goNextFecha} style={styles.fechaNavButton}>
            <Text allowFontScaling={false} style={styles.fechaNavLabel}>›</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.progressCard}>
        <Text allowFontScaling={false} style={styles.progressLabel}>
          {completionSummary.completed}/{completionSummary.total}
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${completionSummary.pct}%` }]} />
        </View>
      </View>

      <View style={styles.modeTabs}>
        <Pressable onPress={() => setMode("upcoming")} style={[styles.modeTab, mode === "upcoming" ? styles.modeTabActive : null]}>
          <Text allowFontScaling={false} style={[styles.modeTabLabel, mode === "upcoming" ? styles.modeTabLabelActive : null]}>Por Jugar</Text>
        </Pressable>
        <Pressable onPress={() => setMode("history")} style={[styles.modeTab, mode === "history" ? styles.modeTabActive : null]}>
          <Text allowFontScaling={false} style={[styles.modeTabLabel, mode === "history" ? styles.modeTabLabelActive : null]}>Jugados</Text>
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
    paddingTop: 10,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: "#D7DCE3",
    marginHorizontal: -12,
    marginTop: 0
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
  // Icon drawing is intentionally glyph-based for consistency with other parity screens.
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
  teamCode: {
    color: "#111827",
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
    width: 28,
    height: 28,
    color: "#4B5563",
    textAlign: "center",
    fontSize: 18,
    fontWeight: "900",
    paddingVertical: 0
  },
  separator: {
    color: "#9AA4B2",
    fontSize: 18,
    fontWeight: "800",
    marginHorizontal: 2
  },
  timeRow: {
    alignItems: "center"
  },
  kickoffBadge: {
    color: "#97A1B1",
    fontSize: 10,
    fontWeight: "800"
  },
  lockedChip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F1C38C",
    backgroundColor: "#FDF3E8",
    color: "#D09044",
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 11,
    fontWeight: "700"
  },
  historySummary: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D8DEE7",
    backgroundColor: "#F5F7FA",
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 3
  },
  historySummaryText: {
    color: "#5F6B7A",
    fontSize: 11,
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
    fontSize: 11
  },
  errorChip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F1A4AC",
    backgroundColor: "#FFECEE",
    color: "#DB5E6D",
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 11
  },
  modeTabs: {
    flexDirection: "row",
    width: "100%",
    backgroundColor: "#E8EDF2",
    borderRadius: 10,
    padding: 2,
    gap: 2
  },
  modeTab: {
    flex: 1,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  modeTabActive: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DDE3EA"
  },
  modeTabLabel: {
    color: "#8A94A4",
    fontSize: 10,
    fontWeight: "700"
  },
  modeTabLabelActive: {
    color: "#374151"
  },
  progressCard: {
    width: "100%",
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
    fontSize: 10,
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
    fontSize: 11
  }
});
