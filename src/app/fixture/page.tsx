"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { TopHeader } from "@/components/layout/TopHeader";
import { LeagueSelector } from "@/components/home/LeagueSelector";
import { FixtureDateCard } from "@/components/fixture/FixtureDateCard";
import { currentLeagueLabel } from "@/lib/mock-data";
import type { FixtureDateCard as FixtureDateCardType, FixturePayload, MatchPeriod } from "@/lib/types";

const periods: MatchPeriod[] = ["fecha14", "fecha15"];

export default function FixturePage() {
  const [periodIndex, setPeriodIndex] = useState(0);
  const [periodLabel, setPeriodLabel] = useState("Fecha 14");
  const [cards, setCards] = useState<FixtureDateCardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const period = periods[periodIndex];

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/fixture?period=${period}`, {
          method: "GET",
          cache: "no-store"
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as FixturePayload;

        if (!cancelled) {
          setPeriodLabel(payload.periodLabel);
          setCards(payload.cards);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : "No se pudo cargar el fixture.");
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

  return (
    <AppShell activeTab="fixture">
      <TopHeader title="Fixture" userLabel="USER" />
      <LeagueSelector label={currentLeagueLabel} />

      <section className="flex flex-col gap-3 px-5 pt-[10px]">
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

        <div className={`space-y-[10px] transition-opacity ${loading ? "opacity-70" : "opacity-100"}`}>
          {cards.map((card) => (
            <FixtureDateCard key={card.dateLabel} card={card} />
          ))}
        </div>

        {error ? <p className="text-[11px] font-medium text-red-400">{error}</p> : null}
      </section>
    </AppShell>
  );
}
