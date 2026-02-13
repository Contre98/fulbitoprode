import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { TopHeader } from "@/components/layout/TopHeader";
import { LeagueSelector } from "@/components/home/LeagueSelector";
import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";
import { currentLeagueLabel, leaderboardRows } from "@/lib/mock-data";

export default function PosicionesPage() {
  return (
    <AppShell activeTab="posiciones">
      <TopHeader title="Posiciones" userLabel="USER" />
      <LeagueSelector label={currentLeagueLabel} />

      <section className="flex flex-col gap-2.5 px-5 pt-[10px] pb-2">
        <header className="flex items-center justify-between">
          <h2 className="text-[22px] font-extrabold text-white">Grupo Amigos</h2>
          <button className="flex items-center gap-1 rounded-full border border-[var(--border-dim)] px-[9px] py-[5px] text-[10px] font-semibold text-[var(--text-secondary)]">
            <RefreshCw size={12} />
            Actualizar
          </button>
        </header>

        <div className="flex items-center justify-between rounded-full border border-[var(--border-light)] bg-[var(--bg-surface)] px-3 py-[5px]">
          <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-[var(--border-dim)] bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)]">
            <ChevronLeft size={11} />
          </span>
          <span className="text-[11px] font-bold tracking-[0.2px] text-[var(--accent)]">Global acumulado</span>
          <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-[#334400] bg-[var(--bg-surface-elevated)] text-[var(--accent)]">
            <ChevronRight size={11} />
          </span>
        </div>

        <LeaderboardTable mode="posiciones" rows={leaderboardRows} />
      </section>
    </AppShell>
  );
}
