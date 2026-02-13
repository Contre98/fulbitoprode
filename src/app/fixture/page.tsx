import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { TopHeader } from "@/components/layout/TopHeader";
import { LeagueSelector } from "@/components/home/LeagueSelector";
import { FixtureDateCard } from "@/components/fixture/FixtureDateCard";
import { fixtureDateCards } from "@/lib/mock-data";

export default function FixturePage() {
  return (
    <AppShell activeTab="fixture">
      <TopHeader title="Fixture" userLabel="USER" />
      <LeagueSelector label="Liga Argentina" />

      <section className="flex flex-col gap-3 px-5 pt-[10px]">
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

        <div className="space-y-[10px]">
          {fixtureDateCards.map((card) => (
            <FixtureDateCard key={card.dateLabel} card={card} />
          ))}
        </div>
      </section>
    </AppShell>
  );
}
