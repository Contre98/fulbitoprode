import { Star } from "lucide-react";
import type { LeaderboardMode, LeaderboardRow } from "@/lib/types";

interface LeaderboardTableProps {
  mode: LeaderboardMode;
  rows: LeaderboardRow[];
  groupLabel?: string;
  loading?: boolean;
  onModeChange?: (mode: LeaderboardMode) => void;
}

export function LeaderboardTable({
  mode,
  rows,
  groupLabel = "Liga amigos | Grupo A",
  loading = false,
  onModeChange
}: LeaderboardTableProps) {
  return (
    <section className={`flex flex-col gap-2.5 transition-opacity ${loading ? "opacity-70" : "opacity-100"}`}>
      <div className="overflow-hidden rounded-full border border-[var(--border-light)] bg-[var(--bg-surface-elevated)]">
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => onModeChange?.("posiciones")}
            className={`w-full px-3 py-1.5 text-[11px] font-bold ${
              mode === "posiciones" ? "bg-[var(--accent)] text-[var(--bg-body)]" : "text-[var(--text-secondary)]"
            }`}
          >
            POSICIONES
          </button>
          <button
            type="button"
            onClick={() => onModeChange?.("stats")}
            className={`w-full px-3 py-1.5 text-[11px] font-semibold ${
              mode === "stats" ? "bg-[var(--accent)] text-[var(--bg-body)]" : "text-[var(--text-secondary)]"
            }`}
          >
            STATS
          </button>
        </div>
      </div>

      <div className="h-[488px] overflow-hidden rounded-2xl border border-[#2a2a2e] bg-[var(--bg-body)] p-[15px_10px]">
        <div className="flex items-center justify-between px-[2px] pb-[2px]">
          <p className="text-[13px] font-bold text-[#f5f5f5]">{groupLabel}</p>
          <div className="flex w-[188px] gap-3">
            <span className="w-9 text-center font-mono text-[10px] font-semibold text-[var(--text-muted)]">Pred</span>
            <span className="w-20 text-center font-mono text-[10px] font-semibold text-[var(--text-muted)]">E/WD/N</span>
            <span className="w-[38px] text-center font-mono text-[10px] font-semibold text-[var(--text-muted)]">Pts</span>
          </div>
        </div>

        <div className="space-y-2">
          {rows.map((row, index) => {
            const isStripe = index % 2 === 0;
            return (
              <div key={row.rank} className="flex items-center justify-between rounded-[10px] px-[10px] py-2" style={{ backgroundColor: isStripe ? "#24242a" : "#202026" }}>
                <div className="flex items-center gap-2">
                  <span className="w-5 text-center font-mono text-[11px] font-bold text-[#d4d4d8]">{row.rank}</span>
                  <span className={`text-xs ${row.highlight ? "font-bold text-white" : "font-semibold text-[#d4d4d8]"}`}>
                    {row.name}
                  </span>
                  {row.highlight ? <Star size={12} data-testid="leaderboard-highlight-icon" className="text-amber-400" /> : null}
                </div>

                <div className="flex gap-3 text-center font-mono text-[11px] text-[#d4d4d8]">
                  <span className="w-9">{row.predictions}</span>
                  <span className="w-20">{row.record}</span>
                  <span className="w-[38px] font-semibold">{row.points}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="px-[2px] pt-[2px] text-[10px] font-medium text-[var(--text-muted)]">E: exacto  WD: ganador/empate  N: sin acierto</p>
    </section>
  );
}
