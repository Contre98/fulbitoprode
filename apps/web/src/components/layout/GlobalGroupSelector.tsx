"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, ChevronDown, Plus, Settings2, X } from "lucide-react";
import type { Membership } from "@fulbito/domain";

function initialsFromLabel(label: string) {
  const chunks = label
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk.charAt(0).toUpperCase());

  return chunks.length > 0 ? chunks.join("") : "GR";
}

function competitionLabel(membership: Membership) {
  return membership.competitionName || membership.leagueName || "Competencia";
}

interface GlobalGroupSelectorProps {
  memberships: Membership[];
  activeGroupId: string | null;
  onSelectGroup: (groupId: string) => void;
}

export function GlobalGroupSelector({ memberships, activeGroupId, onSelectGroup }: GlobalGroupSelectorProps) {
  const [open, setOpen] = useState(false);

  const activeMembership = useMemo(
    () => memberships.find((membership) => membership.groupId === activeGroupId) || memberships[0] || null,
    [memberships, activeGroupId]
  );

  const triggerLabel = activeMembership ? activeMembership.groupName : "Sin grupo";
  const triggerDisabled = memberships.length === 0;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (!triggerDisabled) setOpen(true);
        }}
        disabled={triggerDisabled}
        className="inline-flex max-w-[180px] items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card-muted)] px-2.5 py-1.5 text-left text-[11px] font-bold text-[var(--text-primary)] disabled:opacity-60"
        aria-label="Seleccionar grupo"
      >
        <span className="truncate">{triggerLabel}</span>
        <ChevronDown size={14} className="flex-shrink-0 text-[var(--text-muted)]" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[120] flex items-end justify-center overflow-hidden no-scrollbar" role="dialog" aria-modal="true">
          <button type="button" onClick={() => setOpen(false)} className="absolute inset-0 bg-[var(--surface-overlay)] backdrop-blur-sm" aria-label="Cerrar selector" />

          <section className="relative max-h-[72%] w-full max-w-[469px] overflow-y-auto rounded-t-3xl bg-[var(--surface-card)] p-5 shadow-2xl no-scrollbar">
            <div className="mx-auto mb-5 h-1.5 w-14 rounded-full bg-[var(--surface-card-muted)]" />
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-black text-[var(--text-primary)]">Seleccionar Grupo</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-card-muted)] text-[var(--text-muted)]"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              {memberships.map((membership) => {
                const isActive = membership.groupId === (activeMembership?.groupId || null);
                return (
                  <button
                    key={membership.groupId}
                    type="button"
                    onClick={() => {
                      onSelectGroup(membership.groupId);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors ${
                      isActive
                        ? "border-[var(--accent-primary)] bg-[var(--accent-soft)]"
                        : "border-[var(--border-subtle)] bg-[var(--surface-card-muted)]"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                          isActive ? "bg-[var(--accent-soft)] text-[var(--accent-primary)]" : "bg-[var(--surface-card)] text-[var(--text-secondary)]"
                        }`}
                      >
                        {initialsFromLabel(membership.groupName)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[var(--text-primary)]">{membership.groupName}</p>
                        <p className="truncate text-[11px] text-[var(--text-secondary)]">{competitionLabel(membership)}</p>
                      </div>
                    </div>
                    {isActive ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent-primary)] text-[var(--text-on-accent)]">
                        <Check size={12} strokeWidth={3} />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <Link
                href="/configuracion"
                onClick={() => setOpen(false)}
                className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card-muted)] px-3 text-xs font-bold text-[var(--text-primary)]"
              >
                <Plus size={14} />
                Nuevo Grupo
              </Link>
              <Link
                href="/configuracion"
                onClick={() => setOpen(false)}
                className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card-muted)] px-3 text-xs font-bold text-[var(--text-primary)]"
              >
                <Settings2 size={14} />
                Administrar Grupos
              </Link>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
