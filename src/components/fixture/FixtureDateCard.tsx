import { Shield } from "lucide-react";
import type { FixtureDateCard as FixtureDateCardType, FixtureMatchRow } from "@/lib/types";

interface FixtureDateCardProps {
  card: FixtureDateCardType;
}

const toneClassMap: Record<FixtureMatchRow["tone"], string> = {
  final: "text-[#9ca3af]",
  live: "text-[#b7cf92]",
  upcoming: "text-[var(--text-primary)]",
  warning: "text-[#facc15]"
};

export function FixtureDateCard({ card }: FixtureDateCardProps) {
  const isLiveAccent = card.accent === "live";

  return (
    <article
      className={`w-full rounded-md border px-2 pt-[6px] pb-[14px] ${
        isLiveAccent ? "border-[#324429] bg-[#0b0d09]" : "border-[#4c4c55] bg-[#0b0b0d]"
      }`}
    >
      <div className="flex flex-col gap-3">
        <h3 className="text-[13px] font-bold text-[#d8dbe3]">{card.dateLabel}</h3>

        {card.rows.map((row, index) => (
          <div key={`${row.home}-${row.away}`}>
            <div className="flex items-center justify-between py-2">
              <div className="flex w-[160px] items-center gap-2">
                <Shield size={16} strokeWidth={1.9} className="text-[var(--border-light)]" />
                <span className="text-xs font-semibold text-[var(--text-primary)]">{row.home}</span>
              </div>

              <span className={`font-mono text-[11px] font-bold tracking-[0px] ${toneClassMap[row.tone]}`}>
                {row.scoreLabel}
              </span>

              <div className="flex w-[160px] items-center justify-end gap-2">
                <span className="text-xs font-semibold text-[var(--text-primary)]">{row.away}</span>
                <Shield size={16} strokeWidth={1.9} className="text-[var(--border-light)]" />
              </div>
            </div>

            {index < card.rows.length - 1 ? <div className="h-px w-full bg-[#2a2e35]" /> : null}
          </div>
        ))}
      </div>
    </article>
  );
}
