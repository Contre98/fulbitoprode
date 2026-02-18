"use client";

import { Crown, ShieldCheck, Trophy } from "lucide-react";
import type { GroupCard } from "@/lib/types";

interface GroupCardCarouselProps {
  cards: GroupCard[];
  activeGroupId: string | null;
  onActiveCardChange: (groupId: string) => void;
}

export function GroupCardCarousel({ cards, activeGroupId, onActiveCardChange }: GroupCardCarouselProps) {
  if (cards.length === 0) {
    return null;
  }

  return (
    <section className="px-4 pb-3 pt-3">
      <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
        {cards.map((card) => {
          const selected = activeGroupId === card.id;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onActiveCardChange(card.id)}
              className={`w-[296px] shrink-0 snap-center rounded-3xl border p-4 text-left transition-all duration-200 ${
                selected
                  ? "border-[var(--accent-primary)] bg-[linear-gradient(160deg,var(--bg-surface-2)_0%,var(--bg-surface-1)_70%)]"
                  : "border-[var(--border-subtle)] bg-[var(--bg-surface-1)]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[1.2px] text-[var(--text-secondary)]">{card.subtitle}</p>
                  <p className="mt-1 truncate text-[17px] font-bold text-[var(--text-primary)]">{card.title}</p>
                </div>
                <span
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border ${
                    selected
                      ? "border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--accent-primary)]"
                      : "border-[var(--border-subtle)] bg-[var(--bg-surface-2)] text-[var(--text-secondary)]"
                  }`}
                >
                  {selected ? <Crown size={16} /> : <ShieldCheck size={16} />}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-2)] p-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[1px] text-[var(--text-secondary)]">Ranking</p>
                  <p className="text-[30px] leading-none font-black tracking-tighter text-[var(--text-primary)]">{card.rank}</p>
                  {card.rankDelta ? <p className="text-[10px] font-semibold text-[var(--success)]">{card.rankDelta}</p> : null}
                </div>
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-2)] p-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[1px] text-[var(--text-secondary)]">Puntos</p>
                  <p className="text-[30px] leading-none font-black tracking-tighter text-[var(--accent-primary)]">{card.points}</p>
                  <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
                    <Trophy size={11} />
                    Temporada
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
