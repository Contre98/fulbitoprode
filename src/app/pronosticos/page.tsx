"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Bell,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  Lock,
  Moon,
  RefreshCw,
  Save,
  Settings,
  Trophy,
  X
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
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

interface SelectorGroupOption {
  id: string;
  name: string;
  competition: string;
}

const TEAM_NAME_BY_CODE: Record<string, string> = {
  DEF: "Defensa y Justicia",
  BEL: "Belgrano"
};

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

function formatModalCloseTime(iso?: string) {
  if (!iso) {
    return "--:--";
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${hour}:${minute}`;
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

function resolveTeamDisplayName(team: MatchCardData["homeTeam"]) {
  const candidate = team as MatchCardData["homeTeam"] & {
    name?: string | null;
    fullName?: string | null;
    shortName?: string | null;
    displayName?: string | null;
  };

  return (
    asTrimmedText(candidate.fullName) ||
    asTrimmedText(candidate.name) ||
    asTrimmedText(candidate.displayName) ||
    asTrimmedText(candidate.shortName) ||
    TEAM_NAME_BY_CODE[team.code.toUpperCase()] ||
    team.code
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
        hasLogo ? "" : "border border-slate-100 bg-slate-50"
      }`}
    >
      {hasLogo ? (
        <img src={logoUrl} alt={`${code} logo`} className="h-full w-full object-contain" />
      ) : (
        <span className={`font-bold text-slate-500 ${fallbackTextClass}`}>{code.substring(0, 1)}</span>
      )}
    </div>
  );
}

function GroupSelectorModal({
  open,
  groups,
  activeGroupId,
  onSelect,
  onClose
}: {
  open: boolean;
  groups: SelectorGroupOption[];
  activeGroupId: string | null;
  onSelect: (groupId: string) => void;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center overflow-hidden no-scrollbar">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative max-h-[70%] w-full max-w-[469px] overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl no-scrollbar">
        <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-slate-200" />
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">Cambiar Grupo</h3>
          <button type="button" onClick={onClose} className="rounded-full bg-slate-50 p-2 text-slate-400" aria-label="Cerrar selector">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-2 no-scrollbar">
          {groups.map((group) => {
            const isActive = group.id === activeGroupId;
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => onSelect(group.id)}
                className={`flex w-full items-center justify-between rounded-xl p-3 text-left transition-all ${
                  isActive ? "border-2 border-lime-400 bg-lime-50" : "border border-slate-100 bg-slate-50 hover:bg-slate-100"
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold ${isActive ? "bg-lime-200 text-lime-800" : "bg-white text-slate-500 shadow-sm"}`}>
                    {group.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className={`truncate text-sm font-bold ${isActive ? "text-slate-900" : "text-slate-700"}`}>{group.name}</p>
                    <p className="truncate text-xs text-slate-500">{group.competition}</p>
                  </div>
                </div>
                {isActive ? (
                  <div className="flex flex-shrink-0 rounded-full bg-lime-400 p-1 text-white">
                    <Check size={14} strokeWidth={3} />
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function PronosticosPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { toggleTheme } = useTheme();
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
  const [savingAll, setSavingAll] = useState(false);
  const [editorMatchId, setEditorMatchId] = useState<string | null>(null);
  const [editorDraft, setEditorDraft] = useState<PredictionValue>({ home: null, away: null });
  const [activeTab, setActiveTab] = useState<PronosticosMode>("upcoming");
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
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

  const selectorGroups = useMemo<SelectorGroupOption[]>(
    () =>
      selectionOptions.map((option) => ({
        id: option.groupId,
        name: option.groupName,
        competition: option.leagueName
      })),
    [selectionOptions]
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
      setSavingAll(false);
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
      setRefreshingPeriod(false);
      setPeriodLabel(cached.periodLabel || period);
      setMatches(cached.matches);
      setCommittedPredictions(cached.predictions);
      setDraftPredictions(cached.predictions);
      setSaveStatusByMatch({});
      setSaveErrorByMatch({});
      setSavingAll(false);
      setEditorMatchId(null);
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
          setSavingAll(false);
          setEditorMatchId(null);
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

  const openPredictionEditor = (matchId: string) => {
    const current = draftPredictions[matchId] ?? { home: null, away: null };
    setEditorDraft(normalizePrediction(current));
    setEditorMatchId(matchId);
  };

  const closePredictionEditor = () => {
    if (savingAll) return;
    setEditorMatchId(null);
  };

  const refreshCurrentPeriod = () => {
    if (!activeSelection || !period) return;
    const cacheKey = `${activeSelection.groupId}:${period}`;
    payloadCacheRef.current.delete(cacheKey);
    setRefreshingPeriod(true);
    setReloadNonce((current) => current + 1);
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

  const applyEditorPrediction = () => {
    if (!editorMatchId) return;

    const normalized = normalizePrediction(editorDraft);
    setDraftPredictions((prev) => ({
      ...prev,
      [editorMatchId]: normalized
    }));
    setEditorMatchId(null);
  };

  const hasPendingChanges = useMemo(() => {
    const upcomingMatches = matches.filter((match) => match.status === "upcoming");
    return upcomingMatches.some((match) => !arePredictionsEqual(draftPredictions[match.id], committedPredictions[match.id]));
  }, [matches, draftPredictions, committedPredictions]);

  const changedMatchIds = useMemo(
    () =>
      matches
        .filter((match) => match.status === "upcoming")
        .map((match) => match.id)
        .filter((matchId) => !arePredictionsEqual(draftPredictions[matchId], committedPredictions[matchId])),
    [matches, draftPredictions, committedPredictions]
  );

  const upcomingMatches = useMemo(() => matches.filter((match) => match.status === "upcoming"), [matches]);
  const completedMatches = useMemo(() => matches.filter((match) => match.status !== "upcoming"), [matches]);

  const selectedMatch = useMemo(() => matches.find((match) => match.id === editorMatchId) || null, [matches, editorMatchId]);

  const pendingSummary = useMemo(() => {
    const withValue = changedMatchIds.filter((matchId) => {
      const prediction = draftPredictions[matchId];
      return prediction && prediction.home !== null && prediction.away !== null;
    });
    return {
      changed: changedMatchIds.length,
      ready: withValue.length
    };
  }, [changedMatchIds, draftPredictions]);

  const nearestDeadline = useMemo(() => {
    const sorted = upcomingMatches
      .map((match) => match.deadlineAt)
      .filter((value): value is string => Boolean(value))
      .sort((left, right) => new Date(left).getTime() - new Date(right).getTime());

    return sorted[0] || null;
  }, [upcomingMatches]);

  const completionSummary = useMemo(() => {
    const total = Math.max(15, matches.length);
    const completed = matches.filter((match) => isPredictionComplete(draftPredictions[match.id])).length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pct };
  }, [matches, draftPredictions]);

  const userBadgeLabel = useMemo(() => initialsFromLabel(user?.name || "FC"), [user?.name]);
  const periodDeadlineLabel = useMemo(() => formatPeriodDeadlineLabel(nearestDeadline), [nearestDeadline]);

  const saveAllChanges = async () => {
    if (changedMatchIds.length === 0) return;

    setSavingAll(true);
    let successCount = 0;
    const failedIds = new Set<string>();

    for (const matchId of changedMatchIds) {
      const prediction = draftPredictions[matchId] || { home: null, away: null };
      const normalized = normalizePrediction(prediction);
      const ok = await persistPrediction(matchId, normalized);
      if (ok) {
        successCount += 1;
      } else {
        failedIds.add(matchId);
      }
    }

    setSavingAll(false);

    if (successCount > 0) {
      setCommittedPredictions((prev) => {
        const next = { ...prev };
        changedMatchIds.forEach((matchId) => {
          if (!failedIds.has(matchId)) {
            next[matchId] = normalizePrediction(draftPredictions[matchId] || { home: null, away: null });
          }
        });
        return next;
      });
    }

    if (successCount === changedMatchIds.length) {
      showToast({ title: "Pronósticos guardados", description: `${successCount} partido(s) actualizados`, tone: "success" });
      return;
    }

    showToast({
      title: "Guardado parcial",
      description: `${successCount}/${changedMatchIds.length} pronósticos guardados`,
      tone: successCount > 0 ? "info" : "error"
    });
  };

  return (
    <AppShell activeTab="pronosticos" showTopGlow={false}>
      <div className="min-h-dvh bg-slate-100">
        <header className="sticky top-0 z-20 rounded-b-3xl bg-white px-5 pb-6 pt-12 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-slate-900 p-1.5 text-lime-400 shadow-sm">
                <Trophy size={18} strokeWidth={2.5} />
              </div>
              <h1 className="text-xl font-black uppercase tracking-tighter text-slate-900">
                <span className="italic">Fulbito</span>
                <span className="text-lime-500">Prode</span>
              </h1>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Cambiar tema"
                className="rounded-full bg-slate-100 p-2 text-slate-600 transition-colors hover:bg-slate-200"
              >
                <Moon size={18} />
              </button>
              <button type="button" aria-label="Notificaciones" className="relative rounded-full bg-slate-100 p-2 text-slate-600 transition-colors hover:bg-slate-200">
                <Bell size={18} />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full border border-white bg-red-500" />
              </button>
              <Link href="/configuracion/ajustes" aria-label="Configuración" className="rounded-full bg-slate-100 p-2 text-slate-600 transition-colors hover:bg-slate-200">
                <Settings size={18} />
              </Link>
              <Link
                href="/perfil"
                aria-label="Perfil"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-lime-100 text-sm font-bold text-lime-700"
              >
                {userBadgeLabel}
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-lime-400 p-1.5 text-white">
              <Activity size={18} />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Pronósticos</h2>
            <span className="ml-auto text-sm font-medium text-slate-400">Resultados y carga</span>
          </div>
        </header>

        <main className="mt-6 space-y-4 px-4 pb-6 no-scrollbar">
          {memberships.length === 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <p className="text-sm font-bold text-slate-800">No tenés grupos activos.</p>
              <p className="mt-1 text-xs text-slate-500">Creá o uníte a un grupo para cargar pronósticos.</p>
              <Link href="/configuracion" className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-lime-400 px-4 text-xs font-bold text-slate-900">
                Ir a grupos
              </Link>
            </div>
          ) : (
            <>
              <section className="rounded-xl border border-slate-100 bg-white p-2 shadow-sm">
                <p className="mb-1 ml-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">SELECCION ACTUAL</p>
                <button
                  type="button"
                  onClick={() => setIsSelectorOpen(true)}
                  className="flex w-full items-center justify-between rounded-lg bg-slate-50 p-3 text-left transition-colors hover:bg-slate-100"
                >
                  <div className="flex min-w-0 items-center gap-2 pr-2 text-sm font-bold text-slate-800">
                    <Trophy size={16} className="flex-shrink-0 text-lime-600" />
                    <span className="truncate">
                      {activeSelection ? `${activeSelection.leagueName} · ${activeSelection.groupName}` : "Sin grupo activo"}
                    </span>
                  </div>
                  <ChevronDown size={16} className="flex-shrink-0 text-slate-400" />
                </button>
              </section>

              <section className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-2 shadow-sm">
                <button
                  type="button"
                  onClick={() => setPeriodIndex((value) => (value - 1 + Math.max(1, periods.length)) % Math.max(1, periods.length))}
                  aria-label="Fecha anterior"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-400 transition-colors hover:text-slate-600 disabled:opacity-50"
                  disabled={periods.length === 0 || loading || refreshingPeriod}
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="text-center">
                  <h3 className="text-base font-black text-lime-600">{periodLabel}</h3>
                  <p className="mt-1 text-[10px] font-medium text-slate-400">{refreshingPeriod ? "Actualizando..." : periodDeadlineLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPeriodIndex((value) => (value + 1) % Math.max(1, periods.length))}
                  aria-label="Fecha siguiente"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-400 transition-colors hover:text-slate-600 disabled:opacity-50"
                  disabled={periods.length === 0 || loading || refreshingPeriod}
                >
                  <ChevronRight size={18} />
                </button>
              </section>

              <section className="flex items-center justify-between">
                <div className="mr-2 flex flex-1 items-center gap-2 rounded-full border border-slate-100 bg-white px-3 py-1.5 shadow-sm">
                  <span className="whitespace-nowrap text-[10px] font-bold text-slate-400">
                    {completionSummary.completed}/{completionSummary.total}
                  </span>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-lime-500 transition-all duration-500" style={{ width: `${completionSummary.pct}%` }} />
                  </div>
                </div>
                <div className="flex flex-shrink-0 rounded-lg bg-slate-100 p-0.5">
                  <button
                    type="button"
                    onClick={() => setActiveTab("upcoming")}
                    className={`rounded-md px-3 py-1 text-[10px] font-bold transition-all ${activeTab === "upcoming" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400"}`}
                  >
                    Por Jugar
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("history")}
                    className={`rounded-md px-3 py-1 text-[10px] font-bold transition-all ${activeTab === "history" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400"}`}
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
                          <div className="group relative overflow-hidden rounded-xl border border-slate-100 bg-white px-3 py-3 shadow-sm no-scrollbar">
                            <div className="flex items-center justify-between">
                              <div className="flex min-w-0 flex-1 items-center gap-2">
                                <TeamLogoBadge code={match.homeTeam.code} logoUrl={homeLogo} />
                                <span className="truncate text-lg font-black text-slate-800">{match.homeTeam.code}</span>
                              </div>

                              <button
                                type="button"
                                onClick={() => openPredictionEditor(match.id)}
                                disabled={locked || savingAll}
                                className={`mx-1 flex h-10 min-w-[96px] items-center justify-center gap-2 rounded-lg border px-3 transition-all active:scale-95 ${
                                  changed || (draft.home !== null && draft.away !== null)
                                    ? "border-lime-200 bg-lime-50 text-slate-900"
                                    : "border-transparent bg-slate-100 text-slate-300 hover:bg-slate-200"
                                } ${locked || savingAll ? "opacity-50" : ""}`}
                                aria-label={`Editar pronóstico ${match.homeTeam.code} vs ${match.awayTeam.code}`}
                              >
                                <span className="w-6 text-center text-lg font-black tracking-tighter">{draft.home !== null ? draft.home : "-"}</span>
                                <span className="text-lg font-black text-slate-400 opacity-20">:</span>
                                <span className="w-6 text-center text-lg font-black tracking-tighter">{draft.away !== null ? draft.away : "-"}</span>
                              </button>

                              <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                                <span className="truncate text-right text-lg font-black text-slate-800">{match.awayTeam.code}</span>
                                <TeamLogoBadge code={match.awayTeam.code} logoUrl={awayLogo} />
                              </div>
                            </div>

                            <div className="mt-2 flex justify-center">
                              <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[9px] font-bold text-slate-400">
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
                            <p className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-500">Guardando pronóstico...</p>
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
                        <div key={match.id} className="overflow-hidden rounded-xl border border-slate-100 bg-white px-3 py-3 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              <TeamLogoBadge code={match.homeTeam.code} logoUrl={homeLogo} />
                              <span className="truncate text-lg font-black text-slate-800">{match.homeTeam.code}</span>
                            </div>

                            <div className="mx-1 min-w-[96px] rounded-lg bg-slate-100 px-3 py-1.5 text-center">
                              <p className="text-lg font-black tracking-tighter text-slate-800">
                                {homeScore} - {awayScore}
                              </p>
                              <p className="text-[9px] font-bold uppercase text-slate-400">{match.status === "live" ? match.meta.label : "Finalizado"}</p>
                            </div>

                            <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                              <span className="truncate text-right text-lg font-black text-slate-800">{match.awayTeam.code}</span>
                              <TeamLogoBadge code={match.awayTeam.code} logoUrl={awayLogo} />
                            </div>
                          </div>

                          <div className="mt-2 flex justify-center">
                            <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[9px] font-bold text-slate-400">
                              {formatMatchDateBadge(match.kickoffAt, match.meta.label)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  : null}

                {!loading && activeTab === "upcoming" && upcomingMatches.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">No hay partidos por jugar en esta fecha</div>
                ) : null}

                {!loading && activeTab === "history" && completedMatches.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">No hay jugados por el momento</div>
                ) : null}
              </section>

              {memberships.length > 0 && !loading && matches.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-2.5 text-[12px] text-slate-500">
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
          )}
        </main>
      </div>

      <GroupSelectorModal
        open={isSelectorOpen}
        groups={selectorGroups}
        activeGroupId={activeGroupId}
        onSelect={(groupId) => {
          setActiveGroupId(groupId);
          setIsSelectorOpen(false);
        }}
        onClose={() => setIsSelectorOpen(false)}
      />

      {selectedMatch ? (
        <div className="fixed inset-0 z-[120] flex items-end justify-center overflow-hidden no-scrollbar">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={closePredictionEditor} />
          <div className="relative w-full max-w-[469px] rounded-t-3xl bg-white p-5 shadow-2xl animate-in slide-in-from-bottom duration-300 no-scrollbar">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200" />

            <div className="mb-6 text-center">
              <h3 className="text-lg font-black uppercase tracking-tight text-slate-800">PRONÓSTICO</h3>
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                CIERRA: {formatModalCloseTime(selectedMatch.deadlineAt || selectedMatch.kickoffAt)}
              </span>
            </div>

            <div className="mb-8 flex items-center justify-between gap-4">
              <div className="flex w-1/3 flex-col items-center">
                <TeamLogoBadge code={selectedMatch.homeTeam.code} logoUrl={resolveTeamLogoUrl(selectedMatch.homeTeam)} size="lg" />
                <h4 className="mt-2 text-xl font-black leading-none text-slate-800">{selectedMatch.homeTeam.code}</h4>
                {resolveTeamDisplayName(selectedMatch.homeTeam).toUpperCase() !== selectedMatch.homeTeam.code.toUpperCase() ? (
                  <p className="mt-1 px-1 text-center text-[10px] font-bold leading-tight text-slate-400">{resolveTeamDisplayName(selectedMatch.homeTeam)}</p>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-1">
                  <button
                    type="button"
                    onClick={() => updateEditorDraft("home", 1)}
                    className="flex h-8 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200"
                    aria-label="Incrementar local"
                  >
                    <ChevronUp size={20} />
                  </button>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-slate-200 bg-white shadow-sm">
                    <span className="text-2xl font-black text-slate-800">{editorDraft.home !== null ? editorDraft.home : "-"}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateEditorDraft("home", -1)}
                    className="flex h-8 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200"
                    aria-label="Disminuir local"
                  >
                    <ChevronDown size={20} />
                  </button>
                </div>

                <div className="pb-1 text-xl font-black text-slate-300">:</div>

                <div className="flex flex-col items-center gap-1">
                  <button
                    type="button"
                    onClick={() => updateEditorDraft("away", 1)}
                    className="flex h-8 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200"
                    aria-label="Incrementar visitante"
                  >
                    <ChevronUp size={20} />
                  </button>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-slate-200 bg-white shadow-sm">
                    <span className="text-2xl font-black text-slate-800">{editorDraft.away !== null ? editorDraft.away : "-"}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateEditorDraft("away", -1)}
                    className="flex h-8 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200"
                    aria-label="Disminuir visitante"
                  >
                    <ChevronDown size={20} />
                  </button>
                </div>
              </div>

              <div className="flex w-1/3 flex-col items-center">
                <TeamLogoBadge code={selectedMatch.awayTeam.code} logoUrl={resolveTeamLogoUrl(selectedMatch.awayTeam)} size="lg" />
                <h4 className="mt-2 text-xl font-black leading-none text-slate-800">{selectedMatch.awayTeam.code}</h4>
                {resolveTeamDisplayName(selectedMatch.awayTeam).toUpperCase() !== selectedMatch.awayTeam.code.toUpperCase() ? (
                  <p className="mt-1 px-1 text-center text-[10px] font-bold leading-tight text-slate-400">{resolveTeamDisplayName(selectedMatch.awayTeam)}</p>
                ) : null}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={closePredictionEditor}
                className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={applyEditorPrediction}
                className="flex-[2] rounded-xl bg-lime-400 py-3 text-sm font-bold text-slate-900 shadow-lg shadow-lime-200 transition-all hover:bg-lime-500"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {hasPendingChanges ? (
        <div
          className="fixed inset-x-0 bottom-0 z-[95] mx-auto w-full max-w-[469px] border-t border-slate-100 bg-white px-4 pt-2 backdrop-blur"
          style={{ paddingBottom: "calc(92px + env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
            <p className="text-[11px] text-slate-500" aria-live="polite">
              {pendingSummary.changed} cambio(s) pendiente(s) · {pendingSummary.ready} listo(s)
            </p>
            <p className="inline-flex items-center gap-1 text-[11px] text-[var(--warning)]">
              <CircleAlert size={12} />
              No guardado
            </p>
          </div>
          <button
            type="button"
            onClick={() => void saveAllChanges()}
            disabled={savingAll}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-lime-400 px-4 text-[13px] font-bold text-slate-900 disabled:opacity-60"
          >
            <Save size={16} />
            {savingAll ? "Guardando cambios..." : "Guardar cambios"}
          </button>
        </div>
      ) : null}
    </AppShell>
  );
}
