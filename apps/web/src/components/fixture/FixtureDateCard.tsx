import Image from "next/image";
import { Clock3, MapPin, Shield } from "lucide-react";
import type { FixtureDateCard as FixtureDateCardType, FixtureMatchRow } from "@/lib/types";

interface FixtureDateCardProps {
  card: FixtureDateCardType;
  onRowClick?: (row: FixtureMatchRow, context: { dateLabel: string }) => void;
}

const toneClassMap: Record<FixtureMatchRow["tone"], string> = {
  final: "text-[var(--text-secondary)]",
  live: "text-[var(--success)]",
  upcoming: "text-[var(--text-primary)]",
  warning: "text-[var(--warning)]"
};

function TeamLogo({ logoUrl, teamName }: { logoUrl?: string; teamName: string }) {
  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt={`${teamName} logo`}
        width={22}
        height={22}
        unoptimized
        className="h-[22px] w-[22px] object-contain"
      />
    );
  }

  return <Shield size={17} strokeWidth={1.8} className="text-[var(--text-secondary)]" />;
}

export function FixtureDateCard({ card, onRowClick }: FixtureDateCardProps) {
  const isLiveAccent = card.accent === "live";

  return (
    <article
      className={`w-full rounded-2xl border px-3 py-3 ${
        isLiveAccent
          ? "border-[rgba(116,226,122,0.35)] bg-[linear-gradient(155deg,rgba(116,226,122,0.1)_0%,var(--bg-surface-1)_56%)]"
          : "border-[var(--border-subtle)] bg-[var(--bg-surface-1)]"
      }`}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[13px] font-bold text-[var(--text-primary)]">{card.dateLabel}</h3>
          {isLiveAccent ? (
            <span className="inline-flex min-h-7 items-center gap-1 rounded-full border border-[rgba(116,226,122,0.36)] bg-[rgba(116,226,122,0.12)] px-2 text-[10px] font-semibold text-[var(--success)]">
              <Clock3 size={11} />
              En vivo
            </span>
          ) : null}
        </div>

        {card.rows.map((row, index) => {
          const interactive = Boolean(onRowClick);
          return (
            <div key={`${row.home}-${row.away}-${index}`}>
              {interactive ? (
                <button
                  type="button"
                  onClick={() => onRowClick?.(row, { dateLabel: card.dateLabel })}
                  className="grid min-h-12 w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-xl px-2 py-2 text-left active:bg-[var(--bg-surface-2)]"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <TeamLogo logoUrl={row.homeLogoUrl} teamName={row.home} />
                    <span className="truncate text-[12px] font-semibold text-[var(--text-primary)]">{row.home}</span>
                  </div>
                  <span className={`px-1 text-center text-[11px] font-black tracking-tighter ${toneClassMap[row.tone]}`}>{row.scoreLabel}</span>
                  <div className="flex min-w-0 items-center justify-end gap-2">
                    <span className="truncate text-[12px] font-semibold text-[var(--text-primary)]">{row.away}</span>
                    <TeamLogo logoUrl={row.awayLogoUrl} teamName={row.away} />
                  </div>
                </button>
              ) : (
                <div className="grid min-h-12 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-xl px-2 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <TeamLogo logoUrl={row.homeLogoUrl} teamName={row.home} />
                    <span className="truncate text-[12px] font-semibold text-[var(--text-primary)]">{row.home}</span>
                  </div>
                  <span className={`px-1 text-center text-[11px] font-black tracking-tighter ${toneClassMap[row.tone]}`}>{row.scoreLabel}</span>
                  <div className="flex min-w-0 items-center justify-end gap-2">
                    <span className="truncate text-[12px] font-semibold text-[var(--text-primary)]">{row.away}</span>
                    <TeamLogo logoUrl={row.awayLogoUrl} teamName={row.away} />
                  </div>
                </div>
              )}

              {(row.venue || row.kickoffAt) && !interactive ? (
                <p className="mt-1 inline-flex items-center gap-1 px-2 text-[10px] text-[var(--text-secondary)]">
                  <MapPin size={10} />
                  {row.venue || "Sede por confirmar"}
                </p>
              ) : null}

              {index < card.rows.length - 1 ? <div className="mx-2 h-px bg-[var(--border-subtle)]" /> : null}
            </div>
          );
        })}
      </div>
    </article>
  );
}
