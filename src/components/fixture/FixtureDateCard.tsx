import Image from "next/image";
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

function TeamLogo({ logoUrl, teamName }: { logoUrl?: string; teamName: string }) {
  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt={`${teamName} logo`}
        width={20}
        height={20}
        unoptimized
        className="h-5 w-5 object-contain"
      />
    );
  }

  return <Shield size={16} strokeWidth={1.9} className="text-[var(--border-light)]" />;
}

export function FixtureDateCard({ card }: FixtureDateCardProps) {
  const isLiveAccent = card.accent === "live";

  return (
    <article
      className={`w-full rounded-[6px] border px-2 pt-[6px] pb-[14px] ${
        isLiveAccent ? "border-[#324429] bg-[#0b0d09]" : "border-[#4c4c55] bg-[#0b0b0d]"
      }`}
    >
      <div className="flex flex-col gap-3">
        <h3 className="text-[13px] font-bold text-[#d8dbe3]">{card.dateLabel}</h3>

        {card.rows.map((row, index) => (
          <div key={`${row.home}-${row.away}`}>
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <TeamLogo logoUrl={row.homeLogoUrl} teamName={row.home} />
                <span className="truncate text-xs font-semibold text-[var(--text-primary)]">{row.home}</span>
              </div>

              <span className={`px-1 text-center font-mono text-[11px] font-bold tracking-[0px] ${toneClassMap[row.tone]}`}>
                {row.scoreLabel}
              </span>

              <div className="flex min-w-0 items-center justify-end gap-2">
                <span className="truncate text-xs font-semibold text-[var(--text-primary)]">{row.away}</span>
                <TeamLogo logoUrl={row.awayLogoUrl} teamName={row.away} />
              </div>
            </div>

            {index < card.rows.length - 1 ? <div className="h-px w-full bg-[#2a2e35]" /> : null}
          </div>
        ))}
      </div>
    </article>
  );
}
