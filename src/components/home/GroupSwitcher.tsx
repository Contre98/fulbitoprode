"use client";

interface GroupOption {
  id: string;
  name: string;
  role: "owner" | "admin" | "member";
}

interface GroupSwitcherProps {
  options: GroupOption[];
  activeGroupId: string | null;
  onChange: (groupId: string) => void;
}

export function GroupSwitcher({ options, activeGroupId, onChange }: GroupSwitcherProps) {
  if (options.length === 0) {
    return null;
  }

  return (
    <section className="px-5 pb-2">
      <label className="mb-1 block text-[10px] font-bold text-[var(--text-muted)]">GRUPO ACTIVO</label>
      <select
        value={activeGroupId || options[0].id}
        onChange={(event) => onChange(event.target.value)}
        className="h-[38px] w-full rounded-[10px] border border-[var(--border-light)] bg-[var(--bg-surface)] px-3 text-[12px] font-semibold text-white outline-none"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name} · {option.role}
          </option>
        ))}
      </select>
    </section>
  );
}
