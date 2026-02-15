import { ChevronDown, Trophy } from "lucide-react";
import type { SelectionOption } from "@/lib/types";

interface CurrentSelectionSelectorProps {
  options: SelectionOption[];
  activeGroupId: string | null;
  onChange: (groupId: string) => void;
  caption?: string;
}

export function CurrentSelectionSelector({
  options,
  activeGroupId,
  onChange,
  caption = "SELECCION ACTUAL"
}: CurrentSelectionSelectorProps) {
  if (options.length === 0) {
    return (
      <section className="bg-[var(--bg-body)] pb-2">
        <div className="flex flex-col gap-2 px-5 pt-2 pb-[10px]">
          <p className="pl-[10px] text-[10px] font-bold tracking-[0px] text-[var(--text-muted)]">{caption}</p>
          <div className="h-[42px] rounded-[6px] border border-[var(--border-light)] bg-[var(--bg-surface)] px-[10px]">
            <div className="flex h-full items-center gap-2 text-[12px] font-semibold text-[var(--text-secondary)]">
              <Trophy size={16} strokeWidth={1.9} className="text-[var(--text-muted)]" />
              Sin grupo activo
            </div>
          </div>
        </div>
      </section>
    );
  }

  const selected = options.find((option) => option.groupId === activeGroupId) || options[0];
  const value = selected?.groupId || options[0].groupId;

  return (
    <section className="bg-[var(--bg-body)] pb-2">
      <div className="flex flex-col gap-2 px-5 pt-2 pb-[10px]">
        <p className="pl-[10px] text-[10px] font-bold tracking-[0px] text-[var(--text-muted)]">{caption}</p>
        <div className="relative h-[42px] rounded-[6px] border border-[var(--border-light)] bg-[var(--bg-surface)] px-[10px]">
          <Trophy size={16} strokeWidth={1.9} className="pointer-events-none absolute top-[12px] left-[10px] text-[var(--accent)]" />
          <select
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="h-full w-full appearance-none bg-transparent pl-6 pr-8 text-[12px] font-bold text-[#f4f4f5] outline-none"
            aria-label="Seleccion actual"
          >
            {options.map((option) => (
              <option key={option.groupId} value={option.groupId}>
                {option.leagueName} · {option.groupName}
              </option>
            ))}
          </select>
          <ChevronDown size={16} strokeWidth={1.9} className="pointer-events-none absolute top-[12px] right-[10px] text-[var(--text-secondary)]" />
        </div>
      </div>
    </section>
  );
}
