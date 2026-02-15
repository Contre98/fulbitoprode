"use client";

import { useEffect, useMemo, useRef } from "react";
import { Briefcase, Crown, Ellipsis, Shield } from "lucide-react";
import type { GroupCard } from "@/lib/types";

interface GroupCardCarouselProps {
  cards: GroupCard[];
  activeGroupId: string | null;
  onActiveCardChange: (groupId: string) => void;
}

function GroupCardView({ card, isSelected }: { card: GroupCard; isSelected: boolean }) {
  const isPrimary = isSelected;

  return (
    <article
      className={`h-[170px] w-[290px] shrink-0 snap-center rounded-[6px] border border-[var(--border-dim)] p-5 transition-all ${
        isPrimary ? "opacity-100" : "opacity-80"
      }`}
      style={{
        background:
          "linear-gradient(215deg, rgba(24,24,27,1) 0%, rgba(0,0,0,1) 100%)"
      }}
      data-group-id={card.id}
    >
      <div className="flex h-full flex-col justify-between">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative h-9 w-9">
              {isPrimary ? (
                <>
                  <span className="absolute inset-0 rounded-full bg-[var(--accent)]" />
                  <Crown size={18} className="absolute left-[9px] top-[9px] text-black" />
                </>
              ) : (
                <>
                  <span className="absolute inset-0 rounded-full border border-[var(--border-light)] bg-[var(--bg-surface-elevated)]" />
                  <Briefcase size={18} className="absolute left-[9px] top-[9px] text-white" />
                </>
              )}
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="truncate text-[10px] font-bold tracking-[0.8px] text-[var(--text-muted)]">{card.subtitle}</p>
              <p className={`truncate text-[15px] font-bold ${isPrimary ? "text-white" : "text-zinc-300"}`}>{card.title}</p>
            </div>
          </div>
          {isPrimary ? <Ellipsis size={18} className="text-[var(--text-tertiary)]" /> : <Shield size={18} className="text-transparent" />}
        </div>

        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold tracking-[1.2px] text-[var(--text-tertiary)]">RANKING</p>
            <div className="flex items-end gap-1">
              <p className={`font-mono text-[36px] leading-none tracking-[-1px] ${isPrimary ? "text-white" : "text-[var(--text-secondary)]"}`}>
                {card.rank}
              </p>
              {card.rankDelta ? <p className="pb-1 text-xs font-medium text-[var(--accent)]">{card.rankDelta}</p> : null}
            </div>
          </div>

          <div className="space-y-1 text-right">
            <p className="text-[10px] font-bold tracking-[1.2px] text-[var(--text-tertiary)]">PUNTOS</p>
            <p
              className={`font-mono text-[30px] leading-none tracking-[-0.5px] ${isPrimary ? "text-[var(--accent)]" : "text-white"}`}
            >
              {card.points}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

export function GroupCardCarousel({ cards, activeGroupId, onActiveCardChange }: GroupCardCarouselProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const visibleById = useRef(new Map<string, number>());

  const resolvedActiveId = useMemo(() => activeGroupId || cards[0]?.id || null, [activeGroupId, cards]);

  useEffect(() => {
    if (!wrapperRef.current || cards.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const groupId = (entry.target as HTMLElement).dataset.groupId;
          if (!groupId) return;
          visibleById.current.set(groupId, entry.intersectionRatio);
        });

        const winner = [...visibleById.current.entries()].sort((a, b) => b[1] - a[1])[0];
        if (winner && winner[1] >= 0.55) {
          onActiveCardChange(winner[0]);
        }
      },
      {
        root: wrapperRef.current,
        threshold: [0.2, 0.4, 0.55, 0.75, 0.95]
      }
    );

    const targets = [...wrapperRef.current.querySelectorAll("[data-group-id]")];
    targets.forEach((target) => observer.observe(target));

    return () => {
      observer.disconnect();
    };
  }, [cards, onActiveCardChange]);

  return (
    <section className="px-5 py-[10px]">
      <div ref={wrapperRef} className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto pr-20 [scroll-behavior:smooth]">
        {cards.map((card) => (
          <GroupCardView key={card.id} card={card} isSelected={resolvedActiveId === card.id} />
        ))}
      </div>
    </section>
  );
}
