"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { TopHeader } from "@/components/layout/TopHeader";
import { LeagueSelector } from "@/components/home/LeagueSelector";
import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";
import { currentLeagueLabel } from "@/lib/mock-data";
import type { LeaderboardMode, LeaderboardPayload, LeaderboardPeriod } from "@/lib/types";

const periods: LeaderboardPeriod[] = ["global", "fecha14"];

export default function PosicionesPage() {
  const [mode, setMode] = useState<LeaderboardMode>("posiciones");
  const [periodIndex, setPeriodIndex] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<LeaderboardPayload | null>(null);

  const period = periods[periodIndex];

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/leaderboard?mode=${mode}&period=${period}`, {
          method: "GET",
          cache: "no-store"
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const json = (await response.json()) as LeaderboardPayload;

        if (!cancelled) {
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
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [mode, period, refreshTick]);

  const cycleModeLabel = payload?.periodLabel ?? (period === "global" ? "Global acumulado" : "Fecha 14");

  const rows = useMemo(() => payload?.rows ?? [], [payload]);

  return (
    <AppShell activeTab="posiciones">
      <TopHeader title="Posiciones" userLabel="USER" />
      <LeagueSelector label={currentLeagueLabel} />

      <section className="flex flex-col gap-2.5 px-5 pt-[10px] pb-2">
        <header className="flex items-center justify-between">
          <h2 className="text-[22px] font-extrabold text-white">Grupo Amigos</h2>
          <button
            type="button"
            onClick={() => setRefreshTick((value) => value + 1)}
            className="flex items-center gap-1 rounded-full border border-[var(--border-dim)] px-[9px] py-[5px] text-[10px] font-semibold text-[var(--text-secondary)]"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            {loading ? "Actualizando" : "Actualizar"}
          </button>
        </header>

        <div className="flex items-center justify-between rounded-full border border-[var(--border-light)] bg-[var(--bg-surface)] px-3 py-[5px]">
          <button
            type="button"
            onClick={() => setPeriodIndex((value) => (value - 1 + periods.length) % periods.length)}
            className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-[var(--border-dim)] bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)]"
            aria-label="Periodo anterior"
          >
            <ChevronLeft size={11} />
          </button>
          <span className="text-[11px] font-bold tracking-[0.2px] text-[var(--accent)]">{cycleModeLabel}</span>
          <button
            type="button"
            onClick={() => setPeriodIndex((value) => (value + 1) % periods.length)}
            className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-[#334400] bg-[var(--bg-surface-elevated)] text-[var(--accent)]"
            aria-label="Periodo siguiente"
          >
            <ChevronRight size={11} />
          </button>
        </div>

        <LeaderboardTable
          mode={mode}
          rows={rows}
          groupLabel={payload?.groupLabel ?? "Liga amigos | Grupo A"}
          loading={loading}
          onModeChange={setMode}
        />

        {error ? <p className="text-[11px] font-medium text-red-400">{error}</p> : null}
      </section>
    </AppShell>
  );
}
