import { Bell, Sun, UserRound } from "lucide-react";

interface TopHeaderProps {
  title: string;
  userLabel?: string;
}

export function TopHeader({ title, userLabel = "USER" }: TopHeaderProps) {
  return (
    <header className="flex items-center justify-between px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-light)] bg-[var(--bg-surface-elevated)]">
          <UserRound size={20} className="text-[var(--text-muted)]" strokeWidth={1.9} />
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-[10px] font-semibold tracking-[1.5px] text-[var(--text-secondary)]">{userLabel}</p>
          <h1 className="text-[20px] font-bold leading-none text-white">{title}</h1>
        </div>
      </div>

      <div className="flex items-center gap-3 pr-[12px] text-[var(--text-secondary)]">
        <button type="button" aria-label="Cambiar tema" className="transition-opacity hover:opacity-90">
          <Sun size={20} strokeWidth={1.9} />
        </button>
        <button type="button" aria-label="Notificaciones" className="transition-opacity hover:opacity-90">
          <Bell size={20} strokeWidth={1.9} />
        </button>
      </div>
    </header>
  );
}
