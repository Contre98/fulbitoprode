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
      <section className="px-4 pt-2">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-1)] p-2.5">
          <p className="mb-1.5 text-[10px] font-semibold tracking-[1.1px] text-[var(--text-secondary)]">{caption}</p>
          <div className="flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-2)] px-3 text-[13px] font-semibold text-[var(--text-secondary)]">
            <Trophy size={15} />
            Sin grupo activo
          </div>
        </div>
      </section>
    );
  }

  const selected = options.find((option) => option.groupId === activeGroupId) || options[0];
  const value = selected?.groupId || options[0].groupId;

  return (
    <section className="px-4 pt-2">
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-1)] p-2.5">
        <p className="mb-1.5 text-[10px] font-semibold tracking-[1.1px] text-[var(--text-secondary)]">{caption}</p>
        <div className="relative rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-2)] px-3">
          <Trophy size={15} className="pointer-events-none absolute top-[14px] left-3 text-[var(--accent-primary)]" />
          <select
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="h-11 w-full appearance-none bg-transparent pl-6 pr-8 text-[13px] font-semibold text-[var(--text-primary)] outline-none"
            aria-label="Seleccion actual"
          >
            {options.map((option) => (
              <option key={option.groupId} value={option.groupId}>
                {option.leagueName} · {option.groupName}
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="pointer-events-none absolute top-[13px] right-3 text-[var(--text-secondary)]" />
        </div>
      </div>
    </section>
  );
}
