"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { TopHeader } from "@/components/layout/TopHeader";
import { CurrentSelectionSelector } from "@/components/home/CurrentSelectionSelector";
import { MatchCard } from "@/components/matches/MatchCard";
import { SkeletonBlock } from "@/components/ui/SkeletonBlock";
import { useAuthSession } from "@/lib/use-auth-session";
import { usePageBenchmark } from "@/lib/use-page-benchmark";
import type { FechasPayload, MatchCardData, PredictionSaveStatus, PredictionValue, PredictionsByMatch, PronosticosPayload, SelectionOption } from "@/lib/types";

interface FechaOption {
  id: string;
  label: string;
}

function isTransientStatus(status: number) {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

export default function PronosticosPage() {
  const router = useRouter();
  const [periods, setPeriods] = useState<FechaOption[]>([]);
  const [periodIndex, setPeriodIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodLabel, setPeriodLabel] = useState("-");
  const [matches, setMatches] = useState<MatchCardData[]>([]);
  const [stepperByMatch, setStepperByMatch] = useState<PredictionsByMatch>({});
  const [saveStatusByMatch, setSaveStatusByMatch] = useState<Record<string, PredictionSaveStatus>>({});
  const [saveErrorByMatch, setSaveErrorByMatch] = useState<Record<string, string>>({});
  const [editorMatchId, setEditorMatchId] = useState<string | null>(null);
  const [editorDraft, setEditorDraft] = useState<PredictionValue>({ home: null, away: null });
  const fechasCacheRef = useRef<Map<string, FechasPayload>>(new Map());
  const payloadCacheRef = useRef<Map<string, PronosticosPayload>>(new Map());
  const { loading: authLoading, authenticated, user, memberships, activeGroupId, setActiveGroupId } = useAuthSession();
  usePageBenchmark("pronosticos", loading);

  const selectionOptions = useMemo<SelectionOption[]>(
    () =>
      memberships.map((membership) => ({
        groupId: membership.groupId,
        groupName: membership.groupName,
        role: membership.role,
        leagueId: membership.leagueId,
        leagueName: membership.leagueName,
        season: membership.season,
        competitionKey: membership.competitionKey,
        competitionName: membership.competitionName,
        competitionStage: membership.competitionStage
      })),
    [memberships]
  );

  const activeSelection = useMemo(
    () => selectionOptions.find((option) => option.groupId === activeGroupId) || null,
    [selectionOptions, activeGroupId]
  );

  const period = periods[periodIndex]?.id || "";

  useEffect(() => {
    if (!authLoading && !authenticated) {
      router.replace("/auth");
    }
  }, [authLoading, authenticated, router]);

  useEffect(() => {
    if (!activeSelection) {
      setPeriods([]);
      setPeriodIndex(0);
      return;
    }
    const leagueId = activeSelection.leagueId;
    const season = activeSelection.season;
    const competitionStage = activeSelection.competitionStage || "general";
    const cacheKey = `${leagueId}:${season}:${competitionStage}`;
    const cached = fechasCacheRef.current.get(cacheKey);
    if (cached) {
      setPeriods(cached.fechas);
      const defaultIndex = cached.fechas.findIndex((fecha) => fecha.id === cached.defaultFecha);
      setPeriodIndex(defaultIndex >= 0 ? defaultIndex : 0);
      return;
    }

    let cancelled = false;

    async function loadFechas() {
      try {
        const response = await fetch(
          `/api/fechas?leagueId=${encodeURIComponent(String(leagueId))}&season=${encodeURIComponent(season)}&competitionStage=${encodeURIComponent(competitionStage)}`,
          {
            method: "GET",
            cache: "no-store"
          }
        );

        if (!response.ok) {
          throw new Error(`No se pudieron cargar las fechas (${response.status})`);
        }

        const payload = (await response.json()) as FechasPayload;
        if (cancelled) {
          return;
        }

        fechasCacheRef.current.set(cacheKey, payload);
        setPeriods(payload.fechas);
        const defaultIndex = payload.fechas.findIndex((fecha) => fecha.id === payload.defaultFecha);
        setPeriodIndex(defaultIndex >= 0 ? defaultIndex : 0);
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : "No se pudieron cargar las fechas.");
          setPeriods([]);
          setPeriodIndex(0);
        }
      }
    }

    void loadFechas();

    return () => {
      cancelled = true;
    };
  }, [activeSelection]);

  useEffect(() => {
    if (!activeSelection || !period) {
      setMatches([]);
      setStepperByMatch({});
      setEditorMatchId(null);
      setPeriodLabel(period || "Sin fechas disponibles");
      return;
    }
    const groupId = activeSelection.groupId;
    const cacheKey = `${groupId}:${period}`;
    const cached = payloadCacheRef.current.get(cacheKey);
    if (cached) {
      setError(null);
      setLoading(false);
      setPeriodLabel(cached.periodLabel || period);
      setMatches(cached.matches);
      setStepperByMatch(cached.predictions);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/pronosticos?period=${encodeURIComponent(period)}&groupId=${encodeURIComponent(groupId)}`,
          {
            method: "GET",
            cache: "no-store"
          }
        );

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as PronosticosPayload;

        if (!cancelled) {
          payloadCacheRef.current.set(cacheKey, payload);
          setPeriodLabel(payload.periodLabel || period);
          setMatches(payload.matches);
          setStepperByMatch(payload.predictions);
          setEditorMatchId(null);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : "No se pudieron cargar los pronósticos.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [period, activeSelection]);

  async function persistPrediction(matchId: string, value: PredictionValue) {
    if (!activeSelection || !period) {
      return;
    }
    const groupId = activeSelection.groupId;

    setSaveStatusByMatch((prev) => ({ ...prev, [matchId]: "saving" }));
    setSaveErrorByMatch((prev) => {
      const next = { ...prev };
      delete next[matchId];
      return next;
    });

    const attempt = async () =>
      fetch("/api/pronosticos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          period,
          matchId,
          groupId,
          home: value.home,
          away: value.away
        })
      });

    try {
      let response = await attempt();
      if (!response.ok && isTransientStatus(response.status)) {
        await new Promise((resolve) => setTimeout(resolve, 350));
        response = await attempt();
      }

      if (!response.ok) {
        throw new Error(`No se pudo guardar (${response.status})`);
      }

      setSaveStatusByMatch((prev) => ({ ...prev, [matchId]: "idle" }));
      setStepperByMatch((prev) => ({
        ...prev,
        [matchId]: {
          home: value.home,
          away: value.away
        }
      }));
      const cacheKey = `${groupId}:${period}`;
      const cachedPayload = payloadCacheRef.current.get(cacheKey);
      if (cachedPayload) {
        const nextPrediction = {
          home: value.home,
          away: value.away
        };
        payloadCacheRef.current.set(cacheKey, {
          ...cachedPayload,
          matches: cachedPayload.matches.map((match) =>
            match.id === matchId
              ? {
                  ...match,
                  prediction:
                    nextPrediction.home !== null || nextPrediction.away !== null
                      ? {
                          home: nextPrediction.home ?? 0,
                          away: nextPrediction.away ?? 0
                        }
                      : undefined
                }
              : match
          ),
          predictions: {
            ...cachedPayload.predictions,
            [matchId]: nextPrediction
          }
        });
      }
      return true;
    } catch (persistError) {
      setSaveStatusByMatch((prev) => ({ ...prev, [matchId]: "error" }));
      setSaveErrorByMatch((prev) => ({
        ...prev,
        [matchId]: persistError instanceof Error ? persistError.message : "No se pudo guardar el pronóstico"
      }));
      return false;
    }
  }

  const selectedMatch = useMemo(() => matches.find((match) => match.id === editorMatchId) || null, [matches, editorMatchId]);
  const selectedSaveStatus = editorMatchId ? saveStatusByMatch[editorMatchId] || "idle" : "idle";
  const selectedSaveError = editorMatchId ? saveErrorByMatch[editorMatchId] : null;

  const openPredictionEditor = (matchId: string) => {
    const current = stepperByMatch[matchId] ?? { home: null, away: null };
    setEditorDraft({
      home: current.home === null ? null : Math.max(0, Math.min(20, current.home)),
      away: current.away === null ? null : Math.max(0, Math.min(20, current.away))
    });
    setEditorMatchId(matchId);
  };

  const closePredictionEditor = () => {
    if (selectedSaveStatus === "saving") {
      return;
    }
    setEditorMatchId(null);
  };

  const updateEditorDraft = (side: "home" | "away", delta: number) => {
    setEditorDraft((prev) => {
      const currentNumber = prev[side] ?? 0;
      const updated = Math.max(0, Math.min(20, currentNumber + delta));
      return {
        ...prev,
        [side]: updated
      };
    });
  };

  const saveEditorPrediction = async () => {
    if (!editorMatchId) {
      return;
    }
    if (editorDraft.home === null || editorDraft.away === null) {
      return;
    }
    const saved = await persistPrediction(editorMatchId, editorDraft);
    if (saved) {
      setEditorMatchId(null);
    }
  };

  const orderedMatches = useMemo(() => matches, [matches]);

  return (
    <AppShell activeTab="pronosticos">
      <TopHeader title="Pronósticos" userLabel={user?.name || "USER"} />
      <CurrentSelectionSelector options={selectionOptions} activeGroupId={activeGroupId} onChange={setActiveGroupId} />

      <section className="flex flex-col gap-2 px-5 pt-[10px]">
        {memberships.length === 0 ? (
          <div className="rounded-[6px] border border-[var(--border-dim)] bg-[#0b0b0d] p-4">
            <p className="text-[13px] font-semibold text-white">No tenés grupos activos.</p>
            <p className="mt-1 text-[11px] text-[var(--text-secondary)]">Creá o uníte a un grupo para cargar pronósticos.</p>
            <Link href="/configuracion" className="mt-3 inline-flex rounded-[6px] bg-[var(--accent)] px-3 py-1.5 text-[11px] font-bold text-black">
              Ir a grupos
            </Link>
          </div>
        ) : null}

        {memberships.length > 0 ? (
          <div className="px-0 py-2">
            <div className="flex items-center justify-between rounded-full border border-[var(--border-light)] bg-[var(--bg-surface)] px-2.5 py-1">
              <button
                type="button"
                onClick={() => setPeriodIndex((value) => (value - 1 + Math.max(1, periods.length)) % Math.max(1, periods.length))}
                aria-label="Fecha anterior"
                className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border-dim)] bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)]"
                disabled={periods.length === 0}
              >
                <ChevronLeft size={11} />
              </button>
              <span className="truncate px-2 text-[11px] font-bold tracking-[0.2px] text-[var(--accent)]">{periodLabel}</span>
              <button
                type="button"
                onClick={() => setPeriodIndex((value) => (value + 1) % Math.max(1, periods.length))}
                aria-label="Fecha siguiente"
                className="flex h-6 w-6 items-center justify-center rounded-full border border-[#334400] bg-[var(--bg-surface-elevated)] text-[var(--accent)]"
                disabled={periods.length === 0}
              >
                <ChevronRight size={11} />
              </button>
            </div>
          </div>
        ) : null}

        <div className={`space-y-2 transition-opacity ${loading ? "opacity-70" : "opacity-100"}`}>
          {loading
            ? Array.from({ length: 4 }).map((_, index) => (
                <SkeletonBlock key={`pronosticos-skeleton-${index}`} className="h-[136px] w-full" />
              ))
            : orderedMatches.map((match) => {
                if (match.status === "upcoming") {
                  const stepper = stepperByMatch[match.id] ?? { home: null, away: null };
                  const saveStatus = saveStatusByMatch[match.id] || "idle";
                  const saveError = saveErrorByMatch[match.id];
                  const isPredictionEmpty = stepper.home === null && stepper.away === null;

                  return (
                    <div key={match.id} className="space-y-1">
                      <MatchCard
                        {...match}
                        predictionBox={{
                          homeValue: stepper.home,
                          awayValue: stepper.away,
                          onClick: () => openPredictionEditor(match.id),
                          highlighted: isPredictionEmpty
                        }}
                      />
                      {saveStatus === "error" ? <p className="px-1 text-[10px] text-red-400">{saveError || "No se pudo guardar."}</p> : null}
                    </div>
                  );
                }

                return <MatchCard key={match.id} {...match} />;
              })}
        </div>

        {memberships.length > 0 && !loading && orderedMatches.length === 0 ? (
          <p className="text-[11px] font-medium text-[var(--text-secondary)]">No hay partidos disponibles para esta fecha.</p>
        ) : null}

        {error ? <p className="text-[11px] font-medium text-red-400">{error}</p> : null}
      </section>

      {selectedMatch ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 px-4">
          <div className="w-full max-w-[460px] rounded-[10px] border border-[var(--border-light)] bg-[#0a0a0d] p-3 shadow-[0_0_0_1px_rgba(153,204,0,0.15)]">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-bold text-[var(--accent)]">Cargar pronóstico</h2>
              <button
                type="button"
                onClick={closePredictionEditor}
                className="rounded-[6px] border border-[var(--border-dim)] p-1 text-[var(--text-secondary)]"
                aria-label="Cerrar"
                disabled={selectedSaveStatus === "saving"}
              >
                <X size={14} />
              </button>
            </div>

            <div className="rounded-[8px] border border-[var(--accent)] p-1">
              <MatchCard
                {...selectedMatch}
                showPredictionStepper
                stepper={{
                  homeValue: editorDraft.home,
                  awayValue: editorDraft.away,
                  onHomeIncrement: () => updateEditorDraft("home", 1),
                  onHomeDecrement: () => updateEditorDraft("home", -1),
                  onAwayIncrement: () => updateEditorDraft("away", 1),
                  onAwayDecrement: () => updateEditorDraft("away", -1),
                  min: 0,
                  max: 20
                }}
              />
            </div>

            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closePredictionEditor}
                className="rounded-[6px] border border-[var(--border-dim)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)]"
                disabled={selectedSaveStatus === "saving"}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void saveEditorPrediction()}
                className="rounded-[6px] bg-[var(--accent)] px-3 py-1.5 text-[11px] font-bold text-black disabled:opacity-50"
                disabled={selectedSaveStatus === "saving" || editorDraft.home === null || editorDraft.away === null}
              >
                {selectedSaveStatus === "saving" ? "Guardando..." : "Guardar"}
              </button>
            </div>

            {selectedSaveError ? <p className="mt-2 text-[10px] text-red-400">{selectedSaveError}</p> : null}
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
