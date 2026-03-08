"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  LogOut,
  Moon,
  Settings,
  Sun,
  Trophy,
  User
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuthSession } from "@/lib/use-auth-session";
import { useTheme } from "@/lib/use-theme";

function initialsFromLabel(label: string) {
  const chunks = label
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk.charAt(0).toUpperCase());

  return chunks.length > 0 ? chunks.join("") : "FC";
}

function dataImageFromCandidate(candidate: unknown) {
  if (typeof candidate !== "string") {
    return null;
  }
  const trimmed = candidate.trim();
  if (!trimmed.startsWith("data:image/")) {
    return null;
  }
  return trimmed;
}

function resolveLogoDataUrl(source: unknown) {
  if (!source || typeof source !== "object") return null;
  const candidate = source as {
    groupLogoDataUrl?: unknown;
    competitionLogoDataUrl?: unknown;
    teamLogoDataUrl?: unknown;
    logoDataUrl?: unknown;
    avatarDataUrl?: unknown;
  };
  return (
    dataImageFromCandidate(candidate.groupLogoDataUrl) ||
    dataImageFromCandidate(candidate.competitionLogoDataUrl) ||
    dataImageFromCandidate(candidate.teamLogoDataUrl) ||
    dataImageFromCandidate(candidate.logoDataUrl) ||
    dataImageFromCandidate(candidate.avatarDataUrl)
  );
}

export default function ConfiguracionAjustesPageClient() {
  const router = useRouter();
  const { showToast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const { loading, authenticated, user, memberships, activeGroupId, refresh } = useAuthSession();
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!loading && !authenticated) {
      router.replace("/auth");
    }
  }, [loading, authenticated, router]);

  const profileBadgeLabel = useMemo(() => initialsFromLabel(user?.name || "FC"), [user?.name]);

  const profileBadgeLogo = useMemo(() => {
    const activeMembership = memberships.find((membership) => membership.groupId === activeGroupId) || memberships[0];
    return resolveLogoDataUrl(activeMembership || null);
  }, [memberships, activeGroupId]);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      await refresh();
      router.replace("/auth");
    } catch {
      setLoggingOut(false);
      showToast({ title: "No se pudo cerrar sesión", tone: "error" });
    }
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
              <Link
                href="/notificaciones"
                className="relative rounded-full bg-[var(--surface-card-muted)] p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-card-muted)]"
                aria-label="Notificaciones"
              >
                <Bell size={18} />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full border border-[var(--surface-card)] bg-[var(--danger)]" />
              </Link>
              <button type="button" className="rounded-full bg-[var(--surface-card-muted)] p-2 text-[var(--text-secondary)]" aria-label="Configuración">
                <Settings size={18} />
              </button>
              <button
                type="button"
                onClick={() => router.push("/perfil")}
                className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[var(--accent-soft)] text-sm font-bold text-[var(--accent-primary)]"
                aria-label="Perfil"
              >
                {profileBadgeLogo ? (
                  <img src={profileBadgeLogo} alt="Logo de perfil" className="h-[75%] w-[75%] object-contain" />
                ) : (
                  profileBadgeLabel
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-[var(--accent-primary)] p-1.5 text-[var(--text-on-accent)]">
              <Settings size={18} />
            </div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Configuración</h2>
            <span className="ml-auto text-sm font-medium text-[var(--text-muted)]">Ajustes de la cuenta</span>
          </div>
        </header>

        <main className="mt-6 no-scrollbar">
          <div className="space-y-6 px-4 pb-6 no-scrollbar">
            <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 shadow-sm">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">Cuenta</h3>
              <div className="space-y-4">
                <Link href="/perfil" className="group flex w-full items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-[var(--surface-card-muted)] p-2 text-[var(--text-secondary)] transition-colors group-hover:bg-[var(--surface-card-muted)]">
                      <User size={18} />
                    </div>
                    <span className="text-sm font-bold text-[var(--text-primary)]">Mi Perfil</span>
                  </div>
                  <span className="text-xs font-bold text-[var(--text-muted)]">Editar</span>
                </Link>
              </div>
            </section>

            <button
              type="button"
              onClick={() => void logout()}
              disabled={loggingOut}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--status-danger-bg)] py-5 font-bold text-[var(--danger)] transition-colors hover:bg-[var(--status-danger-bg)] disabled:opacity-60"
            >
              <LogOut size={18} /> {loggingOut ? "Cerrando..." : "Cerrar Sesión"}
            </button>

            <div className="mt-4 text-center">
              <p className="text-[10px] font-bold text-[var(--text-muted)]">Fulbito Prode v1.0.2</p>
            </div>
          </div>
        </main>
      </div>
    </AppShell>
  );
}
