"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bell, Moon, Settings, Sun, Trophy } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SkeletonBlock } from "@/components/ui/SkeletonBlock";
import { trackClientEvent } from "@/lib/observability";
import { useAuthSession } from "@/lib/use-auth-session";
import { useTheme } from "@/lib/use-theme";
import type { NotificationItem, NotificationPreferences } from "@/lib/types";

function initialsFromLabel(label: string) {
  const chunks = label
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk.charAt(0).toUpperCase());

  return chunks.length > 0 ? chunks.join("") : "FC";
}

function relativeTimeLabel(iso: string) {
  const timestamp = new Date(iso).getTime();
  if (!Number.isFinite(timestamp)) {
    return "Reciente";
  }

  const delta = Date.now() - timestamp;
  if (delta < 60_000) return "Ahora";
  if (delta < 3_600_000) return `Hace ${Math.max(1, Math.floor(delta / 60_000))}m`;
  if (delta < 86_400_000) return `Hace ${Math.max(1, Math.floor(delta / 3_600_000))}h`;
  return `Hace ${Math.max(1, Math.floor(delta / 86_400_000))}d`;
}

export default function NotificacionesPageClient() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuthSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"reminders" | "results" | "social" | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const unreadCount = useMemo(() => items.filter((item) => !item.read).length, [items]);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [preferencesResponse, inboxResponse] = await Promise.all([
        fetch("/api/notifications/preferences", { method: "GET", cache: "no-store" }),
        fetch("/api/notifications/inbox", { method: "GET", cache: "no-store" })
      ]);

      if (!preferencesResponse.ok || !inboxResponse.ok) {
        throw new Error("No se pudieron cargar las notificaciones.");
      }

      const [preferencesPayload, inboxPayload] = (await Promise.all([
        preferencesResponse.json(),
        inboxResponse.json()
      ])) as [NotificationPreferences, { items: NotificationItem[] }];

      setPreferences(preferencesPayload);
      setItems(inboxPayload.items || []);
      trackClientEvent("notifications.page.loaded", {
        items: (inboxPayload.items || []).length
      });
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "No se pudieron cargar las notificaciones.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  async function togglePreference(key: "reminders" | "results" | "social") {
    if (!preferences) {
      return;
    }
    setSaving(key);
    try {
      const response = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          [key]: !preferences[key]
        })
      });
      if (!response.ok) {
        throw new Error("No se pudo guardar la preferencia.");
      }
      const payload = (await response.json()) as NotificationPreferences;
      setPreferences(payload);
      trackClientEvent("notifications.preference.updated", {
        key,
        enabled: payload[key]
      });
    } finally {
      setSaving(null);
    }
  }

  async function markAllRead() {
    setError(null);
    const response = await fetch("/api/notifications/inbox", {
      method: "POST"
    });
    if (!response.ok) {
      setError("No se pudieron actualizar las notificaciones.");
      return;
    }
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));
    trackClientEvent("notifications.mark-all-read");
  }

  return (
    <AppShell activeTab={null} showTopGlow={false}>
      <div className="min-h-full bg-[var(--surface-card-muted)]">
        <header className="sticky top-0 z-10 rounded-b-3xl bg-[var(--surface-card)] px-5 pt-12 pb-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-[var(--bg-surface-2)] p-1.5 text-[var(--accent-primary)] shadow-sm">
                <Trophy size={18} strokeWidth={2.5} />
              </div>
              <h1 className="text-xl font-black uppercase tracking-tighter text-[var(--text-primary)]">
                <span className="italic">Fulbito</span>
                <span className="text-[var(--accent-primary)]">Prode</span>
              </h1>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="rounded-full bg-[var(--surface-card-muted)] p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-card-muted)]"
                aria-label="Cambiar tema"
              >
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <Link href="/configuracion/ajustes" className="rounded-full bg-[var(--surface-card-muted)] p-2 text-[var(--text-secondary)]" aria-label="Configuración">
                <Settings size={18} />
              </Link>
              <Link href="/perfil" className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-bold text-[var(--accent-primary)]" aria-label="Perfil">
                {initialsFromLabel(user?.name || "FC")}
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-[var(--accent-primary)] p-1.5 text-[var(--text-on-accent)]">
              <Bell size={18} />
            </div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Notificaciones</h2>
            <span className="ml-auto text-sm font-medium text-[var(--text-muted)]">{unreadCount} sin leer</span>
          </div>
        </header>

        <main className="mt-6 space-y-4 px-4 pb-6 no-scrollbar">
          <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">Preferencias</h3>
            </div>
            {loading ? (
              <SkeletonBlock className="h-24 w-full rounded-xl" />
            ) : preferences ? (
              <div className="space-y-2">
                {([
                  ["reminders", "Recordatorios de cierre"],
                  ["results", "Resultados publicados"],
                  ["social", "Actividad social"]
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => void togglePreference(key)}
                    disabled={saving === key}
                    className="flex w-full items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card-muted)] px-3 py-3 text-left text-sm font-bold text-[var(--text-primary)]"
                  >
                    <span>{label}</span>
                    <span className="text-xs uppercase text-[var(--text-muted)]">{preferences[key] ? "ON" : "OFF"}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--danger)]">No se pudieron cargar las preferencias.</p>
            )}
          </section>

          <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">Bandeja</h3>
              <button type="button" onClick={() => void markAllRead()} className="rounded-lg bg-[var(--accent-soft)] px-3 py-1.5 text-[11px] font-bold text-[var(--accent-primary)]">
                Marcar todo leído
              </button>
            </div>

            {loading
              ? Array.from({ length: 3 }).map((_, index) => <SkeletonBlock key={`notif-skeleton-${index}`} className="mb-2 h-16 w-full rounded-xl" />)
              : null}

            {!loading && items.length === 0 ? <p className="text-sm text-[var(--text-muted)]">Todavía no hay notificaciones.</p> : null}

            {!loading ? (
              <div className="space-y-2">
                {items.map((item) => (
                  <article key={item.id} className={`rounded-xl border px-3 py-3 ${item.read ? "border-[var(--border-subtle)] bg-[var(--surface-card-muted)]" : "border-[var(--accent-primary)] bg-[var(--accent-soft)]"}`}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-black text-[var(--text-primary)]">{item.title}</p>
                      <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">{relativeTimeLabel(item.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">{item.body}</p>
                  </article>
                ))}
              </div>
            ) : null}
          </section>

          {error ? <p className="rounded-xl border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] px-3 py-2 text-xs font-medium text-[var(--danger)]">{error}</p> : null}
        </main>
      </div>
    </AppShell>
  );
}
