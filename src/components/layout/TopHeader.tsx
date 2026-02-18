"use client";

import type { ReactNode } from "react";
import { Bell, Moon, Sun, UserRound } from "lucide-react";
import { useTheme } from "@/lib/use-theme";

interface TopHeaderProps {
  title: string;
  userLabel?: string;
  subtitle?: string;
  rightSlot?: ReactNode;
}

function initialsFromLabel(label: string) {
  const chunks = label
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk.charAt(0).toUpperCase());

  return chunks.length > 0 ? chunks.join("") : "U";
}

export function TopHeader({ title, userLabel = "USER", subtitle, rightSlot }: TopHeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const initials = initialsFromLabel(userLabel);

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border-subtle)] bg-[color:var(--bg-app)]/95 px-4 pb-3 pt-4 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[color:var(--bg-surface-2)]">
            <span className="text-[16px] font-bold tracking-[0.6px] text-[var(--text-primary)]">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="truncate text-[10px] font-semibold uppercase tracking-[1.2px] text-[var(--text-secondary)]">{userLabel}</p>
            <h1 className="truncate text-[22px] font-black leading-none text-[var(--text-primary)]">{title}</h1>
            {subtitle ? <p className="mt-1 text-[11px] text-[var(--text-secondary)]">{subtitle}</p> : null}
          </div>
        </div>

        {rightSlot ? (
          <div className="flex items-center gap-2">{rightSlot}</div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Cambiar tema"
              onClick={toggleTheme}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[color:var(--bg-surface-2)] text-[var(--text-primary)]"
            >
              {theme === "dark" ? <Sun size={17} strokeWidth={2} /> : <Moon size={17} strokeWidth={2} />}
            </button>
            <button
              type="button"
              aria-label="Notificaciones"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[color:var(--bg-surface-2)] text-[var(--text-primary)]"
            >
              <Bell size={17} strokeWidth={2} />
            </button>
            <button
              type="button"
              aria-label="Perfil"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[color:var(--bg-surface-2)] text-[var(--text-secondary)]"
            >
              <UserRound size={17} strokeWidth={2} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
