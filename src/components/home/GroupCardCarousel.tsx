import { Briefcase, Crown, Ellipsis, Shield } from "lucide-react";
import type { GroupCard } from "@/lib/types";

interface GroupCardCarouselProps {
  cards: GroupCard[];
}

function GroupCardView({ card }: { card: GroupCard }) {
  const isPrimary = !!card.primary;

  return (
    <article
      className={`h-[170px] w-[290px] shrink-0 rounded-[20px] border border-[var(--border-dim)] p-5 ${
        isPrimary ? "opacity-100" : "opacity-80"
      }`}
      style={{
        background:
          "linear-gradient(215deg, rgba(24,24,27,1) 0%, rgba(0,0,0,1) 100%)"
      }}
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
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold tracking-[0.8px] text-[var(--text-muted)]">{card.subtitle}</p>
              <p className={`text-[15px] font-bold ${isPrimary ? "text-white" : "text-zinc-300"}`}>{card.title}</p>
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

export function GroupCardCarousel({ cards }: GroupCardCarouselProps) {
  return (
    <section className="px-5 py-[10px]">
      <div className="no-scrollbar flex gap-4 overflow-x-auto pr-20">
        {cards.map((card) => (
          <GroupCardView key={card.id} card={card} />
        ))}
      </div>
    </section>
  );
}
