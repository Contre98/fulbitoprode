import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated as NativeAnimated, Pressable, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Fixture, Prediction, PredictionHistoryEntry } from "@fulbito/domain";
import { colors, spacing } from "@fulbito/design-tokens";
import { calculatePredictionPoints, isPredictionInputComplete, normalizePredictionInput } from "@fulbito/domain";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from "react-native-reanimated";
import { ScreenFrame } from "@/components/ScreenFrame";
import { AppHeader } from "@/components/AppHeader";
import { FechaSelector } from "@/components/FechaSelector";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { CreateOrJoinGroupPrompt } from "@/components/CreateOrJoinGroupPrompt";
import { FormDots, MatchSideGradient } from "@/components/MatchCardVisuals";
import { TeamCrest } from "@/components/TeamCrest";
import { LivePulseBorder, estimateMatchMinute, useLivePulse } from "@/components/LiveMatchIndicator";
import { ScorePickerModal } from "@/components/ScorePickerModal";
import { formatShortDateTime24 } from "@/lib/dateTime";
import { buildTeamFormLookup, teamPredominantColor } from "@/lib/matchVisuals";
import { fixtureRepository, predictionsRepository } from "@/repositories";
import { useGroupSelection } from "@/state/GroupContext";
import { usePeriod } from "@/state/PeriodContext";

type DraftByFixture = Record<string, { home: string; away: string }>;
type PronosticosMode = "upcoming" | "history";
type FixtureSaveStatus = "idle" | "saving" | "error";
const LPF_APERTURA_2026_LABEL = "LPF: Apertura (2026)";
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const MODE_TAB_PRESS_IN_SPRING = {
  damping: 22,
  stiffness: 430,
  mass: 0.4
} as const;
const MODE_TAB_PRESS_OUT_SPRING = {
  damping: 18,
  stiffness: 340,
  mass: 0.45
} as const;
const MODE_INDICATOR_SPRING = {
  damping: 20,
  stiffness: 290,
  mass: 0.5
} as const;
const SCORE_PILL_PRESS_IN_SPRING = {
  damping: 22,
  stiffness: 420,
  mass: 0.4
} as const;
const SCORE_PILL_PRESS_OUT_SPRING = {
  damping: 18,
  stiffness: 330,
  mass: 0.45
} as const;

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
  if (value.trim().toLowerCase() === "apertura") return LPF_APERTURA_2026_LABEL;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function competitionLabelForPronosticos(input: {
  leagueName?: string;
  competitionName?: string;
  competitionStage?: string;
}) {
  if (input.competitionStage?.trim().toLowerCase() === "apertura") {
    return LPF_APERTURA_2026_LABEL;
  }
  const leagueOrCompetition = input.competitionName?.trim() || input.leagueName?.trim() || "";
  const stage = stageLabel(input.competitionStage?.trim());
  if (leagueOrCompetition && stage && !leagueOrCompetition.toLowerCase().includes(stage.toLowerCase())) {
    return `${leagueOrCompetition} ${stage}`;
  }
  return leagueOrCompetition || stage || "Sin competencia";
}

function isOpenUpcomingFixture(fixture: Fixture) {
  if (fixture.status === "postponed") {
    if (fixture.newKickoffAt) {
      const newKickoffMs = new Date(fixture.newKickoffAt).getTime();
      return Number.isFinite(newKickoffMs) && newKickoffMs > Date.now();
    }
    return true;
  }
  if (fixture.status !== "upcoming") {
    return false;
  }
  const kickoffMs = new Date(fixture.kickoffAt).getTime();
  return Number.isFinite(kickoffMs) && kickoffMs > Date.now();
}

function ModeFilterTab({
  label,
  active,
  onPress
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const pressScale = useSharedValue(1);
  const pressAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }]
  }));

  const handlePressIn = useCallback(() => {
    if (reducedMotion) {
      pressScale.value = 1;
      return;
    }
    pressScale.value = withSpring(0.97, MODE_TAB_PRESS_IN_SPRING);
  }, [pressScale, reducedMotion]);

  const handlePressOut = useCallback(() => {
    if (reducedMotion) {
      pressScale.value = 1;
      return;
    }
    pressScale.value = withSpring(1, MODE_TAB_PRESS_OUT_SPRING);
  }, [pressScale, reducedMotion]);

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.filterTab, pressAnimatedStyle]}
    >
      <Text allowFontScaling={false} style={active ? styles.filterTabLabelActive : styles.filterTabLabel}>{label}</Text>
    </AnimatedPressable>
  );
}

function EditableScorePill({
  fixtureId,
  homeValue,
  awayValue,
  active,
  onPress
}: {
  fixtureId: string;
  homeValue: string;
  awayValue: string;
  active: boolean;
  onPress: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const pressScale = useSharedValue(1);
  const pressAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }]
  }));

  const handlePressIn = useCallback(() => {
    if (reducedMotion) {
      pressScale.value = 1;
      return;
    }
    pressScale.value = withSpring(0.98, SCORE_PILL_PRESS_IN_SPRING);
  }, [pressScale, reducedMotion]);

  const handlePressOut = useCallback(() => {
    if (reducedMotion) {
      pressScale.value = 1;
      return;
    }
    pressScale.value = withSpring(1, SCORE_PILL_PRESS_OUT_SPRING);
  }, [pressScale, reducedMotion]);

  return (
    <AnimatedPressable
      accessibilityRole="button"
      testID={`score-open-${fixtureId}-home`}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.inputsPill, active ? styles.inputsPillActive : null, pressAnimatedStyle]}
    >
      <Text allowFontScaling={false} style={styles.scoreInput}>
        {homeValue.length > 0 ? homeValue : "-"}
      </Text>
      <Text allowFontScaling={false} style={styles.separator}>:</Text>
      <Text allowFontScaling={false} style={styles.scoreInput}>
        {awayValue.length > 0 ? awayValue : "-"}
      </Text>
    </AnimatedPressable>
  );
}

export function PronosticosScreen() {
  const queryClient = useQueryClient();
  const reducedMotion = useReducedMotion();
  const { memberships, selectedGroupId } = useGroupSelection();
  const { fecha, options, setFecha } = usePeriod();
  const hasMemberships = memberships.length > 0;
  const groupId = memberships.find((membership) => membership.groupId === selectedGroupId)?.groupId ?? memberships[0]?.groupId ?? null;
  const safePeriodOptions = options.length > 0 ? options : [{ id: fecha, label: fecha }];
  const currentPeriodIndex = safePeriodOptions.findIndex((option) => option.id === fecha);
  const resolvedPeriodIndex = currentPeriodIndex >= 0 ? currentPeriodIndex : 0;
  const [draftByFixture, setDraftByFixture] = useState<DraftByFixture>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<PronosticosMode>("upcoming");
  const [modeTabsWidth, setModeTabsWidth] = useState(0);
  const [scoreModalFixtureId, setScoreModalFixtureId] = useState<string | null>(null);
  const [saveStatusByFixture, setSaveStatusByFixture] = useState<Record<string, FixtureSaveStatus>>({});
  const [saveErrorByFixture, setSaveErrorByFixture] = useState<Record<string, string>>({});
  const draftByFixtureRef = useRef<DraftByFixture>({});
  const autoSaveTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const autoSaveQueueRef = useRef<Map<string, Prediction>>(new Map());
  const autoSaveInFlightRef = useRef<Set<string>>(new Set());
  const missingFinalScoreLoggedRef = useRef<Set<string>>(new Set());
  const lastAutoModeKeyRef = useRef<string>("");
  const modeIndicatorX = useSharedValue(0);

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
          groupId: groupId!,
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
            groupId: groupId!,
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
    enabled: mode === "history" && Boolean(groupId)
  });

  const predictionsQuery = useQuery({
    queryKey: ["predictions", groupId, fecha],
    queryFn: () =>
      predictionsRepository.listPredictions({
        groupId: groupId!,
        fecha
      }),
    enabled: Boolean(groupId)
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

  const hasLiveFixtures = useMemo(
    () => (fixtureQuery.data ?? []).some((fixture) => fixture.status === "live"),
    [fixtureQuery.data]
  );
  const livePulseOpacity = useLivePulse();
  const [matchClockTick, setMatchClockTick] = useState(0);
  useEffect(() => {
    if (!hasLiveFixtures) return;
    const interval = setInterval(() => setMatchClockTick((t) => t + 1), 30_000);
    return () => clearInterval(interval);
  }, [hasLiveFixtures]);

  const upcomingFixtures = useMemo(
    () => (fixtureQuery.data ?? []).filter((fixture) => fixture.status === "live" || isOpenUpcomingFixture(fixture)),
    [fixtureQuery.data]
  );
  const historyFixtures = useMemo(
    () => (fixtureQuery.data ?? []).filter((fixture) => fixture.status !== "live" && !isOpenUpcomingFixture(fixture)),
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
  const activeModeIndex = mode === "upcoming" ? 0 : 1;
  const modeTabWidth = modeTabsWidth > 0 ? (modeTabsWidth - 8) / 2 : 0;
  const modeIndicatorStyle = useAnimatedStyle(() => ({
    opacity: modeTabWidth > 0 ? 1 : 0,
    transform: [{ translateX: modeIndicatorX.value }]
  }));

  useEffect(() => {
    if (modeTabWidth <= 0) return;
    const target = activeModeIndex * (modeTabWidth + 2);
    if (reducedMotion) {
      modeIndicatorX.value = target;
      return;
    }
    modeIndicatorX.value = withSpring(target, MODE_INDICATOR_SPRING);
  }, [activeModeIndex, modeIndicatorX, modeTabWidth, reducedMotion]);
  const predictionByFixture = useMemo(
    () => new Map((predictionsQuery.data ?? []).map((prediction) => [prediction.fixtureId, prediction])),
    [predictionsQuery.data]
  );
  const fixtureById = useMemo(
    () => new Map((fixtureQuery.data ?? []).map((fixture) => [fixture.id, fixture])),
    [fixtureQuery.data]
  );
  const teamFormLookup = useMemo(
    () => buildTeamFormLookup(formFixtureQuery.data ?? fixtureQuery.data ?? []),
    [formFixtureQuery.data, fixtureQuery.data]
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

  const handleRefresh = useCallback(async () => {
    await queryClient.resetQueries();
  }, [queryClient]);

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

  function openScorePicker(fixtureId: string) {
    setScoreModalFixtureId(fixtureId);
  }

  function closeScorePicker() {
    setScoreModalFixtureId(null);
  }

  function renderFixtureCard(fixture: Fixture) {
    const draft = draftByFixture[fixture.id] ?? { home: "", away: "" };
    const isEditable = mode === "upcoming" && isOpenUpcomingFixture(fixture);
    const isLive = fixture.status === "live";
    const statusBadgeLabel =
      fixture.status === "postponed"
        ? "Postergado"
        : fixture.status === "upcoming"
          ? isOpenUpcomingFixture(fixture)
            ? "Abierto"
            : "En juego"
          : isLive
            ? "En vivo"
            : "Finalizado";
    const kickoffLabel = formatShortDateTime24(fixture.kickoffAt);
    const homeCode = toTeamCode(fixture.homeTeam);
    const awayCode = toTeamCode(fixture.awayTeam);
    const homeForm = teamFormLookup(fixture.homeTeam, fixture.kickoffAt);
    const awayForm = teamFormLookup(fixture.awayTeam, fixture.kickoffAt);
    const homeColor = teamPredominantColor(fixture.homeTeam);
    const awayColor = teamPredominantColor(fixture.awayTeam);
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
        : isLive
          ? fixture.score ?? { home: 0, away: 0 }
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- read indirectly to trigger re-render
    void matchClockTick;
    const liveMinuteLabel = isLive ? estimateMatchMinute(fixture.kickoffAt) : "";

    const cardContent = (
      <View key={fixture.id} style={styles.cardWrap}>
        <View style={[styles.card, isLive ? styles.cardLive : null]}>
          <MatchSideGradient homeColor={homeColor} awayColor={awayColor} intensity={0.09} />
          <View style={styles.cardContent}>
            <View style={styles.matchRow}>
              <View style={styles.teamBlock}>
                <TeamCrest teamName={fixture.homeTeam} code={homeCode} logoUrl={fixture.homeLogoUrl} />
                <View style={styles.teamInfoCol}>
                  <Text allowFontScaling={false} numberOfLines={1} style={styles.teamCode}>
                    {homeCode}
                  </Text>
                  <FormDots form={homeForm} />
                </View>
              </View>

              {isEditable ? (
                <EditableScorePill
                  fixtureId={fixture.id}
                  homeValue={draft.home}
                  awayValue={draft.away}
                  active={hasDraft}
                  onPress={() => openScorePicker(fixture.id)}
                />
              ) : (
                <View style={styles.resultPill}>
                  <Text allowFontScaling={false} style={styles.resultText}>
                    {readOnlyHome} - {readOnlyAway}
                  </Text>
                  {isLive && liveMinuteLabel ? (
                    <NativeAnimated.Text allowFontScaling={false} style={[styles.resultSub, styles.resultSubLive, { opacity: livePulseOpacity }]}>
                      {liveMinuteLabel}
                    </NativeAnimated.Text>
                  ) : (
                    <Text allowFontScaling={false} style={styles.resultSub}>{statusBadgeLabel.toUpperCase()}</Text>
                  )}
                </View>
              )}

              <View style={[styles.teamBlock, styles.teamBlockRight]}>
                <View style={[styles.teamInfoCol, styles.teamInfoColRight]}>
                  <Text allowFontScaling={false} numberOfLines={1} style={styles.teamCode}>
                    {awayCode}
                  </Text>
                  <FormDots form={awayForm} align="right" />
                </View>
                <TeamCrest teamName={fixture.awayTeam} code={awayCode} logoUrl={fixture.awayLogoUrl} />
              </View>
            </View>

            <View style={styles.timeRow}>
              <Text allowFontScaling={false} style={styles.kickoffBadge}>{kickoffLabel}</Text>
            </View>
            {isLive && committed ? (
              <View style={styles.livePredictionRow}>
                <Text allowFontScaling={false} style={styles.livePredictionLabel}>Tu pronóstico:</Text>
                <Text allowFontScaling={false} style={styles.livePredictionValue}>{committed.home} - {committed.away}</Text>
              </View>
            ) : null}
            {mode === "history" ? (
              <View style={styles.historySummary}>
                <Text allowFontScaling={false} style={styles.historySummaryText}>Tu pronóstico: {userPredictionLabel}</Text>
                <Text allowFontScaling={false} style={styles.historySummaryText}>Puntos: {earnedPointsLabel}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {mode === "upcoming" && !isEditable && !isLive ? <Text allowFontScaling={false} style={styles.lockedChip}>Partido bloqueado: no se pueden editar pronósticos.</Text> : null}
        {isSavingThisFixture ? <Text allowFontScaling={false} style={styles.infoChip}>Guardando pronóstico...</Text> : null}
        {fixtureSaveError ? <Text allowFontScaling={false} style={styles.errorChip}>{fixtureSaveError}</Text> : null}
      </View>
    );

    if (isLive) {
      return <LivePulseBorder key={fixture.id}>{cardContent}</LivePulseBorder>;
    }
    return cardContent;
  }

  const historyIsLoadingFallback = mode === "history" && historyFixtures.length === 0 && historyFixtureQuery.isLoading;
  const historyHasFallbackError = mode === "history" && historyFixtures.length === 0 && historyFixtureQuery.isError;
  const isLoading = fixtureQuery.isLoading || predictionsQuery.isLoading || historyIsLoadingFallback;
  const hasError = fixtureQuery.isError || predictionsQuery.isError || historyHasFallbackError;
  const scoreModalFixture = scoreModalFixtureId ? fixtureById.get(scoreModalFixtureId) ?? null : null;
  const scoreModalDraft = scoreModalFixtureId ? draftByFixture[scoreModalFixtureId] ?? { home: "", away: "" } : { home: "", away: "" };
  const modalHomeValue = Number.parseInt(scoreModalDraft.home, 10);
  const modalAwayValue = Number.parseInt(scoreModalDraft.away, 10);
  const scoreModalHome = Number.isFinite(modalHomeValue) ? modalHomeValue : 0;
  const scoreModalAway = Number.isFinite(modalAwayValue) ? modalAwayValue : 0;

  async function saveScoreFromModal(value: { home: number; away: number }) {
    if (!scoreModalFixtureId) {
      return;
    }
    updateDraft(scoreModalFixtureId, "home", String(value.home));
    updateDraft(scoreModalFixtureId, "away", String(value.away));

    const fixture = fixtureById.get(scoreModalFixtureId);
    if (fixture && isOpenUpcomingFixture(fixture)) {
      const prediction: Prediction = {
        fixtureId: scoreModalFixtureId,
        home: value.home,
        away: value.away
      };
      await savePredictionMutation.mutateAsync(prediction);
    }
  }

  return (
    <>
      <ScreenFrame
        title="Pronósticos"
        subtitle="Ingresa y guarda tus predicciones"
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

                <View style={styles.filterTabs} onLayout={(event) => setModeTabsWidth(event.nativeEvent.layout.width)}>
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.filterTabIndicator,
                      { width: modeTabWidth > 0 ? modeTabWidth : undefined },
                      modeIndicatorStyle
                    ]}
                  />
                  <ModeFilterTab label="Por Jugar" active={mode === "upcoming"} onPress={() => setMode("upcoming")} />
                  <ModeFilterTab label="Jugados" active={mode === "history"} onPress={() => setMode("history")} />
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
          </>
        )}
      </ScreenFrame>
      <ScorePickerModal
        visible={Boolean(scoreModalFixture)}
        homeLabel={toTeamCode(scoreModalFixture?.homeTeam ?? "LOC")}
        awayLabel={toTeamCode(scoreModalFixture?.awayTeam ?? "VIS")}
        homeLogoUrl={scoreModalFixture?.homeLogoUrl}
        awayLogoUrl={scoreModalFixture?.awayLogoUrl}
        initialHome={scoreModalHome}
        initialAway={scoreModalAway}
        onSave={saveScoreFromModal}
        onClose={closeScorePicker}
      />
    </>
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
    gap: 8,
    overflow: "hidden",
    position: "relative"
  },
  cardContent: {
    gap: 8
  },
  cardLive: {
    borderWidth: 0
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
  teamInfoCol: {
    flexShrink: 1
  },
  teamInfoColRight: {
    alignItems: "flex-end"
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
  resultSubLive: {
    color: colors.dangerAccent
  },
  scoreInput: {
    width: 34,
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
    position: "relative",
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceSoft,
    padding: 3,
    overflow: "hidden",
    gap: 2
  },
  filterTabIndicator: {
    position: "absolute",
    left: 3,
    top: 3,
    bottom: 3,
    borderRadius: 8,
    backgroundColor: colors.primaryStrong
  },
  filterTab: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center"
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
  livePredictionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6
  },
  livePredictionLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700"
  },
  livePredictionValue: {
    color: colors.textHigh,
    fontSize: 12,
    fontWeight: "900"
  },
  statusText: {
    color: colors.textMutedAlt,
    fontSize: 12
  }
});
