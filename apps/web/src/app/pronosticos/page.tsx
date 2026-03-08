"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Bell,
  ChevronLeft,
  ChevronRight,
  Lock,
  Minus,
  Moon,
  Plus,
  RefreshCw,
  Settings,
  Sun,
  Trophy,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { GlobalGroupSelector } from "@/components/layout/GlobalGroupSelector";
import { SkeletonBlock } from "@/components/ui/SkeletonBlock";
import { useAuthSession } from "@/lib/use-auth-session";
import { usePageBenchmark } from "@/lib/use-page-benchmark";
import { useTheme } from "@/lib/use-theme";
import { useToast } from "@/components/ui/ToastProvider";
import type {
  FechasPayload,
  MatchCardData,
  PredictionSaveStatus,
  PredictionValue,
  PredictionsByMatch,
  PronosticosPayload,
  SelectionOption
} from "@/lib/types";

interface FechaOption {
  id: string;
  label: string;
}

type PronosticosMode = "upcoming" | "history";

function isTransientStatus(status: number) {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

function normalizePrediction(value: PredictionValue): PredictionValue {
  return {
    home: value.home === null ? null : Math.max(0, Math.min(20, value.home)),
    away: value.away === null ? null : Math.max(0, Math.min(20, value.away))
  };
}

function arePredictionsEqual(a: PredictionValue | undefined, b: PredictionValue | undefined) {
  const left = a || { home: null, away: null };
  const right = b || { home: null, away: null };
  return left.home === right.home && left.away === right.away;
}

function isPredictionComplete(prediction: PredictionValue | undefined) {
  return prediction?.home !== null && prediction?.home !== undefined && prediction?.away !== null && prediction?.away !== undefined;
}

function formatPeriodDeadlineLabel(iso: string | null) {
  if (!iso) {
    return "Sin cierre";
  }

  const deadline = new Date(iso).getTime();
  if (Number.isNaN(deadline)) {
    return "Sin cierre";
  }

  const delta = deadline - Date.now();
  if (delta <= 0) {
    return "Cerrada";
  }

  const totalMinutes = Math.ceil(delta / 60000);
  if (totalMinutes < 60) {
    return `Cierra en ${Math.max(1, totalMinutes)} min`;
  }

  const hours = Math.ceil(totalMinutes / 60);
  if (hours < 24) {
    return `Cierra en ${hours} h`;
  }

  const days = Math.ceil(hours / 24);
  return `Cierra en ${days} días`;
}

function formatMatchDateBadge(iso?: string, fallback?: string) {
  if (!iso) {
    return fallback || "Sin horario";
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return fallback || "Sin horario";
  }

  const day = date.getDate();
  const month = date.getMonth() + 1;
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month} • ${hour}:${minute}`;
}

function initialsFromLabel(label: string) {
  const chunks = label
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk.charAt(0).toUpperCase());

  return chunks.length > 0 ? chunks.join("") : "FC";
}

function asTrimmedText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asDataImage(value: unknown) {
  const raw = asTrimmedText(value);
  if (!raw) {
    return null;
  }
  return raw.startsWith("data:image/") ? raw : null;
}

function resolveTeamLogoUrl(team: MatchCardData["homeTeam"]) {
  const candidate = team as MatchCardData["homeTeam"] & {
    logoDataUrl?: string | null;
    teamLogoDataUrl?: string | null;
    emblemDataUrl?: string | null;
  };

  return (
    asDataImage(candidate.logoDataUrl) ||
    asDataImage(candidate.teamLogoDataUrl) ||
    asDataImage(candidate.emblemDataUrl) ||
    asTrimmedText(candidate.logoUrl) ||
    undefined
  );
}

function TeamLogoBadge({
  code,
  logoUrl,
  size = "sm"
}: {
  code: string;
  logoUrl?: string;
  size?: "sm" | "lg";
}) {
  const wrapperClass = size === "lg" ? "h-12 w-12 rounded-2xl" : "h-8 w-8 rounded-lg";
  const fallbackTextClass = size === "lg" ? "text-sm" : "text-[10px]";
  const hasLogo = Boolean(logoUrl);

  return (
    <div
      className={`relative ${wrapperClass} flex flex-shrink-0 items-center justify-center overflow-hidden ${
        hasLogo ? "" : "border border-[var(--border-subtle)] bg-[var(--surface-card-muted)]"
      }`}
    >
      {hasLogo ? (
        <img src={logoUrl} alt={`${code} logo`} className="h-full w-full object-contain" />
      ) : (
        <span className={`font-bold text-[var(--text-secondary)] ${fallbackTextClass}`}>{code.substring(0, 1)}</span>
      )}
    </div>
  );
}

export default function PronosticosPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const [periods, setPeriods] = useState<FechaOption[]>([]);
  const [periodIndex, setPeriodIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshingPeriod, setRefreshingPeriod] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [periodLabel, setPeriodLabel] = useState("-");
  const [matches, setMatches] = useState<MatchCardData[]>([]);
  const [committedPredictions, setCommittedPredictions] = useState<PredictionsByMatch>({});
  const [draftPredictions, setDraftPredictions] = useState<PredictionsByMatch>({});
  const [saveStatusByMatch, setSaveStatusByMatch] = useState<Record<string, PredictionSaveStatus>>({});
  const [saveErrorByMatch, setSaveErrorByMatch] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<PronosticosMode>("upcoming");
  const fechasCacheRef = useRef<Map<string, FechasPayload>>(new Map());
  const payloadCacheRef = useRef<Map<string, PronosticosPayload>>(new Map());
  const autoSaveTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const autoSaveQueueRef = useRef<Map<string, PredictionValue>>(new Map());
  const autoSaveInFlightRef = useRef<Set<string>>(new Set());
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
        if (cancelled) return;

        fechasCacheRef.current.set(cacheKey, payload);
        setPeriods(payload.fechas);
        const defaultIndex = payload.fechas.findIndex((fecha) => fecha.id === payload.defaultFecha);
        setPeriodIndex(defaultIndex >= 0 ? defaultIndex : 0);
      } catch (fetchError) {
        if (!cancelled) {
          const message = fetchError instanceof Error ? fetchError.message : "No se pudieron cargar las fechas.";
          setError(message);
          setPeriods([]);
          setPeriodIndex(0);
          showToast({ title: "Error al cargar fechas", description: message, tone: "error" });
        }
      }
    }

    void loadFechas();

    return () => {
      cancelled = true;
    };
  }, [activeSelection, showToast]);

  useEffect(() => {
    if (!activeSelection || !period) {
      setRefreshingPeriod(false);
      setMatches([]);
      setCommittedPredictions({});
      setDraftPredictions({});
      setSaveStatusByMatch({});
      setSaveErrorByMatch({});
      autoSaveTimersRef.current.forEach((timer) => clearTimeout(timer));
      autoSaveTimersRef.current.clear();
      autoSaveQueueRef.current.clear();
      autoSaveInFlightRef.current.clear();
      setPeriodLabel(period || "Sin fechas disponibles");
      return;
    }

    const groupId = activeSelection.groupId;
    const cacheKey = `${groupId}:${period}`;
    const cached = payloadCacheRef.current.get(cacheKey);
    if (cached) {
      setError(null);
      setLoading(false);
      setRefreshingPeriod(false);
      setPeriodLabel(cached.periodLabel || period);
      setMatches(cached.matches);
      setCommittedPredictions(cached.predictions);
      setDraftPredictions(cached.predictions);
      setSaveStatusByMatch({});
      setSaveErrorByMatch({});
      autoSaveTimersRef.current.forEach((timer) => clearTimeout(timer));
      autoSaveTimersRef.current.clear();
      autoSaveQueueRef.current.clear();
      autoSaveInFlightRef.current.clear();
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/pronosticos?period=${encodeURIComponent(period)}&groupId=${encodeURIComponent(groupId)}`, {
          method: "GET",
          cache: "no-store"
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as PronosticosPayload;

        if (!cancelled) {
          payloadCacheRef.current.set(cacheKey, payload);
          setPeriodLabel(payload.periodLabel || period);
          setMatches(payload.matches);
          setCommittedPredictions(payload.predictions);
          setDraftPredictions(payload.predictions);
          setSaveStatusByMatch({});
          setSaveErrorByMatch({});
          autoSaveTimersRef.current.forEach((timer) => clearTimeout(timer));
          autoSaveTimersRef.current.clear();
          autoSaveQueueRef.current.clear();
          autoSaveInFlightRef.current.clear();
        }
      } catch (fetchError) {
        if (!cancelled) {
          const message = fetchError instanceof Error ? fetchError.message : "No se pudieron cargar los pronósticos.";
          setError(message);
          showToast({ title: "Error al cargar pronósticos", description: message, tone: "error" });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshingPeriod(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [period, activeSelection, reloadNonce, showToast]);

  useEffect(
    () => () => {
      autoSaveTimersRef.current.forEach((timer) => clearTimeout(timer));
      autoSaveTimersRef.current.clear();
      autoSaveQueueRef.current.clear();
      autoSaveInFlightRef.current.clear();
    },
    []
  );

  async function persistPrediction(matchId: string, value: PredictionValue) {
    if (!activeSelection || !period) {
      return false;
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
      setCommittedPredictions((prev) => ({
        ...prev,
        [matchId]: value
      }));

      const cacheKey = `${groupId}:${period}`;
      const cachedPayload = payloadCacheRef.current.get(cacheKey);
      if (cachedPayload) {
        payloadCacheRef.current.set(cacheKey, {
          ...cachedPayload,
          predictions: {
            ...cachedPayload.predictions,
            [matchId]: value
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

  const flushQueuedPrediction = async (matchId: string) => {
    if (autoSaveInFlightRef.current.has(matchId)) {
      return;
    }

    const queued = autoSaveQueueRef.current.get(matchId);
    if (!queued || !isPredictionComplete(queued)) {
      return;
    }

    autoSaveInFlightRef.current.add(matchId);
    await persistPrediction(matchId, queued);
    autoSaveInFlightRef.current.delete(matchId);

    const latest = autoSaveQueueRef.current.get(matchId);
    if (latest && !arePredictionsEqual(latest, queued)) {
      void flushQueuedPrediction(matchId);
    }
  };

  const queuePredictionAutosave = (matchId: string, value: PredictionValue) => {
    autoSaveQueueRef.current.set(matchId, value);
    const pendingTimer = autoSaveTimersRef.current.get(matchId);
    if (pendingTimer) {
      clearTimeout(pendingTimer);
    }

    const timer = setTimeout(() => {
      autoSaveTimersRef.current.delete(matchId);
      void flushQueuedPrediction(matchId);
    }, 800);
    autoSaveTimersRef.current.set(matchId, timer);
  };

  const refreshCurrentPeriod = () => {
    if (!activeSelection || !period) return;
    const cacheKey = `${activeSelection.groupId}:${period}`;
    payloadCacheRef.current.delete(cacheKey);
    setRefreshingPeriod(true);
    setReloadNonce((current) => current + 1);
  };

  const adjustDraftPrediction = (matchId: string, side: "home" | "away", delta: number) => {
    setSaveErrorByMatch((prev) => {
      if (!prev[matchId]) {
        return prev;
      }
      const next = { ...prev };
      delete next[matchId];
      return next;
    });

    setDraftPredictions((prev) => {
      const current = normalizePrediction(prev[matchId] ?? { home: null, away: null });
      const currentNumber = current[side] ?? 0;
      const updated = Math.max(0, Math.min(20, currentNumber + delta));
      const nextPrediction: PredictionValue = {
        ...current,
        [side]: updated
      };

      if (isPredictionComplete(nextPrediction)) {
        queuePredictionAutosave(matchId, nextPrediction);
      }

      return {
        ...prev,
        [matchId]: nextPrediction
      };
    });
  };

  const upcomingMatches = useMemo(() => matches.filter((match) => match.status === "upcoming"), [matches]);
  const completedMatches = useMemo(() => matches.filter((match) => match.status !== "upcoming"), [matches]);

  const nearestDeadline = useMemo(() => {
    const sorted = upcomingMatches
      .map((match) => match.deadlineAt)
      .filter((value): value is string => Boolean(value))
      .sort((left, right) => new Date(left).getTime() - new Date(right).getTime());

    return sorted[0] || null;
  }, [upcomingMatches]);

  const completionSummary = useMemo(() => {
    const total = matches.length;
    const completed = matches.filter((match) => isPredictionComplete(draftPredictions[match.id])).length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pct };
  }, [matches, draftPredictions]);

  const userBadgeLabel = useMemo(() => initialsFromLabel(user?.name || "FC"), [user?.name]);
  const periodDeadlineLabel = useMemo(() => formatPeriodDeadlineLabel(nearestDeadline), [nearestDeadline]);

  return (
    <AppShell activeTab="pronosticos" showTopGlow={false}>
      <div className="min-h-dvh bg-[var(--surface-card-muted)]">
        <header className="sticky top-0 z-20 rounded-b-3xl bg-[var(--surface-card)] px-5 pb-6 pt-12 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-[var(--bg-surface-2)] p-1.5 text-[var(--accent-primary)] shadow-sm">
                <Trophy size={18} strokeWidth={2.5} />
              </div>
              <h1 className="text-xl font-black uppercase tracking-tighter text-[var(--text-primary)]">
                <span className="italic">Fulbito</span>
                <span className="text-[var(--accent-primary)]">Prode</span>
              </h1>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Cambiar tema"
                className="rounded-full bg-[var(--surface-card-muted)] p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-card-muted)]"
              >
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <Link href="/notificaciones" aria-label="Notificaciones" className="relative rounded-full bg-[var(--surface-card-muted)] p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-card-muted)]">
                <Bell size={18} />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full border border-[var(--surface-card)] bg-[var(--danger)]" />
              </Link>
              <Link href="/configuracion/ajustes" aria-label="Configuración" className="rounded-full bg-[var(--surface-card-muted)] p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-card-muted)]">
                <Settings size={18} />
              </Link>
              <Link
                href="/perfil"
                aria-label="Perfil"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-bold text-[var(--accent-primary)]"
              >
                {userBadgeLabel}
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-[var(--accent-primary)] p-1.5 text-[var(--text-on-accent)]">
              <Activity size={18} />
            </div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Pronósticos</h2>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm font-medium text-[var(--text-muted)]">Resultados y carga</span>
              <GlobalGroupSelector memberships={memberships} activeGroupId={activeGroupId} onSelectGroup={setActiveGroupId} />
            </div>
          </div>
        </header>

        <main className="mt-6 space-y-4 px-4 pb-6 no-scrollbar">
          {memberships.length > 0 ? (
            <>
              <section className="flex items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-2 shadow-sm">
                <button
                  type="button"
                  onClick={() => setPeriodIndex((value) => (value - 1 + Math.max(1, periods.length)) % Math.max(1, periods.length))}
                  aria-label="Fecha anterior"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-card-muted)] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-50"
                  disabled={periods.length === 0 || loading || refreshingPeriod}
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="text-center">
                  <h3 className="text-base font-black text-[var(--accent-primary)]">{periodLabel}</h3>
                  <p className="mt-1 text-[10px] font-medium text-[var(--text-muted)]">{refreshingPeriod ? "Actualizando..." : periodDeadlineLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPeriodIndex((value) => (value + 1) % Math.max(1, periods.length))}
                  aria-label="Fecha siguiente"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-card-muted)] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-50"
                  disabled={periods.length === 0 || loading || refreshingPeriod}
                >
                  <ChevronRight size={18} />
                </button>
              </section>

              <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3 py-2 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="whitespace-nowrap text-[10px] font-bold text-[var(--text-muted)]">
                    {completionSummary.completed}/{completionSummary.total}
                  </span>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-card-muted)]">
                    <div className="h-full rounded-full bg-[var(--accent-primary)] transition-all duration-500" style={{ width: `${completionSummary.pct}%` }} />
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-1 shadow-sm">
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab("upcoming")}
                    className={`min-h-11 rounded-lg px-3 text-xs font-bold transition-all ${activeTab === "upcoming" ? "bg-[var(--accent-primary)] text-[var(--text-on-accent)] shadow-sm" : "text-[var(--text-muted)] hover:bg-[var(--surface-card-muted)]"}`}
                  >
                    Por Jugar
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("history")}
                    className={`min-h-11 rounded-lg px-3 text-xs font-bold transition-all ${activeTab === "history" ? "bg-[var(--accent-primary)] text-[var(--text-on-accent)] shadow-sm" : "text-[var(--text-muted)] hover:bg-[var(--surface-card-muted)]"}`}
                  >
                    Jugados
                  </button>
                </div>
              </section>

              <section className={`space-y-2 transition-opacity ${loading ? "opacity-70" : "opacity-100"}`}>
                {loading
                  ? Array.from({ length: 3 }).map((_, index) => (
                      <SkeletonBlock key={`pronosticos-skeleton-${index}`} className="h-[96px] w-full rounded-xl" />
                    ))
                  : null}

                {!loading && activeTab === "upcoming"
                  ? upcomingMatches.map((match) => {
                      const draft = draftPredictions[match.id] ?? { home: null, away: null };
                      const committed = committedPredictions[match.id] ?? { home: null, away: null };
                      const changed = !arePredictionsEqual(draft, committed);
                      const saveError = saveErrorByMatch[match.id];
                      const saveState = saveStatusByMatch[match.id];
                      const locked = Boolean(match.isLocked);
                      const homeLogo = resolveTeamLogoUrl(match.homeTeam);
                      const awayLogo = resolveTeamLogoUrl(match.awayTeam);

                      return (
                        <div key={match.id} className="space-y-1.5">
                          <div className="group relative overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3 py-3 shadow-sm no-scrollbar">
                            <div className="flex items-center justify-between">
                              <div className="flex min-w-0 flex-1 items-center gap-2">
                                <TeamLogoBadge code={match.homeTeam.code} logoUrl={homeLogo} />
                                <span className="truncate text-lg font-black text-[var(--text-primary)]">{match.homeTeam.code}</span>
                              </div>

                              <div
                                className={`mx-1 flex min-w-[132px] items-center justify-center gap-2 rounded-lg border px-2 py-1 transition-all ${
                                  changed || (draft.home !== null && draft.away !== null)
                                    ? "border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--text-primary)]"
                                    : "border-transparent bg-[var(--surface-card-muted)] text-[var(--text-muted)]"
                                } ${locked ? "opacity-50" : ""}`}
                                aria-label={`Editor rápido ${match.homeTeam.code} vs ${match.awayTeam.code}`}
                              >
                                <div className="flex flex-col gap-1">
                                  <button
                                    type="button"
                                    disabled={locked}
                                    onClick={() => adjustDraftPrediction(match.id, "home", 1)}
                                    className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--surface-card)] text-[var(--text-secondary)] disabled:opacity-50"
                                    aria-label={`Subir local ${match.homeTeam.code}`}
                                  >
                                    <Plus size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={locked}
                                    onClick={() => adjustDraftPrediction(match.id, "home", -1)}
                                    className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--surface-card)] text-[var(--text-secondary)] disabled:opacity-50"
                                    aria-label={`Bajar local ${match.homeTeam.code}`}
                                  >
                                    <Minus size={12} />
                                  </button>
                                </div>

                                <div className="flex items-center gap-1">
                                  <span className="w-6 text-center text-lg font-black tracking-tighter">{draft.home !== null ? draft.home : "-"}</span>
                                  <span className="text-lg font-black text-[var(--text-muted)] opacity-30">:</span>
                                  <span className="w-6 text-center text-lg font-black tracking-tighter">{draft.away !== null ? draft.away : "-"}</span>
                                </div>

                                <div className="flex flex-col gap-1">
                                  <button
                                    type="button"
                                    disabled={locked}
                                    onClick={() => adjustDraftPrediction(match.id, "away", 1)}
                                    className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--surface-card)] text-[var(--text-secondary)] disabled:opacity-50"
                                    aria-label={`Subir visitante ${match.awayTeam.code}`}
                                  >
                                    <Plus size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={locked}
                                    onClick={() => adjustDraftPrediction(match.id, "away", -1)}
                                    className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--surface-card)] text-[var(--text-secondary)] disabled:opacity-50"
                                    aria-label={`Bajar visitante ${match.awayTeam.code}`}
                                  >
                                    <Minus size={12} />
                                  </button>
                                </div>
                              </div>

                              <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                                <span className="truncate text-right text-lg font-black text-[var(--text-primary)]">{match.awayTeam.code}</span>
                                <TeamLogoBadge code={match.awayTeam.code} logoUrl={awayLogo} />
                              </div>
                            </div>

                            <div className="mt-2 flex justify-center">
                              <span className="rounded-full bg-[var(--surface-card-muted)] px-2 py-0.5 text-[9px] font-bold text-[var(--text-muted)]">
                                {formatMatchDateBadge(match.kickoffAt, match.meta.label)}
                              </span>
                            </div>
                          </div>

                          {locked ? (
                            <p className="inline-flex items-center gap-1 rounded-lg border border-[rgba(255,180,84,0.33)] bg-[rgba(255,180,84,0.1)] px-2.5 py-1.5 text-[11px] text-[var(--warning)]">
                              <Lock size={11} />
                              Partido bloqueado: no se pueden editar pronósticos.
                            </p>
                          ) : null}
                          {saveError ? (
                            <p className="rounded-lg border border-[rgba(255,107,125,0.35)] bg-[rgba(255,107,125,0.12)] px-2.5 py-1.5 text-[11px] text-[var(--danger)]">
                              {saveError}
                            </p>
                          ) : saveState === "saving" ? (
                            <p className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card-muted)] px-2.5 py-1.5 text-[11px] text-[var(--text-secondary)]">Guardando pronóstico...</p>
                          ) : null}
                        </div>
                      );
                    })
                  : null}

                {!loading && activeTab === "history" && completedMatches.length > 0
                  ? completedMatches.map((match) => {
                      const homeScore = match.score?.home ?? "-";
                      const awayScore = match.score?.away ?? "-";
                      const homeLogo = resolveTeamLogoUrl(match.homeTeam);
                      const awayLogo = resolveTeamLogoUrl(match.awayTeam);
                      return (
                        <div key={match.id} className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3 py-3 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              <TeamLogoBadge code={match.homeTeam.code} logoUrl={homeLogo} />
                              <span className="truncate text-lg font-black text-[var(--text-primary)]">{match.homeTeam.code}</span>
                            </div>

                            <div className="mx-1 min-w-[96px] rounded-lg bg-[var(--surface-card-muted)] px-3 py-1.5 text-center">
                              <p className="text-lg font-black tracking-tighter text-[var(--text-primary)]">
                                {homeScore} - {awayScore}
                              </p>
                              <p className="text-[9px] font-bold uppercase text-[var(--text-muted)]">{match.status === "live" ? match.meta.label : "Finalizado"}</p>
                            </div>

                            <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                              <span className="truncate text-right text-lg font-black text-[var(--text-primary)]">{match.awayTeam.code}</span>
                              <TeamLogoBadge code={match.awayTeam.code} logoUrl={awayLogo} />
                            </div>
                          </div>

                          <div className="mt-2 flex justify-center">
                            <span className="rounded-full bg-[var(--surface-card-muted)] px-2 py-0.5 text-[9px] font-bold text-[var(--text-muted)]">
                              {formatMatchDateBadge(match.kickoffAt, match.meta.label)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  : null}

                {!loading && activeTab === "upcoming" && upcomingMatches.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[var(--text-muted)]">No hay partidos por jugar en esta fecha</div>
                ) : null}

                {!loading && activeTab === "history" && completedMatches.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[var(--text-muted)]">No hay jugados por el momento</div>
                ) : null}
              </section>

              {memberships.length > 0 && !loading && matches.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--surface-card)] px-3 py-2.5 text-[12px] text-[var(--text-secondary)]">
                  No hay partidos disponibles para esta fecha.
                </p>
              ) : null}

              {error ? (
                <div className="rounded-xl border border-[rgba(255,107,125,0.35)] bg-[rgba(255,107,125,0.12)] px-3 py-2.5">
                  <p className="text-[12px] text-[var(--danger)]">{error}</p>
                  <button
                    type="button"
                    onClick={refreshCurrentPeriod}
                    className="mt-2 inline-flex min-h-10 items-center gap-1 rounded-lg border border-[rgba(255,107,125,0.35)] px-2.5 text-[11px] font-semibold text-[var(--danger)]"
                  >
                    <RefreshCw size={12} />
                    Reintentar carga
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
        </main>
      </div>

    </AppShell>
  );
}
