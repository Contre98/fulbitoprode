"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, AtSign, Bell, Edit3, Mail, Moon, Settings, Sun, Target, Trophy, User, Users, X } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SkeletonBlock } from "@/components/ui/SkeletonBlock";
import { useAuthSession } from "@/lib/use-auth-session";
import { useTheme } from "@/lib/use-theme";
import type { ProfileActivityItem, ProfilePayload } from "@/lib/types";

type ProfileMode = "perfil" | "stats";

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

function toRelativeDate(iso: string) {
  const timestamp = new Date(iso).getTime();
  if (!Number.isFinite(timestamp)) return "Reciente";

  const deltaMs = Date.now() - timestamp;
  if (deltaMs <= 0) return "Hoy";

  const hours = Math.floor(deltaMs / (60 * 60 * 1000));
  if (hours < 24) return `Hace ${Math.max(1, hours)}h`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Ayer";
  return `Hace ${days}d`;
}

interface ActivityRowViewModel {
  id: string;
  type: "prediction" | "group_join";
  label: string;
  date: string;
  points?: number;
}

export default function ProfilePageClient() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { loading, authenticated, user, memberships, activeGroupId, refresh } = useAuthSession();
  const [mode, setMode] = useState<ProfileMode>("perfil");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [stats, setStats] = useState({
    totalPoints: 0,
    accuracyPct: 0,
    groups: 0
  });
  const [recentActivity, setRecentActivity] = useState<ProfileActivityItem[]>([]);
  const [performance, setPerformance] = useState<ProfilePayload["performance"]>(null);
  const [achievements, setAchievements] = useState<NonNullable<ProfilePayload["achievements"]>>([]);
  const [rankHistory, setRankHistory] = useState<NonNullable<ProfilePayload["rankHistory"]>>([]);

  useEffect(() => {
    if (!loading && !authenticated) {
      router.replace("/auth");
    }
  }, [loading, authenticated, router]);

  const activeMembership = useMemo(
    () => memberships.find((membership) => membership.groupId === activeGroupId) || memberships[0] || null,
    [memberships, activeGroupId]
  );

  const profileLogo = useMemo(() => resolveLogoDataUrl(activeMembership || null), [activeMembership]);
  const profileLabel = useMemo(() => initialsFromLabel(user?.name || "FC"), [user?.name]);

  const profileUsername = useMemo(() => {
    if (typeof user?.username === "string" && user.username.trim()) {
      return `@${user.username.trim().replace(/^@+/, "")}`;
    }
    if (user?.email && user.email.includes("@")) {
      return `@${user.email.split("@")[0].toLowerCase()}`;
    }
    return `@${(user?.name || "usuario").replace(/\s+/g, "").toLowerCase()}`;
  }, [user?.email, user?.name, user?.username]);

  useEffect(() => {
    setEditName(user?.name || "");
    setEditUsername(profileUsername.replace(/^@+/, ""));
    setEditEmail(user?.email || "");
  }, [profileUsername, user?.email, user?.name]);

  useEffect(() => {
    setStats((prev) => ({
      ...prev,
      groups: memberships.length
    }));
  }, [memberships.length]);

  useEffect(() => {
    if (loading || !authenticated) {
      return;
    }

    let cancelled = false;

    async function loadProfileData() {
      setLoadingData(true);

      try {
        const response = await fetch("/api/profile", {
          method: "GET",
          cache: "no-store"
        });
        if (!response.ok) {
          throw new Error(`Profile unavailable (${response.status})`);
        }

        const payload = (await response.json()) as ProfilePayload;
        if (cancelled) return;

        setStats({
          totalPoints: payload.stats.totalPoints,
          accuracyPct: payload.stats.accuracyPct,
          groups: payload.stats.groups
        });
        setRecentActivity(payload.recentActivity);
        setPerformance(payload.performance ?? null);
        setAchievements(payload.achievements ?? []);
        setRankHistory(payload.rankHistory ?? []);
      } catch {
        if (!cancelled) {
          setStats({
            totalPoints: 0,
            accuracyPct: 0,
            groups: memberships.length
          });
          setRecentActivity(
            memberships
              .map((membership) => ({
                id: `join:${membership.groupId}`,
                type: "group_join" as const,
                label: `Te uniste a ${membership.groupName}`,
                occurredAt: membership.joinedAt
              }))
              .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
              .slice(0, 3)
          );
          setPerformance(null);
          setAchievements([]);
          setRankHistory([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingData(false);
        }
      }
    }

    void loadProfileData();

    return () => {
      cancelled = true;
    };
  }, [loading, authenticated, memberships]);

  const activityRows = useMemo<ActivityRowViewModel[]>(
    () =>
      recentActivity.map((activity) => ({
        id: activity.id,
        type: activity.type,
        label: activity.label,
        date: toRelativeDate(activity.occurredAt),
        points: activity.points
      })).slice(0, 3),
    [recentActivity]
  );

  async function saveProfile() {
    setSavingProfile(true);
    try {
      const response = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: editName,
          username: editUsername,
          email: editEmail
        })
      });

      if (!response.ok) {
        throw new Error(`No se pudo guardar (${response.status})`);
      }

      await refresh();
      setIsEditModalOpen(false);
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <AppShell activeTab={null} showTopGlow={false}>
      <div className="min-h-full bg-[var(--surface-card-muted)]">
        <header className="px-5 pt-12 pb-6 bg-[var(--surface-card)] shadow-sm rounded-b-3xl z-20 sticky top-0">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <div className="bg-[var(--bg-surface-2)] p-1.5 rounded-lg text-[var(--accent-primary)] shadow-sm">
                <Trophy size={18} strokeWidth={2.5} />
              </div>
              <h1 className="text-xl font-black text-[var(--text-primary)] tracking-tighter uppercase">
                <span className="italic">Fulbito</span>
                <span className="text-[var(--accent-primary)]">Prode</span>
              </h1>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded-full bg-[var(--surface-card-muted)] hover:bg-[var(--surface-card-muted)] text-[var(--text-secondary)] transition-colors"
                aria-label="Cambiar tema"
              >
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <Link href="/notificaciones" className="p-2 rounded-full bg-[var(--surface-card-muted)] hover:bg-[var(--surface-card-muted)] text-[var(--text-secondary)] transition-colors relative" aria-label="Notificaciones">
                <Bell size={18} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-[var(--danger)] rounded-full border border-[var(--surface-card)]"></span>
              </Link>
              <Link href="/configuracion/ajustes" className="p-2 rounded-full bg-[var(--surface-card-muted)] hover:bg-[var(--surface-card-muted)] text-[var(--text-secondary)] transition-colors" aria-label="Configuración">
                <Settings size={18} />
              </Link>
              <button
                type="button"
                className="p-2 rounded-full bg-[var(--accent-soft)] text-[var(--accent-primary)] font-bold text-sm h-9 w-9 flex items-center justify-center overflow-hidden"
                aria-label="Perfil"
              >
                {profileLogo ? (
                  <img src={profileLogo} alt="Logo de perfil" className="h-[75%] w-[75%] object-contain" />
                ) : (
                  profileLabel
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setMode("perfil")} className="flex items-center gap-2">
              <div className="bg-[var(--accent-primary)] p-1.5 rounded-lg text-[var(--text-on-accent)]">
                <User size={18} />
              </div>
              <h2 className={`text-lg font-bold ${mode === "perfil" ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>Perfil</h2>
            </button>
            <button
              type="button"
              onClick={() => setMode("stats")}
              className={`text-sm font-medium ml-auto transition-colors ${mode === "stats" ? "text-[var(--text-secondary)]" : "text-[var(--text-muted)]"}`}
            >
              Actividad del perfil
            </button>
          </div>
        </header>

        <main className="mt-6 no-scrollbar">
          <div className="px-4 pb-6 space-y-6 no-scrollbar">
            {mode === "perfil" ? (
              <div className="bg-[var(--surface-card)] rounded-2xl p-6 shadow-sm border border-[var(--border-subtle)] flex flex-col items-center text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 h-20 w-full bg-gradient-to-r from-[var(--accent-soft)] to-[var(--accent-primary)] opacity-20"></div>
                <div className="absolute top-0 right-0 w-20 h-20 bg-[var(--accent-soft)] opacity-35"></div>
                <div className="relative z-0 mb-3">
                  <div className="w-24 h-24 bg-[var(--accent-soft)] text-[var(--accent-primary)] rounded-full flex items-center justify-center text-3xl font-black border-4 border-[var(--surface-card)] shadow-md overflow-hidden">
                    {profileLogo ? (
                      <img src={profileLogo} alt="Avatar de perfil" className="h-[76%] w-[76%] object-contain" />
                    ) : (
                      profileLabel
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--surface-card)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] shadow-sm transition-colors hover:bg-[var(--surface-card-muted)]"
                    aria-label="Editar avatar"
                  >
                    <Edit3 size={13} />
                  </button>
                </div>
                <h2 className="text-xl font-black text-[var(--text-primary)]">{user?.name || "Facundo Contreras"}</h2>
                <p className="text-sm text-[var(--text-muted)] font-medium mb-4">{profileUsername}</p>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="px-6 py-2 bg-[var(--bg-surface-2)] text-[var(--text-primary)] !text-[var(--text-primary)] text-xs font-bold rounded-full shadow-sm hover:bg-[var(--bg-surface-2)] transition-colors"
                >
                  Editar Perfil
                </button>
              </div>
            ) : (
              <div className="bg-[var(--surface-card)] rounded-2xl p-6 shadow-sm border border-[var(--border-subtle)] flex flex-col items-center justify-center text-center min-h-[106px]">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="px-6 py-2 bg-[var(--bg-surface-2)] text-[var(--text-primary)] !text-[var(--text-primary)] text-xs font-bold rounded-full shadow-sm hover:bg-[var(--bg-surface-2)] transition-colors"
                >
                  Editar Perfil
                </button>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[var(--surface-card)] p-4 rounded-2xl border border-[var(--border-subtle)] shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-[var(--text-muted)]">
                  <Trophy size={16} />
                  <span className="text-xs font-bold uppercase">Puntos</span>
                </div>
                {loadingData ? <SkeletonBlock className="h-8 w-24 rounded-md" /> : <p className="text-2xl font-black text-[var(--text-primary)]">{stats.totalPoints}</p>}
              </div>
              <div className="bg-[var(--surface-card)] p-4 rounded-2xl border border-[var(--border-subtle)] shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-[var(--text-muted)]">
                  <Target size={16} />
                  <span className="text-xs font-bold uppercase">Precisión</span>
                </div>
                {loadingData ? <SkeletonBlock className="h-8 w-20 rounded-md" /> : <p className="text-2xl font-black text-[var(--text-primary)]">{stats.accuracyPct}%</p>}
              </div>
              <div className="bg-[var(--surface-card)] p-4 rounded-2xl border border-[var(--border-subtle)] shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-[var(--text-muted)]">
                  <Users size={16} />
                  <span className="text-xs font-bold uppercase">Grupos</span>
                </div>
                {loadingData ? <SkeletonBlock className="h-8 w-12 rounded-md" /> : <p className="text-2xl font-black text-[var(--text-primary)]">{stats.groups}</p>}
              </div>
            </div>

            <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex justify-between items-center">
                <h3 className="font-bold text-[var(--text-primary)] text-sm">Actividad Reciente</h3>
              </div>
              <div className="divide-y divide-[var(--border-subtle)]">
                {loadingData
                  ? Array.from({ length: 3 }).map((_, index) => (
                      <div key={`activity-skeleton-${index}`} className="p-4">
                        <SkeletonBlock className="h-12 w-full rounded-lg" />
                      </div>
                    ))
                  : activityRows.map((activity) => (
                      <div key={activity.id} className="p-4 flex items-center gap-3 hover:bg-[var(--surface-card-muted)] transition-colors">
                        <div
                          className={`rounded-full p-2 ${
                            activity.type === "prediction"
                              ? "bg-[var(--surface-card-muted)] text-[var(--accent-primary)]"
                              : "bg-[var(--accent-soft)] text-[var(--accent-primary)]"
                          }`}
                        >
                          {activity.type === "prediction" ? <Activity size={16} /> : <Users size={16} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-[var(--text-primary)] truncate">{activity.label}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">{activity.date}</p>
                        </div>
                        {typeof activity.points === "number" ? <span className="text-xs font-bold text-[var(--accent-primary)]">+{activity.points} pts</span> : null}
                      </div>
                    ))}
                {!loadingData && activityRows.length === 0 ? (
                  <div className="p-4 text-xs text-[var(--text-muted)]">Sin actividad reciente por ahora.</div>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 shadow-sm">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Rendimiento</h3>
                {loadingData ? (
                  <SkeletonBlock className="mt-3 h-20 w-full rounded-lg" />
                ) : performance ? (
                  <div className="mt-3 space-y-2 text-xs font-medium text-[var(--text-secondary)]">
                    <p>Plenos: <span className="font-black text-[var(--text-primary)]">{performance.exactHitRatePct}%</span></p>
                    <p>Tendencia: <span className="font-black text-[var(--text-primary)]">{performance.outcomeHitRatePct}%</span></p>
                    <p>Fallos: <span className="font-black text-[var(--text-primary)]">{performance.misses}</span></p>
                    <p>Promedio: <span className="font-black text-[var(--text-primary)]">{performance.averagePointsPerRound}</span> pts/fecha</p>
                    <p>Racha: <span className="font-black text-[var(--text-primary)]">{performance.streak}</span></p>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-[var(--text-muted)]">Sin datos suficientes todavía.</p>
                )}
              </section>

              <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 shadow-sm">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Logros</h3>
                {loadingData ? (
                  <SkeletonBlock className="mt-3 h-20 w-full rounded-lg" />
                ) : achievements.length === 0 ? (
                  <p className="mt-3 text-xs text-[var(--text-muted)]">Aún no desbloqueaste logros.</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {achievements.slice(0, 4).map((achievement) => (
                      <div key={achievement.id} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card-muted)] px-3 py-2">
                        <p className="text-xs font-black text-[var(--text-primary)]">{achievement.title}</p>
                        <p className="text-[11px] text-[var(--text-secondary)]">{achievement.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 shadow-sm">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Evolución de ranking</h3>
              {loadingData ? (
                <SkeletonBlock className="mt-3 h-20 w-full rounded-lg" />
              ) : rankHistory.length === 0 ? (
                <p className="mt-3 text-xs text-[var(--text-muted)]">Todavía no hay evolución para mostrar.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {rankHistory.slice(-8).map((point) => (
                    <div key={`${point.period}-${point.rank}`} className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card-muted)] px-3 py-2">
                      <span className="text-xs font-bold text-[var(--text-primary)]">{point.periodLabel}</span>
                      <span className="text-xs font-black text-[var(--text-secondary)]">#{point.rank} · {point.points} pts</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      {isEditModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden no-scrollbar" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-[var(--surface-overlay)] backdrop-blur-[2px]"
            onClick={() => setIsEditModalOpen(false)}
            aria-label="Cerrar modal"
          />

          <section className="relative w-full max-w-[469px] rounded-t-[34px] bg-[var(--surface-card)] p-5 pt-4 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[86%] overflow-y-auto no-scrollbar">
            <div className="mx-auto mb-5 h-1.5 w-14 rounded-full bg-[var(--surface-card-muted)]" />

            <div className="mb-6 flex items-center justify-between">
              <p className="text-2xl font-black text-[var(--text-primary)]">Editar Perfil</p>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="h-10 w-10 rounded-full bg-[var(--surface-card-muted)] text-[var(--text-muted)] flex items-center justify-center"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-7 flex flex-col items-center">
              <div className="h-24 w-24 rounded-full border-[4px] border-[var(--surface-card)] bg-[var(--accent-soft)] text-[var(--accent-primary)] text-4xl font-black flex items-center justify-center shadow-md overflow-hidden">
                {profileLogo ? <img src={profileLogo} alt="Avatar de perfil" className="h-[76%] w-[76%] object-contain" /> : profileLabel}
              </div>
            </div>

            <div className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-[13px] font-bold text-[var(--text-secondary)]">Nombre Completo</span>
                <div className="h-14 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card-muted)] px-4 flex items-center gap-3">
                  <User size={20} className="text-[var(--text-muted)]" />
                  <input
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    maxLength={120}
                    className="w-full bg-transparent text-[17px] text-[var(--text-primary)] font-bold outline-none"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-[13px] font-bold text-[var(--text-secondary)]">Nombre de Usuario</span>
                <div className="h-14 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card-muted)] px-4 flex items-center gap-3">
                  <AtSign size={20} className="text-[var(--text-muted)]" />
                  <input
                    value={editUsername ? `@${editUsername}` : ""}
                    onChange={(event) => setEditUsername(event.target.value.replace(/^@+/, ""))}
                    maxLength={41}
                    className="w-full bg-transparent text-[17px] text-[var(--text-primary)] font-bold outline-none"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-[13px] font-bold text-[var(--text-secondary)]">Email</span>
                <div className="h-14 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card-muted)] px-4 flex items-center gap-3">
                  <Mail size={20} className="text-[var(--text-muted)]" />
                  <input
                    value={editEmail}
                    onChange={(event) => setEditEmail(event.target.value)}
                    maxLength={190}
                    className="w-full bg-transparent text-[17px] text-[var(--text-primary)] font-bold outline-none"
                  />
                </div>
              </label>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="h-14 rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-card)] text-lg leading-none text-[var(--text-secondary)] font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void saveProfile()}
                disabled={savingProfile}
                className="h-14 rounded-3xl bg-[var(--accent-primary)] text-lg leading-none text-[var(--text-on-accent)] font-black shadow-[0_10px_24px_rgba(163,230,53,0.35)] disabled:opacity-60"
              >
                {savingProfile ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}
