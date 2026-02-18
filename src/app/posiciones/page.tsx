"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CloudRain,
  Flame,
  List,
  Moon,
  Ruler,
  Settings,
  Shield,
  Sparkles,
  Star,
  Target,
  Trophy,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SkeletonBlock } from "@/components/ui/SkeletonBlock";
import { useAuthSession } from "@/lib/use-auth-session";
import { usePageBenchmark } from "@/lib/use-page-benchmark";
import { useToast } from "@/components/ui/ToastProvider";
import { useTheme } from "@/lib/use-theme";
import type { FechasPayload, LeaderboardMode, LeaderboardPayload, LeaderboardRow, SelectionOption } from "@/lib/types";

interface PeriodOption {
  id: string;
  label: string;
}

const MODE_STORAGE_KEY = "fulbito.leaderboard.mode";

interface PeriodSnapshot {
  period: string;
  periodLabel: string;
  rows: LeaderboardRow[];
}

interface UserStatsSnapshot {
  key: string;
  name: string;
  exact: number;
  result: number;
  miss: number;
  positiveStreak: number;
  zeroStreak: number;
  batacazoCount: number;
  robinDifficultHits: number;
  robinEasyFails: number;
  casiCount: number;
}

interface AwardCardViewModel {
  id: string;
  title: string;
  winnerName: string;
  subtitle: string;
  icon: LucideIcon;
  iconContainerClassName: string;
  iconClassName: string;
}

function rowKey(row: Pick<LeaderboardRow, "userId" | "name">) {
  return row.userId || row.name.trim().toLowerCase();
}

function parseRecord(record: string) {
  const [exactRaw, resultRaw, missRaw] = record.split("/");
  return {
    exact: Number.parseInt(exactRaw || "0", 10) || 0,
    result: Number.parseInt(resultRaw || "0", 10) || 0,
    miss: Number.parseInt(missRaw || "0", 10) || 0
  };
}

function longestConsecutive(values: number[], predicate: (value: number) => boolean) {
  let current = 0;
  let best = 0;

  values.forEach((value) => {
    if (predicate(value)) {
      current += 1;
      if (current > best) best = current;
      return;
    }

    current = 0;
  });

  return best;
}

function pickWinner(
  entries: UserStatsSnapshot[],
  score: (entry: UserStatsSnapshot) => number,
  tiebreak?: (a: UserStatsSnapshot, b: UserStatsSnapshot) => number
) {
  if (entries.length === 0) return null;
  const tieResolver =
    tiebreak ||
    ((a: UserStatsSnapshot, b: UserStatsSnapshot) => a.name.localeCompare(b.name, "es"));

  return [...entries].sort((a, b) => {
    const scoreDelta = score(b) - score(a);
    if (scoreDelta !== 0) return scoreDelta;
    return tieResolver(a, b);
  })[0];
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

function competitionLabel(option: SelectionOption | null) {
  if (!option) return "Liga";
  return option.competitionName || option.leagueName || "Liga";
}

function selectionLogoDataUrl(option: SelectionOption | null) {
  if (!option) return null;
  const candidate = option as SelectionOption & {
    logoDataUrl?: string | null;
    groupLogoDataUrl?: string | null;
    competitionLogoDataUrl?: string | null;
    teamLogoDataUrl?: string | null;
    avatarDataUrl?: string | null;
  };
  const raw =
    candidate.groupLogoDataUrl ||
    candidate.competitionLogoDataUrl ||
    candidate.teamLogoDataUrl ||
    candidate.logoDataUrl ||
    candidate.avatarDataUrl ||
    null;
  if (!raw || typeof raw !== "string") return null;
  return raw.startsWith("data:image/") ? raw : null;
}

function GroupSelectorModal({
  activeGroupId,
  options,
  onSelect,
  onClose
}: {
  activeGroupId: string | null;
  options: SelectionOption[];
  onSelect: (groupId: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:rounded-[32px] overflow-hidden no-scrollbar">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className="bg-white w-full max-w-[469px] rounded-t-3xl p-6 relative shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[70%] overflow-y-auto no-scrollbar">
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-800 text-lg">Cambiar Grupo</h3>
          <button type="button" onClick={onClose} className="p-2 bg-slate-50 rounded-full text-slate-400" aria-label="Cerrar selector">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-2 no-scrollbar">
          {options.map((option) => {
            const isActive = option.groupId === activeGroupId;
            const logoDataUrl = selectionLogoDataUrl(option);
            return (
              <button
                key={option.groupId}
                type="button"
                onClick={() => {
                  onSelect(option.groupId);
                  onClose();
                }}
                className={`w-full p-3 rounded-xl flex items-center justify-between transition-all ${
                  isActive ? "bg-lime-50 border-2 border-lime-400" : "bg-slate-50 border border-slate-100 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div
                    className={`w-10 h-10 flex-shrink-0 rounded-lg flex items-center justify-center text-sm font-bold overflow-hidden ${
                      isActive ? "bg-lime-200 text-lime-800" : "bg-white text-slate-500 shadow-sm"
                    }`}
                  >
                    {logoDataUrl ? (
                      <img src={logoDataUrl} alt={`${option.groupName} logo`} className="h-[82%] w-[82%] object-contain" />
                    ) : (
                      initialsFromLabel(option.groupName)
                    )}
                  </div>
                  <div className="text-left min-w-0">
                    <p className={`text-sm font-bold truncate ${isActive ? "text-slate-900" : "text-slate-700"}`}>{option.groupName}</p>
                    <p className="text-xs text-slate-500 truncate">{competitionLabel(option)}</p>
                  </div>
                </div>
                {isActive ? (
                  <div className="bg-lime-400 text-white p-1 rounded-full flex-shrink-0">
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

function PosicionesHeader({
  userName,
  onToggleTheme
}: {
  userName: string;
  onToggleTheme: () => void;
}) {
  return (
    <header className="px-5 pt-12 pb-6 bg-white shadow-sm rounded-b-3xl z-10 sticky top-0">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <div className="bg-slate-900 p-1.5 rounded-lg text-lime-400 shadow-sm">
            <Trophy size={18} strokeWidth={2.5} />
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase">
            <span className="italic">Fulbito</span>
            <span className="text-lime-500">Prode</span>
          </h1>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onToggleTheme}
            className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            aria-label="Cambiar tema"
          >
            <Moon size={18} />
          </button>
          <button type="button" className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors relative" aria-label="Notificaciones">
            <Bell size={18} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
          </button>
          <Link href="/configuracion/ajustes" className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors" aria-label="Configuración">
            <Settings size={18} />
          </Link>
          <Link href="/perfil" className="p-2 rounded-full bg-lime-100 text-lime-700 font-bold text-sm h-9 w-9 flex items-center justify-center" aria-label="Perfil">
            {initialsFromLabel(userName)}
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="bg-lime-400 p-1.5 rounded-lg text-white">
          <List size={18} />
        </div>
        <h2 className="text-lg font-bold text-slate-800">Posiciones</h2>
        <span className="text-sm text-slate-400 font-medium ml-auto">Rendimiento del grupo</span>
      </div>
    </header>
  );
}

export default function PosicionesPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { toggleTheme } = useTheme();

  const [mode, setMode] = useState<LeaderboardMode>("posiciones");
  const [periodOptions, setPeriodOptions] = useState<PeriodOption[]>([{ id: "global", label: "Global acumulado" }]);
  const [periodIndex, setPeriodIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<LeaderboardPayload | null>(null);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [statsPeriodSnapshots, setStatsPeriodSnapshots] = useState<PeriodSnapshot[]>([]);
  const [statsInsightsLoading, setStatsInsightsLoading] = useState(false);
  const fechasCacheRef = useRef<Map<string, FechasPayload>>(new Map());
  const payloadCacheRef = useRef<Map<string, LeaderboardPayload>>(new Map());
  const statsSnapshotsCacheRef = useRef<Map<string, PeriodSnapshot[]>>(new Map());

  const { loading: authLoading, authenticated, user, memberships, activeGroupId, setActiveGroupId } = useAuthSession();
  usePageBenchmark("posiciones", loading);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(MODE_STORAGE_KEY) : null;
    if (stored === "stats" || stored === "posiciones") {
      setMode(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MODE_STORAGE_KEY, mode);
    }
  }, [mode]);

  useEffect(() => {
    if (mode === "stats" && periodIndex !== 0) {
      setPeriodIndex(0);
    }
  }, [mode, periodIndex]);

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
    () => selectionOptions.find((option) => option.groupId === activeGroupId) || selectionOptions[0] || null,
    [selectionOptions, activeGroupId]
  );

  const period = periodOptions[periodIndex]?.id || "global";

  useEffect(() => {
    if (!authLoading && !authenticated) {
      router.replace("/auth");
    }
  }, [authLoading, authenticated, router]);

  useEffect(() => {
    if (!activeSelection) {
      setPeriodOptions([{ id: "global", label: "Global acumulado" }]);
      setPeriodIndex(0);
      return;
    }

    const cacheKey = `${activeSelection.leagueId}:${activeSelection.season}:${activeSelection.competitionStage || "general"}`;
    const cached = fechasCacheRef.current.get(cacheKey);
    if (cached) {
      const nextOptions: PeriodOption[] = [{ id: "global", label: "Global acumulado" }, ...cached.fechas.map((fecha) => ({ id: fecha.id, label: fecha.label }))];
      setPeriodOptions(nextOptions);
      setPeriodIndex((prev) => (prev < nextOptions.length ? prev : 0));
      return;
    }

    let cancelled = false;

    async function loadFechas() {
      try {
        const response = await fetch(
          `/api/fechas?leagueId=${encodeURIComponent(String(activeSelection.leagueId))}&season=${encodeURIComponent(activeSelection.season)}&competitionStage=${encodeURIComponent(activeSelection.competitionStage || "general")}`,
          { method: "GET", cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error(`No se pudieron cargar las fechas (${response.status})`);
        }

        const json = (await response.json()) as FechasPayload;
        if (cancelled) return;

        fechasCacheRef.current.set(cacheKey, json);
        const nextOptions: PeriodOption[] = [{ id: "global", label: "Global acumulado" }, ...json.fechas.map((fecha) => ({ id: fecha.id, label: fecha.label }))];
        setPeriodOptions(nextOptions);
        setPeriodIndex((prev) => (prev < nextOptions.length ? prev : 0));
      } catch (fetchError) {
        if (!cancelled) {
          const message = fetchError instanceof Error ? fetchError.message : "No se pudieron cargar las fechas.";
          setError(message);
          setPeriodOptions([{ id: "global", label: "Global acumulado" }]);
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
    if (!activeSelection) {
      setPayload(null);
      return;
    }

    const requestKey = `${activeSelection.groupId}:${mode}:${period}`;
    const cached = payloadCacheRef.current.get(requestKey);
    if (cached) {
      setError(null);
      setLoading(false);
      setPayload(cached);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/leaderboard?mode=${mode}&period=${encodeURIComponent(period)}&groupId=${encodeURIComponent(activeSelection.groupId)}`,
          {
            method: "GET",
            cache: "no-store"
          }
        );

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const json = (await response.json()) as LeaderboardPayload;
        if (!cancelled) {
          payloadCacheRef.current.set(requestKey, json);
          setPayload(json);
        }
      } catch (fetchError) {
        if (!cancelled) {
          const message = fetchError instanceof Error ? fetchError.message : "No se pudo cargar la tabla.";
          setError(message);
          showToast({ title: "Error al cargar posiciones", description: message, tone: "error" });
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
  }, [activeSelection, mode, period, showToast]);

  const historicalPeriods = useMemo(
    () => periodOptions.filter((option) => option.id !== "global"),
    [periodOptions]
  );

  useEffect(() => {
    if (mode !== "stats" || !activeSelection) {
      setStatsPeriodSnapshots([]);
      setStatsInsightsLoading(false);
      return;
    }

    if (historicalPeriods.length === 0) {
      setStatsPeriodSnapshots([]);
      setStatsInsightsLoading(false);
      return;
    }

    const cacheKey = `${activeSelection.groupId}:${activeSelection.leagueId}:${activeSelection.season}:${activeSelection.competitionStage || "general"}:period-snapshots`;
    const cached = statsSnapshotsCacheRef.current.get(cacheKey);
    if (cached) {
      setStatsPeriodSnapshots(cached);
      setStatsInsightsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadStatsSnapshots() {
      setStatsInsightsLoading(true);

      const snapshotResults = await Promise.allSettled(
        historicalPeriods.map(async (periodOption): Promise<PeriodSnapshot> => {
          const requestKey = `${activeSelection.groupId}:posiciones:${periodOption.id}`;
          const cachedPayload = payloadCacheRef.current.get(requestKey);
          if (cachedPayload) {
            return {
              period: periodOption.id,
              periodLabel: cachedPayload.periodLabel || periodOption.label,
              rows: cachedPayload.rows
            };
          }

          const response = await fetch(
            `/api/leaderboard?mode=posiciones&period=${encodeURIComponent(periodOption.id)}&groupId=${encodeURIComponent(activeSelection.groupId)}`,
            {
              method: "GET",
              cache: "no-store"
            }
          );

          if (!response.ok) {
            throw new Error(`No se pudo cargar histórico (${response.status})`);
          }

          const json = (await response.json()) as LeaderboardPayload;
          payloadCacheRef.current.set(requestKey, json);

          return {
            period: periodOption.id,
            periodLabel: json.periodLabel || periodOption.label,
            rows: json.rows
          };
        })
      );

      if (cancelled) return;

      const nextSnapshots: PeriodSnapshot[] = [];
      let failures = 0;

      snapshotResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          nextSnapshots.push(result.value);
          return;
        }

        failures += 1;
        nextSnapshots.push({
          period: historicalPeriods[index]?.id || `period-${index}`,
          periodLabel: historicalPeriods[index]?.label || "Fecha",
          rows: []
        });
      });

      statsSnapshotsCacheRef.current.set(cacheKey, nextSnapshots);
      setStatsPeriodSnapshots(nextSnapshots);
      setStatsInsightsLoading(false);

      if (failures > 0 && failures === snapshotResults.length) {
        showToast({
          title: "No se pudieron cargar métricas históricas",
          description: "Mostramos Premios y Castigos con los datos actuales disponibles.",
          tone: "info"
        });
      }
    }

    void loadStatsSnapshots();

    return () => {
      cancelled = true;
    };
  }, [activeSelection, historicalPeriods, mode, showToast]);

  const rows = payload?.rows ?? [];
  const totalPoints = payload?.groupStats?.totalPoints ?? 1240;
  const totalPointsLabel = String(totalPoints);
  const cycleModeLabel = payload?.periodLabel ?? periodOptions[periodIndex]?.label ?? "Global acumulado";
  const activeSelectionLogo = selectionLogoDataUrl(activeSelection);

  const statsAwards = useMemo<AwardCardViewModel[]>(() => {
    const metricsByUser = new Map<string, UserStatsSnapshot>();
    const timelineByUser = new Map<
      string,
      {
        name: string;
        points: number[];
        batacazoCount: number;
        robinDifficultHits: number;
        robinEasyFails: number;
      }
    >();

    const ensureTimeline = (key: string, name: string) => {
      const current = timelineByUser.get(key);
      if (current) return current;
      const next = {
        name,
        points: [] as number[],
        batacazoCount: 0,
        robinDifficultHits: 0,
        robinEasyFails: 0
      };
      timelineByUser.set(key, next);
      return next;
    };

    rows.forEach((row) => {
      const key = rowKey(row);
      const parsedRecord = parseRecord(row.record);

      metricsByUser.set(key, {
        key,
        name: row.name,
        exact: parsedRecord.exact,
        result: parsedRecord.result,
        miss: parsedRecord.miss,
        positiveStreak: 0,
        zeroStreak: 0,
        batacazoCount: 0,
        robinDifficultHits: 0,
        robinEasyFails: 0,
        casiCount: Math.max(parsedRecord.result - parsedRecord.exact, 0)
      });
      ensureTimeline(key, row.name);
    });

    statsPeriodSnapshots.forEach((snapshot) => {
      const periodRowsByUser = new Map(snapshot.rows.map((row) => [rowKey(row), row] as const));
      const allUserKeys = new Set<string>([...timelineByUser.keys(), ...periodRowsByUser.keys()]);

      allUserKeys.forEach((userKey) => {
        const row = periodRowsByUser.get(userKey);
        const userName = row?.name || timelineByUser.get(userKey)?.name || "Participante";
        const timeline = ensureTimeline(userKey, userName);
        timeline.points.push(row?.points ?? 0);

        if (!metricsByUser.has(userKey)) {
          const parsedRecord = parseRecord(row?.record || "0/0/0");
          metricsByUser.set(userKey, {
            key: userKey,
            name: userName,
            exact: parsedRecord.exact,
            result: parsedRecord.result,
            miss: parsedRecord.miss,
            positiveStreak: 0,
            zeroStreak: 0,
            batacazoCount: 0,
            robinDifficultHits: 0,
            robinEasyFails: 0,
            casiCount: Math.max(parsedRecord.result - parsedRecord.exact, 0)
          });
        }
      });

      const scorers = snapshot.rows.filter((row) => row.points > 0);
      if (snapshot.rows.length > 1 && scorers.length === 1) {
        const ownerKey = rowKey(scorers[0]);
        const ownerTimeline = ensureTimeline(ownerKey, scorers[0].name);
        ownerTimeline.batacazoCount += 1;
        ownerTimeline.robinDifficultHits += 1;
      }

      snapshot.rows.forEach((row) => {
        if (row.points > 0) return;
        const others = snapshot.rows.filter((candidate) => rowKey(candidate) !== rowKey(row));
        if (others.length > 0 && others.every((candidate) => candidate.points > 0)) {
          const timeline = ensureTimeline(rowKey(row), row.name);
          timeline.robinEasyFails += 1;
        }
      });
    });

    const entries = [...metricsByUser.values()].map((entry) => {
      const timeline = timelineByUser.get(entry.key);
      const points = timeline?.points || [];

      return {
        ...entry,
        positiveStreak: longestConsecutive(points, (value) => value > 0),
        zeroStreak: longestConsecutive(points, (value) => value === 0),
        batacazoCount: timeline?.batacazoCount || 0,
        robinDifficultHits: timeline?.robinDifficultHits || 0,
        robinEasyFails: timeline?.robinEasyFails || 0,
      };
    });

    const fallbackEntry: UserStatsSnapshot = {
      key: "fallback",
      name: "Sin datos",
      exact: 0,
      result: 0,
      miss: 0,
      positiveStreak: 0,
      zeroStreak: 0,
      batacazoCount: 0,
      robinDifficultHits: 0,
      robinEasyFails: 0,
      casiCount: 0
    };

    const nostradamus = pickWinner(
      entries,
      (entry) => entry.exact,
      (a, b) => b.result - a.result || a.name.localeCompare(b.name, "es")
    ) || fallbackEntry;

    const bilardistaPool = entries.filter((entry) => entry.exact === 0);
    const bilardista =
      pickWinner(
        bilardistaPool.length > 0 ? bilardistaPool : entries,
        (entry) => entry.result,
        (a, b) => a.miss - b.miss || a.name.localeCompare(b.name, "es")
      ) || fallbackEntry;

    const laRacha = pickWinner(
      entries,
      (entry) => entry.positiveStreak,
      (a, b) => b.exact - a.exact || a.name.localeCompare(b.name, "es")
    ) || fallbackEntry;

    const batacazo = pickWinner(
      entries,
      (entry) => entry.batacazoCount,
      (a, b) => b.result - a.result || a.name.localeCompare(b.name, "es")
    ) || fallbackEntry;

    const robinHood = pickWinner(
      entries,
      (entry) => entry.robinDifficultHits * 10 + entry.robinEasyFails,
      (a, b) => b.robinDifficultHits - a.robinDifficultHits || a.name.localeCompare(b.name, "es")
    ) || fallbackEntry;

    const elCasi = pickWinner(
      entries,
      (entry) => entry.casiCount,
      (a, b) => b.result - a.result || a.name.localeCompare(b.name, "es")
    ) || fallbackEntry;

    const elMufa = pickWinner(
      entries,
      (entry) => entry.zeroStreak,
      (a, b) => b.miss - a.miss || a.name.localeCompare(b.name, "es")
    ) || fallbackEntry;

    return [
      {
        id: "nostradamus",
        title: "NOSTRADAMUS",
        winnerName: nostradamus.name,
        subtitle: `Mayor cantidad de plenos (${nostradamus.exact})`,
        icon: Sparkles,
        iconContainerClassName: "bg-violet-100",
        iconClassName: "text-violet-500"
      },
      {
        id: "bilardista",
        title: "BILARDISTA",
        winnerName: bilardista.name,
        subtitle: `Suma con lo justo. ${bilardista.result} resultados y 0 plenos.`,
        icon: Shield,
        iconContainerClassName: "bg-slate-200",
        iconClassName: "text-slate-600"
      },
      {
        id: "la-racha",
        title: "LA RACHA",
        winnerName: laRacha.name,
        subtitle: `${laRacha.positiveStreak} fechas sumando seguido`,
        icon: Flame,
        iconContainerClassName: "bg-orange-100",
        iconClassName: "text-orange-500"
      },
      {
        id: "batacazo",
        title: "BATACAZO",
        winnerName: batacazo.name,
        subtitle: `Único acierto grupal (${batacazo.batacazoCount})`,
        icon: Zap,
        iconContainerClassName: "bg-amber-100",
        iconClassName: "text-amber-600"
      },
      {
        id: "robin-hood",
        title: "ROBIN HOOD",
        winnerName: robinHood.name,
        subtitle: `Acierta difíciles (${robinHood.robinDifficultHits}), erra fáciles (${robinHood.robinEasyFails})`,
        icon: Target,
        iconContainerClassName: "bg-emerald-100",
        iconClassName: "text-emerald-600"
      },
      {
        id: "el-casi",
        title: 'EL "CASI"',
        winnerName: elCasi.name,
        subtitle: `Resultado sí, pleno no por 1 gol (${elCasi.casiCount})`,
        icon: Ruler,
        iconContainerClassName: "bg-blue-100",
        iconClassName: "text-blue-600"
      },
      {
        id: "el-mufa",
        title: "EL MUFA",
        winnerName: elMufa.name,
        subtitle: `${elMufa.zeroStreak} fechas sin sumar nada`,
        icon: CloudRain,
        iconContainerClassName: "bg-slate-100",
        iconClassName: "text-slate-500"
      }
    ];
  }, [rows, statsPeriodSnapshots]);

  const rendimientoRows = useMemo(
    () => [
      {
        id: "exact",
        title: "Aciertos Exactos",
        subtitle: "Puntaje máximo",
        value: payload?.groupStats?.exactPredictions ?? 0,
        icon: Target,
        iconContainerClassName: "bg-emerald-100",
        iconClassName: "text-emerald-600"
      },
      {
        id: "results",
        title: "Resultados",
        subtitle: "Solo ganador/empate",
        value: payload?.groupStats?.resultPredictions ?? 0,
        icon: Check,
        iconContainerClassName: "bg-blue-100",
        iconClassName: "text-blue-600"
      },
      {
        id: "average",
        title: "Promedio x Fecha",
        subtitle: "Por participante",
        value: Number.isInteger(payload?.groupStats?.averageMemberPoints ?? 0)
          ? String(payload?.groupStats?.averageMemberPoints ?? 0)
          : (payload?.groupStats?.averageMemberPoints ?? 0).toFixed(1),
        icon: Clock3,
        iconContainerClassName: "bg-orange-100",
        iconClassName: "text-orange-600"
      }
    ],
    [payload?.groupStats?.averageMemberPoints, payload?.groupStats?.exactPredictions, payload?.groupStats?.resultPredictions]
  );

  return (
    <AppShell activeTab="posiciones" showTopGlow={false}>
      <div className="min-h-full bg-slate-50">
        <PosicionesHeader userName={user?.name || "Facundo Contreras"} onToggleTheme={toggleTheme} />

        <section className="mt-6 space-y-4 px-4 pb-6 no-scrollbar">
          {memberships.length === 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-800">No tenés grupos activos.</p>
              <p className="mt-1 text-xs text-slate-500">Creá o uníte a un grupo para ver las posiciones.</p>
              <Link href="/configuracion" className="mt-3 inline-flex rounded-xl bg-lime-400 px-4 py-2 text-xs font-bold text-slate-900">
                Ir a grupos
              </Link>
            </div>
          ) : null}

          {memberships.length > 0 ? (
            <>
              <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm relative">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide ml-2 mb-1">SELECCION ACTUAL</p>
                <button
                  type="button"
                  onClick={() => setIsSelectorOpen(true)}
                  className="w-full bg-slate-50 rounded-lg p-3 flex items-center justify-between hover:bg-slate-100 transition-colors text-left"
                >
                  <div className="flex items-center gap-2 text-slate-800 font-bold text-sm truncate pr-2">
                    {activeSelectionLogo ? (
                      <img src={activeSelectionLogo} alt={`${activeSelection?.groupName || "Grupo"} logo`} className="h-4 w-4 object-contain flex-shrink-0" />
                    ) : (
                      <Trophy size={16} className="text-lime-600 flex-shrink-0" />
                    )}
                    <span className="truncate">
                      {competitionLabel(activeSelection)} · {activeSelection?.groupName || "Sin grupo"}
                    </span>
                  </div>
                  <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />
                </button>
              </div>

              <div className="bg-slate-100 p-1 rounded-xl flex font-bold text-sm">
                <button
                  type="button"
                  onClick={() => setMode("posiciones")}
                  className={`flex-1 rounded-lg py-2.5 transition-all ${mode === "posiciones" ? "bg-lime-400 text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                >
                  POSICIONES
                </button>
                <button
                  type="button"
                  onClick={() => setMode("stats")}
                  className={`flex-1 rounded-lg py-2.5 transition-all ${mode === "stats" ? "bg-lime-400 text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                >
                  STATS
                </button>
              </div>

              {mode === "posiciones" ? (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setPeriodIndex((value) => (value - 1 + Math.max(1, periodOptions.length)) % Math.max(1, periodOptions.length))}
                    className="p-2 bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600"
                    aria-label="Periodo anterior"
                    disabled={periodOptions.length === 0}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-sm font-black text-lime-600 uppercase tracking-wide truncate px-2">{cycleModeLabel}</span>
                  <button
                    type="button"
                    onClick={() => setPeriodIndex((value) => (value + 1) % Math.max(1, periodOptions.length))}
                    className="p-2 bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600"
                    aria-label="Periodo siguiente"
                    disabled={periodOptions.length === 0}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              ) : null}

              {loading && rows.length === 0 ? (
                <div className="space-y-3">
                  <SkeletonBlock className="h-[58px] w-full rounded-xl" />
                  <SkeletonBlock className="h-[180px] w-full rounded-2xl" />
                </div>
              ) : mode === "posiciones" ? (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden no-scrollbar">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <span className="text-xs font-bold text-slate-800">{payload?.groupLabel || activeSelection?.groupName || "Grupo"}</span>
                    <div className="flex gap-4 text-[10px] font-bold text-slate-400 uppercase text-right">
                      <span className="w-8 text-center">Pred</span>
                      <span className="w-12 text-center">EX/RE/NA</span>
                      <span className="w-6 text-center">Pts</span>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-50">
                    {rows.map((row) => (
                      <div
                        key={`${row.rank}-${row.userId || row.name}`}
                        className={`px-4 py-2 flex items-center justify-between ${row.highlight ? "bg-lime-50 border-l-4 border-lime-400" : "hover:bg-slate-50"}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`text-sm font-bold w-4 text-center ${row.highlight ? "text-lime-700" : "text-slate-400"}`}>{row.rank}</span>
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                            {row.name} {row.highlight ? <Star size={10} className="fill-orange-400 text-orange-400" /> : null}
                          </span>
                        </div>

                        <div className="flex gap-4 items-center text-xs font-medium text-right">
                          <span className="w-8 text-center text-slate-500">{row.predictions}</span>
                          <span className="w-12 text-center text-slate-500 tracking-tighter">{row.record}</span>
                          <span className={`w-6 text-center font-bold ${row.highlight ? "text-slate-900" : "text-slate-700"}`}>{row.points}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4 no-scrollbar">
                  <div className="grid grid-cols-2 gap-3 no-scrollbar">
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
                      <div className="bg-lime-100 p-2.5 rounded-full mb-2 text-lime-700">
                        <Trophy size={20} />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-400">RANKING MUNDIAL</span>
                      <span className="text-2xl font-black tracking-tighter text-slate-800 mt-1 leading-none">#842</span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
                      <div className="bg-indigo-100 p-2.5 rounded-full mb-2 text-indigo-600">
                        <Star size={20} className="fill-indigo-600" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-400">PUNTOS TOTALES</span>
                      <span className="text-2xl font-black tracking-tighter text-indigo-600 mt-1 leading-none">{totalPointsLabel}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg leading-none font-black text-slate-800 uppercase tracking-tight">PREMIOS Y CASTIGOS</h3>
                    <div className="grid grid-cols-2 gap-3 no-scrollbar">
                      {statsAwards.map((award) => {
                        const AwardIcon = award.icon;
                        return (
                          <article key={award.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="flex items-center justify-between gap-3">
                              <div className={`h-9 w-9 rounded-2xl flex items-center justify-center ${award.iconContainerClassName}`}>
                                <AwardIcon size={17} className={award.iconClassName} />
                              </div>
                              <span className="text-[11px] font-black uppercase tracking-[1.2px] text-slate-400 text-right">{award.title}</span>
                            </div>
                            <h4 className="mt-4 text-sm leading-none font-black text-slate-800">{award.winnerName}</h4>
                            <p className="mt-2 text-[11px] leading-tight font-medium text-slate-500">{award.subtitle}</p>
                          </article>
                        );
                      })}
                    </div>

                    {statsInsightsLoading ? (
                      <div className="grid grid-cols-2 gap-3">
                        <SkeletonBlock className="h-[122px] rounded-2xl" />
                        <SkeletonBlock className="h-[122px] rounded-2xl" />
                      </div>
                    ) : null}
                  </div>

                  <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <header className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                      <BarChart3 size={16} className="text-slate-400" />
                      <h4 className="text-lg leading-none font-black text-slate-800">Rendimiento General</h4>
                    </header>
                    <div className="divide-y divide-slate-100">
                      {rendimientoRows.map((metric) => {
                        const MetricIcon = metric.icon;
                        return (
                          <div key={metric.id} className="px-4 py-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${metric.iconContainerClassName}`}>
                                <MetricIcon size={16} className={metric.iconClassName} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm leading-none font-black text-slate-700">{metric.title}</p>
                                <p className="text-[11px] leading-tight font-medium text-slate-400">{metric.subtitle}</p>
                              </div>
                            </div>
                            <span className="text-2xl leading-none font-black text-slate-800">{metric.value}</span>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </div>
              )}
            </>
          ) : null}

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-500">{error}</p>
          ) : null}
        </section>
      </div>

      {isSelectorOpen ? (
        <GroupSelectorModal
          activeGroupId={activeSelection?.groupId || null}
          options={selectionOptions}
          onSelect={setActiveGroupId}
          onClose={() => setIsSelectorOpen(false)}
        />
      ) : null}
    </AppShell>
  );
}
