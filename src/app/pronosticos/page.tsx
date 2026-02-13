"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { TopHeader } from "@/components/layout/TopHeader";
import { LeagueSelector } from "@/components/home/LeagueSelector";
import { MatchCard } from "@/components/matches/MatchCard";
import { currentLeagueLabel } from "@/lib/mock-data";
import type { MatchCardData, MatchPeriod, PredictionValue, PredictionsByMatch, PronosticosPayload } from "@/lib/types";

const periods: MatchPeriod[] = ["fecha14", "fecha15"];

export default function PronosticosPage() {
  const [periodIndex, setPeriodIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodLabel, setPeriodLabel] = useState("Fecha 14");
  const [matches, setMatches] = useState<MatchCardData[]>([]);
  const [stepperByMatch, setStepperByMatch] = useState<PredictionsByMatch>({});

  const period = periods[periodIndex];

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/pronosticos?period=${period}`, {
          method: "GET",
          cache: "no-store"
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as PronosticosPayload;

        if (!cancelled) {
          setPeriodLabel(payload.periodLabel);
          setMatches(payload.matches);
          setStepperByMatch(payload.predictions);
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

    load();

    return () => {
      cancelled = true;
    };
  }, [period]);

  async function persistPrediction(matchId: string, value: PredictionValue) {
    try {
      await fetch("/api/pronosticos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          period,
          matchId,
          home: value.home,
          away: value.away
        })
      });
    } catch {
      // Keep UI optimistic for now.
    }
  }

  const setPrediction = (matchId: string, side: "home" | "away", delta: number) => {
    let nextValue: PredictionValue | null = null;

    setStepperByMatch((prev) => {
      const current = prev[matchId] ?? { home: null, away: null };
      const currentNumber = current[side] ?? 0;
      const updated = Math.max(0, Math.min(99, currentNumber + delta));

      nextValue = {
        ...current,
        [side]: updated
      };

      return {
        ...prev,
        [matchId]: nextValue
      };
    });

    if (nextValue) {
      void persistPrediction(matchId, nextValue);
    }
  };

  const orderedMatches = useMemo(() => matches, [matches]);

  return (
    <AppShell activeTab="pronosticos">
      <TopHeader title="Pronósticos" userLabel="USER" />
      <LeagueSelector label={currentLeagueLabel} />

      <section className="flex flex-col gap-2 px-5 pt-[10px]">
        <div className="px-0 py-2">
          <div className="flex items-center justify-between rounded-full border border-[var(--border-light)] bg-[var(--bg-surface)] px-3 py-[5px]">
            <button
              type="button"
              onClick={() => setPeriodIndex((value) => (value - 1 + periods.length) % periods.length)}
              aria-label="Fecha anterior"
              className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-[var(--border-dim)] bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)]"
            >
              <ChevronLeft size={11} />
            </button>
            <span className="text-[11px] font-bold tracking-[0.2px] text-[var(--accent)]">{periodLabel}</span>
            <button
              type="button"
              onClick={() => setPeriodIndex((value) => (value + 1) % periods.length)}
              aria-label="Fecha siguiente"
              className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-[#334400] bg-[var(--bg-surface-elevated)] text-[var(--accent)]"
            >
              <ChevronRight size={11} />
            </button>
          </div>
        </div>

        <div className={`space-y-2 transition-opacity ${loading ? "opacity-70" : "opacity-100"}`}>
          {orderedMatches.map((match) => {
            if (match.status === "upcoming") {
              const stepper = stepperByMatch[match.id] ?? { home: null, away: null };
              return (
                <MatchCard
                  key={match.id}
                  {...match}
                  showPredictionStepper
                  stepper={{
                    homeValue: stepper.home,
                    awayValue: stepper.away,
                    onHomeIncrement: () => setPrediction(match.id, "home", 1),
                    onHomeDecrement: () => setPrediction(match.id, "home", -1),
                    onAwayIncrement: () => setPrediction(match.id, "away", 1),
                    onAwayDecrement: () => setPrediction(match.id, "away", -1)
                  }}
                />
              );
            }

            return <MatchCard key={match.id} {...match} />;
          })}
        </div>

        {error ? <p className="text-[11px] font-medium text-red-400">{error}</p> : null}
      </section>
    </AppShell>
  );
}
