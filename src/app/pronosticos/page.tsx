"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { TopHeader } from "@/components/layout/TopHeader";
import { LeagueSelector } from "@/components/home/LeagueSelector";
import { MatchCard } from "@/components/matches/MatchCard";
import { currentLeagueLabel, pronosticosMatches } from "@/lib/mock-data";

export default function PronosticosPage() {
  const initialStepper = useMemo(
    () =>
      Object.fromEntries(
        pronosticosMatches
          .filter((match) => match.status === "upcoming")
          .map((match) => [match.id, { homeValue: null as number | null, awayValue: null as number | null }])
      ),
    []
  );

  const [stepperByMatch, setStepperByMatch] = useState(initialStepper);

  const setHome = (id: string, delta: number) => {
    setStepperByMatch((prev) => {
      const current = prev[id];
      if (!current) return prev;
      const nextValue = Math.max(0, Math.min(99, (current.homeValue ?? 0) + delta));
      return { ...prev, [id]: { ...current, homeValue: nextValue } };
    });
  };

  const setAway = (id: string, delta: number) => {
    setStepperByMatch((prev) => {
      const current = prev[id];
      if (!current) return prev;
      const nextValue = Math.max(0, Math.min(99, (current.awayValue ?? 0) + delta));
      return { ...prev, [id]: { ...current, awayValue: nextValue } };
    });
  };

  return (
    <AppShell activeTab="pronosticos">
      <TopHeader title="Pronósticos" userLabel="USER" />
      <LeagueSelector label={currentLeagueLabel} />

      <section className="flex flex-col gap-2 px-5 pt-[10px]">
        <div className="px-0 py-2">
          <div className="flex items-center justify-between rounded-full border border-[var(--border-light)] bg-[var(--bg-surface)] px-3 py-[5px]">
            <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-[var(--border-dim)] bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)]">
              <ChevronLeft size={11} />
            </span>
            <span className="text-[11px] font-bold tracking-[0.2px] text-[var(--accent)]">Fecha 14</span>
            <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-[#334400] bg-[var(--bg-surface-elevated)] text-[var(--accent)]">
              <ChevronRight size={11} />
            </span>
          </div>
        </div>

        <div className="space-y-2">
          {pronosticosMatches.map((match) => {
            if (match.status === "upcoming") {
              const stepper = stepperByMatch[match.id];
              return (
                <MatchCard
                  key={match.id}
                  {...match}
                  showPredictionStepper
                  stepper={{
                    homeValue: stepper.homeValue,
                    awayValue: stepper.awayValue,
                    onHomeIncrement: () => setHome(match.id, 1),
                    onHomeDecrement: () => setHome(match.id, -1),
                    onAwayIncrement: () => setAway(match.id, 1),
                    onAwayDecrement: () => setAway(match.id, -1)
                  }}
                />
              );
            }

            return <MatchCard key={match.id} {...match} />;
          })}
        </div>
      </section>
    </AppShell>
  );
}
