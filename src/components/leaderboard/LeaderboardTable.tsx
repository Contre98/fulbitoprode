import { ArrowDown, ArrowUp, Minus, Star } from "lucide-react";
import type { LeaderboardMode, LeaderboardRow } from "@/lib/types";

interface LeaderboardTableProps {
  mode: LeaderboardMode;
  rows: LeaderboardRow[];
  groupLabel?: string;
  loading?: boolean;
  onModeChange?: (mode: LeaderboardMode) => void;
}

function movement(deltaRank?: number) {
  if (deltaRank === undefined || deltaRank === 0) {
    return <Minus size={11} className="text-[var(--text-secondary)]" />;
  }

  if (deltaRank > 0) {
    return <ArrowUp size={11} className="text-[var(--success)]" />;
  }

  return <ArrowDown size={11} className="text-[var(--danger)]" />;
}

export function LeaderboardTable({
  mode,
  rows,
  groupLabel = "Liga amigos | Grupo A",
  loading = false,
  onModeChange
}: LeaderboardTableProps) {
  const topThree = rows.slice(0, 3);

  return (
    <section className={`flex flex-col gap-2.5 transition-opacity ${loading ? "opacity-70" : "opacity-100"}`}>
      <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-2)] p-1">
        <div className="grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => onModeChange?.("posiciones")}
            className={`min-h-11 rounded-xl px-3 text-[12px] font-bold ${
              mode === "posiciones" ? "bg-[var(--accent-primary)] text-[var(--text-on-accent)]" : "text-[var(--text-secondary)]"
            }`}
          >
            POSICIONES
          </button>
          <button
            type="button"
            onClick={() => onModeChange?.("stats")}
            className={`min-h-11 rounded-xl px-3 text-[12px] font-bold ${
              mode === "stats" ? "bg-[var(--accent-primary)] text-[var(--text-on-accent)]" : "text-[var(--text-secondary)]"
            }`}
          >
            STATS
          </button>
        </div>
      </div>

      {topThree.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {topThree.map((row) => (
            <article key={`podium-${row.rank}-${row.userId || row.name}`} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-1)] p-2.5">
              <p className="text-[28px] leading-none font-black tracking-tighter text-[var(--accent-primary)]">#{row.rank}</p>
              <p className="mt-1 truncate text-[11px] font-semibold text-[var(--text-primary)]">{row.name}</p>
              <p className="text-[11px] text-[var(--text-secondary)]">{row.points} pts</p>
            </article>
          ))}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-1)] p-3">
        <div className="flex items-center justify-between gap-2 pb-2">
          <p className="max-w-[55%] truncate text-[13px] font-bold text-[var(--text-primary)]">{groupLabel}</p>
          <div className="flex w-[188px] gap-3">
            <span className="w-9 text-center text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Pred</span>
            <span className="w-20 text-center text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">EX/RE/NA</span>
            <span className="w-[38px] text-center text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Pts</span>
          </div>
        </div>

        <div className="max-h-[440px] space-y-2 overflow-y-auto pr-0.5">
          {rows.map((row, index) => {
            const stripe = index % 2 === 0;
            return (
              <div
                key={`${row.rank}-${row.userId || row.name}`}
                className={`flex min-h-12 items-center justify-between rounded-xl border px-2.5 py-2 ${
                  row.highlight
                    ? "border-[var(--accent-primary)] bg-[var(--accent-soft)]"
                    : stripe
                      ? "border-[var(--border-subtle)] bg-[var(--bg-surface-2)]"
                      : "border-[var(--border-subtle)] bg-[var(--bg-surface-1)]"
                }`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="w-5 text-center text-[11px] font-black text-[var(--text-primary)]">{row.rank}</span>
                  <span className={`truncate text-[12px] ${row.highlight ? "font-bold text-[var(--text-primary)]" : "font-semibold text-[var(--text-primary)]"}`}>
                    {row.name}
                  </span>
                  {row.highlight ? <Star size={12} data-testid="leaderboard-highlight-icon" className="text-[var(--warning)]" /> : null}
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-1)]">
                    {movement(row.deltaRank)}
                  </span>
                </div>

                <div className="flex gap-3 text-center text-[11px] text-[var(--text-primary)]">
                  <span className="w-9">{row.predictions}</span>
                  <span className="w-20">{row.record}</span>
                  <span className="w-[38px] font-semibold">{row.points}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="px-[2px] pt-[2px] text-[10px] font-medium text-[var(--text-secondary)]">EX: exacto · RE: resultado · NA: sin acierto</p>
    </section>
  );
}
