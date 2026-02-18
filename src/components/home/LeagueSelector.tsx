import { ChevronDown, Trophy } from "lucide-react";

interface LeagueSelectorProps {
  label: string;
  caption?: string;
}

export function LeagueSelector({ label, caption = "SELECCION ACTUAL" }: LeagueSelectorProps) {
  return (
    <section className="bg-[var(--bg-body)] pb-2">
      <div className="flex flex-col gap-2 px-5 pt-2 pb-[10px]">
        <div className="pl-[10px]">
          <p className="text-[10px] font-bold tracking-[0px] text-[var(--text-muted)]">{caption}</p>
        </div>
        <div className="h-[42px] rounded-[6px] border border-[var(--border-light)] bg-[var(--bg-surface)] px-[10px]">
          <div className="flex h-full items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Trophy size={16} strokeWidth={1.9} className="text-[var(--accent)]" />
              <span className="text-[12px] font-bold text-[#f4f4f5]">{label}</span>
            </div>
            <ChevronDown size={16} strokeWidth={1.9} className="text-[var(--text-secondary)]" />
          </div>
        </div>
      </div>
    </section>
  );
}
