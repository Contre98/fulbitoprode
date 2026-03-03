"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserRound } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { TopHeader } from "@/components/layout/TopHeader";
import { useAuthSession } from "@/lib/use-auth-session";
import { useToast } from "@/components/ui/ToastProvider";

export default function ConfiguracionPerfilPageClient() {
  const router = useRouter();
  const { showToast } = useToast();
  const { loading, authenticated, user, refresh } = useAuthSession();
  const [name, setName] = useState("");
  const [favoriteTeam, setFavoriteTeam] = useState("");
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !authenticated) {
      router.replace("/auth");
    }
  }, [loading, authenticated, router]);

  useEffect(() => {
    setName(user?.name || "");
    setFavoriteTeam(user?.favoriteTeam || "");
  }, [user?.name, user?.favoriteTeam]);

  const isDirty = useMemo(() => {
    return (user?.name || "") !== name || (user?.favoriteTeam || "") !== favoriteTeam;
  }, [favoriteTeam, name, user?.favoriteTeam, user?.name]);

  async function saveProfile() {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          favoriteTeam
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "No se pudo guardar el perfil.");
      }

      await refresh();
      showToast({ title: "Perfil actualizado", tone: "success" });
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Error al actualizar perfil.";
      setError(message);
      showToast({ title: "No se pudo guardar", description: message, tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    setLoggingOut(true);
    setError(null);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
      await refresh();
      router.replace("/auth");
    } catch {
      const message = "No se pudo cerrar sesión.";
      setError(message);
      setLoggingOut(false);
      showToast({ title: message, tone: "error" });
    }
  }

  return (
    <AppShell activeTab="configuracion">
      <TopHeader title="Perfil" userLabel={user?.name || "USUARIO"} subtitle="Identidad y preferencias" />

      <section className="flex flex-col gap-3 px-4 pt-2 pb-4">
        <Link
          href="/configuracion/ajustes"
          className="inline-flex min-h-11 w-fit items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-2)] px-3 text-[12px] font-semibold text-[var(--text-secondary)]"
        >
          <ArrowLeft size={14} />
          Volver
        </Link>

        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-1)] p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-2)]">
              <UserRound size={24} className="text-[var(--text-secondary)]" strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[18px] font-bold text-[var(--text-primary)]">{user?.name || "Jugador"}</p>
              <p className="truncate text-[13px] text-[var(--text-secondary)]">{user?.email || "-"}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-1)] p-4">
          <h2 className="text-[15px] font-bold text-[var(--text-primary)]">Datos y preferencias</h2>

          <div className="mt-3 flex flex-col gap-2.5">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Nombre completo</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={120}
                className="h-12 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-2)] px-3 text-[13px] font-semibold text-[var(--text-primary)] outline-none"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Email</span>
              <input
                value={user?.email || ""}
                readOnly
                className="h-12 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-2)] px-3 text-[13px] font-semibold text-[var(--text-secondary)] outline-none"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Equipo favorito</span>
              <input
                value={favoriteTeam}
                onChange={(event) => setFavoriteTeam(event.target.value)}
                maxLength={120}
                placeholder="Boca Juniors"
                className="h-12 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-2)] px-3 text-[13px] font-semibold text-[var(--text-primary)] outline-none"
              />
            </label>
          </div>

          <p className="mt-2 text-[11px] text-[var(--text-secondary)]">Tus cambios afectan la experiencia social dentro de tus grupos.</p>

          {error ? (
            <p className="mt-2 rounded-xl border border-[rgba(255,107,125,0.35)] bg-[rgba(255,107,125,0.12)] px-3 py-2 text-[11px] text-[var(--danger)]">
              {error}
            </p>
          ) : null}

          <div className="mt-4 grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => void saveProfile()}
              disabled={saving || loading || !isDirty}
              className="h-12 rounded-xl bg-[var(--accent-primary)] text-[14px] font-bold text-[var(--text-on-accent)] disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>

            <button
              type="button"
              onClick={() => void logout()}
              disabled={loggingOut}
              className="h-12 rounded-xl border border-[rgba(255,107,125,0.35)] bg-[rgba(255,107,125,0.1)] text-[14px] font-semibold text-[var(--danger)] disabled:opacity-60"
            >
              {loggingOut ? "Cerrando..." : "Cerrar sesión"}
            </button>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
