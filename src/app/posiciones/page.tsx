"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { TopHeader } from "@/components/layout/TopHeader";
import { CurrentSelectionSelector } from "@/components/home/CurrentSelectionSelector";
import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";
import { SkeletonBlock } from "@/components/ui/SkeletonBlock";
import { useAuthSession } from "@/lib/use-auth-session";
import { usePageBenchmark } from "@/lib/use-page-benchmark";
import type { FechasPayload, LeaderboardMode, LeaderboardPayload, SelectionOption } from "@/lib/types";

interface PeriodOption {
  id: string;
  label: string;
}

function StatsSummary({ payload }: { payload: LeaderboardPayload | null }) {
  if (!payload?.groupStats || payload.mode !== "stats") {
    return null;
  }

  const { groupStats } = payload;

  return (
    <div className="grid grid-cols-2 gap-2.5">
      <div className="rounded-[6px] border border-[var(--border-dim)] bg-[var(--bg-surface)] p-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3px] text-[var(--text-muted)]">Miembros</p>
        <p className="mt-1 text-[18px] font-extrabold text-white">{groupStats.memberCount}</p>
      </div>

      <div className="rounded-[6px] border border-[var(--border-dim)] bg-[var(--bg-surface)] p-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3px] text-[var(--text-muted)]">Aciertos totales</p>
        <p className="mt-1 text-[18px] font-extrabold text-white">{groupStats.correctPredictions}</p>
        <p className="text-[10px] text-[var(--text-secondary)]">
          {groupStats.exactPredictions} exactos · {groupStats.resultPredictions} resultado
        </p>
      </div>

      <div className="rounded-[6px] border border-[var(--border-dim)] bg-[var(--bg-surface)] p-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3px] text-[var(--text-muted)]">Precisión grupal</p>
        <p className="mt-1 text-[18px] font-extrabold text-[var(--accent)]">{groupStats.accuracyPct}%</p>
        <p className="text-[10px] text-[var(--text-secondary)]">{groupStats.scoredPredictions} predicciones evaluadas</p>
      </div>

      <div className="rounded-[6px] border border-[var(--border-dim)] bg-[var(--bg-surface)] p-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3px] text-[var(--text-muted)]">Puntaje del grupo</p>
        <p className="mt-1 text-[18px] font-extrabold text-white">{groupStats.totalPoints}</p>
        <p className="text-[10px] text-[var(--text-secondary)]">Promedio por miembro: {groupStats.averageMemberPoints}</p>
      </div>

      <div className="col-span-2 rounded-[6px] border border-[var(--border-dim)] bg-[var(--bg-surface)] p-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3px] text-[var(--text-muted)]">Mejor fecha histórica</p>
        {groupStats.bestFecha ? (
          <>
            <p className="mt-1 text-[13px] font-bold text-white">
              {groupStats.bestFecha.periodLabel}: {groupStats.bestFecha.userName} ({groupStats.bestFecha.points} pts)
            </p>
            <p className="text-[10px] text-[var(--text-secondary)]">Récord individual de puntos en una fecha dentro del grupo.</p>
          </>
        ) : (
          <p className="mt-1 text-[11px] text-[var(--text-secondary)]">Todavía no hay partidos puntuados.</p>
        )}
      </div>

      <div className="col-span-2 rounded-[6px] border border-[var(--border-dim)] bg-[var(--bg-surface)] p-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3px] text-[var(--text-muted)]">Benchmark liga/torneo</p>
        {groupStats.worldBenchmark ? (
          <>
            <p className="mt-1 text-[13px] font-bold text-white">
              {groupStats.worldBenchmark.groupTotalPoints} pts grupo vs {groupStats.worldBenchmark.leaderPoints} pts líder
            </p>
            <p className="text-[10px] text-[var(--text-secondary)]">
              {groupStats.worldBenchmark.leagueName}: {groupStats.worldBenchmark.ratioVsLeaderPct}% del líder de la tabla.
            </p>
          </>
        ) : (
          <p className="mt-1 text-[11px] text-[var(--text-secondary)]">No se pudo cargar la tabla de referencia de la liga.</p>
        )}
      </div>
    </div>
  );
}

export default function PosicionesPage() {
  const router = useRouter();
  const [mode, setMode] = useState<LeaderboardMode>("posiciones");
  const [periodOptions, setPeriodOptions] = useState<PeriodOption[]>([{ id: "global", label: "Global acumulado" }]);
  const [periodIndex, setPeriodIndex] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<LeaderboardPayload | null>(null);
  const fechasCacheRef = useRef<Map<string, FechasPayload>>(new Map());
  const payloadCacheRef = useRef<Map<string, LeaderboardPayload>>(new Map());
  const lastRefreshTickRef = useRef(0);
  const { loading: authLoading, authenticated, user, memberships, activeGroupId, setActiveGroupId } = useAuthSession();
  usePageBenchmark("posiciones", loading);

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
    const leagueId = activeSelection.leagueId;
    const season = activeSelection.season;
    const competitionStage = activeSelection.competitionStage || "general";
    const cacheKey = `${leagueId}:${season}:${competitionStage}`;
    const cached = fechasCacheRef.current.get(cacheKey);
    if (cached) {
      const nextOptions: PeriodOption[] = [
        { id: "global", label: "Global acumulado" },
        ...cached.fechas.map((fecha) => ({ id: fecha.id, label: fecha.label }))
      ];

      setPeriodOptions(nextOptions);
      setPeriodIndex((prev) => (prev < nextOptions.length ? prev : 0));
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
        const nextOptions: PeriodOption[] = [
          { id: "global", label: "Global acumulado" },
          ...payload.fechas.map((fecha) => ({ id: fecha.id, label: fecha.label }))
        ];

        setPeriodOptions(nextOptions);
        setPeriodIndex((prev) => (prev < nextOptions.length ? prev : 0));
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : "No se pudieron cargar las fechas.");
          setPeriodOptions([{ id: "global", label: "Global acumulado" }]);
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
    if (!activeSelection) {
      setPayload(null);
      return;
    }
    const groupId = activeSelection.groupId;
    const requestKey = `${groupId}:${mode}:${period}`;
    const shouldBypassCache = refreshTick > lastRefreshTickRef.current;
    const cached = payloadCacheRef.current.get(requestKey);
    if (!shouldBypassCache && cached) {
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
          `/api/leaderboard?mode=${mode}&period=${encodeURIComponent(period)}&groupId=${encodeURIComponent(groupId)}`,
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
          setError(fetchError instanceof Error ? fetchError.message : "No se pudo cargar la tabla.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
        lastRefreshTickRef.current = refreshTick;
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [mode, period, refreshTick, activeSelection]);

  const cycleModeLabel = payload?.periodLabel ?? periodOptions[periodIndex]?.label ?? "Global acumulado";

  const rows = useMemo(() => payload?.rows ?? [], [payload]);

  return (
    <AppShell activeTab="posiciones">
      <TopHeader title="Posiciones" userLabel={user?.name || "USER"} />
      <CurrentSelectionSelector options={selectionOptions} activeGroupId={activeGroupId} onChange={setActiveGroupId} />

      <section className="flex flex-col gap-2.5 px-5 pt-[10px] pb-2">
        {memberships.length === 0 ? (
          <div className="rounded-[6px] border border-[var(--border-dim)] bg-[#0b0b0d] p-4">
            <p className="text-[13px] font-semibold text-white">No tenés grupos activos.</p>
            <p className="mt-1 text-[11px] text-[var(--text-secondary)]">Creá o uníte a un grupo para ver las posiciones.</p>
            <Link href="/configuracion" className="mt-3 inline-flex rounded-[6px] bg-[var(--accent)] px-3 py-1.5 text-[11px] font-bold text-black">
              Ir a grupos
            </Link>
          </div>
        ) : null}

        {memberships.length > 0 ? (
          <>
            <header className="flex items-center justify-between">
              <h2 className="truncate text-[22px] font-extrabold text-white">{payload?.groupLabel || "Sin grupo activo"}</h2>
              <button
                type="button"
                onClick={() => setRefreshTick((value) => value + 1)}
                className="flex items-center gap-1 rounded-full border border-[var(--border-dim)] px-[9px] py-[5px] text-[10px] font-semibold text-[var(--text-secondary)]"
              >
                <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                {loading ? "Actualizando" : "Actualizar"}
              </button>
            </header>

            <div className="flex items-center justify-between rounded-full border border-[var(--border-light)] bg-[var(--bg-surface)] px-2.5 py-1">
              <button
                type="button"
                onClick={() =>
                  setPeriodIndex((value) => (value - 1 + Math.max(1, periodOptions.length)) % Math.max(1, periodOptions.length))
                }
                className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border-dim)] bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)]"
                aria-label="Periodo anterior"
                disabled={periodOptions.length === 0}
              >
                <ChevronLeft size={11} />
              </button>
              <span className="truncate px-2 text-[11px] font-bold tracking-[0.2px] text-[var(--accent)]">{cycleModeLabel}</span>
              <button
                type="button"
                onClick={() => setPeriodIndex((value) => (value + 1) % Math.max(1, periodOptions.length))}
                className="flex h-6 w-6 items-center justify-center rounded-full border border-[#334400] bg-[var(--bg-surface-elevated)] text-[var(--accent)]"
                aria-label="Periodo siguiente"
                disabled={periodOptions.length === 0}
              >
                <ChevronRight size={11} />
              </button>
            </div>

            {loading && rows.length === 0 ? (
              <div className="space-y-2">
                <SkeletonBlock className="h-8 w-full rounded-full" />
                <SkeletonBlock className="h-[420px] w-full rounded-[6px]" />
              </div>
            ) : (
              <div className="space-y-2.5">
                <StatsSummary payload={payload} />
                <LeaderboardTable
                  mode={mode}
                  rows={rows}
                  groupLabel={payload?.groupLabel ?? "Sin grupo"}
                  loading={loading}
                  onModeChange={setMode}
                />
              </div>
            )}
          </>
        ) : null}

        {error ? <p className="text-[11px] font-medium text-red-400">{error}</p> : null}
      </section>
    </AppShell>
  );
}
