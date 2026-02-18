"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, AtSign, Bell, Edit3, Mail, Moon, Settings, Target, Trophy, User, Users, X } from "lucide-react";
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
  const { toggleTheme } = useTheme();
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
      <div className="min-h-full bg-slate-100">
        <header className="px-5 pt-12 pb-6 bg-white shadow-sm rounded-b-3xl z-20 sticky top-0">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <div className="bg-slate-900 p-1.5 rounded-lg text-lime-400 shadow-sm">
                <Trophy size={18} strokeWidth={2.5} />
              </div>
              <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase">
                <span className="italic">Fulbito</span>
                <span className="text-lime-500">Prode</span>
              </h1>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                aria-label="Cambiar tema"
              >
                <Moon size={18} />
              </button>
              <button type="button" className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors relative" aria-label="Notificaciones">
                <Bell size={18} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
              </button>
              <Link href="/configuracion/ajustes" className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors" aria-label="Configuración">
                <Settings size={18} />
              </Link>
              <button
                type="button"
                className="p-2 rounded-full bg-lime-100 text-lime-700 font-bold text-sm h-9 w-9 flex items-center justify-center overflow-hidden"
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
              <div className="bg-lime-400 p-1.5 rounded-lg text-white">
                <User size={18} />
              </div>
              <h2 className={`text-lg font-bold ${mode === "perfil" ? "text-slate-800" : "text-slate-500"}`}>Perfil</h2>
            </button>
            <button
              type="button"
              onClick={() => setMode("stats")}
              className={`text-sm font-medium ml-auto transition-colors ${mode === "stats" ? "text-slate-600" : "text-slate-400"}`}
            >
              Estadísticas y actividad
            </button>
          </div>
        </header>

        <main className="mt-6 no-scrollbar">
          <div className="px-4 pb-6 space-y-6 no-scrollbar">
            {mode === "perfil" ? (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col items-center text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-r from-lime-200 to-lime-400 opacity-20"></div>
                <div className="absolute top-0 right-0 w-20 h-20 bg-lime-200 opacity-35"></div>
                <div className="relative z-0 mb-3">
                  <div className="w-24 h-24 bg-lime-100 text-lime-600 rounded-full flex items-center justify-center text-3xl font-black border-4 border-white shadow-md overflow-hidden">
                    {profileLogo ? (
                      <img src={profileLogo} alt="Avatar de perfil" className="h-[76%] w-[76%] object-contain" />
                    ) : (
                      profileLabel
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="absolute -bottom-1 -right-1 h-8 w-8 flex items-center justify-center bg-slate-800 text-white rounded-full border-2 border-white shadow-sm hover:bg-slate-700 transition-colors"
                    aria-label="Editar avatar"
                  >
                    <Edit3 size={13} />
                  </button>
                </div>
                <h2 className="text-xl font-black text-slate-800">{user?.name || "Facundo Contreras"}</h2>
                <p className="text-sm text-slate-400 font-medium mb-4">{profileUsername}</p>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="px-6 py-2 bg-slate-900 text-white !text-white text-xs font-bold rounded-full shadow-sm hover:bg-slate-800 transition-colors"
                >
                  Editar Perfil
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center min-h-[106px]">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="px-6 py-2 bg-slate-900 text-white !text-white text-xs font-bold rounded-full shadow-sm hover:bg-slate-800 transition-colors"
                >
                  Editar Perfil
                </button>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-slate-400">
                  <Trophy size={16} />
                  <span className="text-xs font-bold uppercase">Puntos</span>
                </div>
                {loadingData ? <SkeletonBlock className="h-8 w-24 rounded-md" /> : <p className="text-2xl font-black text-slate-800">{stats.totalPoints}</p>}
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-slate-400">
                  <Target size={16} />
                  <span className="text-xs font-bold uppercase">Precisión</span>
                </div>
                {loadingData ? <SkeletonBlock className="h-8 w-20 rounded-md" /> : <p className="text-2xl font-black text-slate-800">{stats.accuracyPct}%</p>}
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-slate-400">
                  <Users size={16} />
                  <span className="text-xs font-bold uppercase">Grupos</span>
                </div>
                {loadingData ? <SkeletonBlock className="h-8 w-12 rounded-md" /> : <p className="text-2xl font-black text-slate-800">{stats.groups}</p>}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 text-sm">Actividad Reciente</h3>
              </div>
              <div className="divide-y divide-slate-50">
                {loadingData
                  ? Array.from({ length: 3 }).map((_, index) => (
                      <div key={`activity-skeleton-${index}`} className="p-4">
                        <SkeletonBlock className="h-12 w-full rounded-lg" />
                      </div>
                    ))
                  : activityRows.map((activity) => (
                      <div key={activity.id} className="p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                        <div className={`p-2 rounded-full ${activity.type === "prediction" ? "bg-indigo-50 text-indigo-500" : "bg-lime-50 text-lime-600"}`}>
                          {activity.type === "prediction" ? <Activity size={16} /> : <Users size={16} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{activity.label}</p>
                          <p className="text-[10px] text-slate-400">{activity.date}</p>
                        </div>
                        {typeof activity.points === "number" ? <span className="text-xs font-bold text-lime-600">+{activity.points} pts</span> : null}
                      </div>
                    ))}
                {!loadingData && activityRows.length === 0 ? (
                  <div className="p-4 text-xs text-slate-400">Sin actividad reciente por ahora.</div>
                ) : null}
              </div>
            </div>
          </div>
        </main>
      </div>

      {isEditModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden no-scrollbar" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/38 backdrop-blur-[2px]"
            onClick={() => setIsEditModalOpen(false)}
            aria-label="Cerrar modal"
          />

          <section className="relative w-full max-w-[469px] rounded-t-[34px] bg-white p-5 pt-4 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[86%] overflow-y-auto no-scrollbar">
            <div className="mx-auto mb-5 h-1.5 w-14 rounded-full bg-slate-200" />

            <div className="mb-6 flex items-center justify-between">
              <p className="text-2xl font-black text-slate-800">Editar Perfil</p>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="h-10 w-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-7 flex flex-col items-center">
              <div className="relative">
                <div className="h-24 w-24 rounded-full border-[4px] border-white bg-lime-100 text-lime-600 text-4xl font-black flex items-center justify-center shadow-md overflow-hidden">
                  {profileLogo ? <img src={profileLogo} alt="Avatar de perfil" className="h-[76%] w-[76%] object-contain" /> : profileLabel}
                </div>
                <button
                  type="button"
                  className="absolute bottom-0 right-0 h-10 w-10 rounded-full border-2 border-white bg-slate-800 text-white flex items-center justify-center shadow-sm"
                  aria-label="Cambiar foto"
                >
                  <Edit3 size={16} />
                </button>
              </div>
              <p className="mt-3 text-sm leading-none text-slate-400 font-bold">Cambiar foto</p>
            </div>

            <div className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-[13px] font-bold text-slate-500">Nombre Completo</span>
                <div className="h-14 rounded-2xl border border-slate-200 bg-slate-50 px-4 flex items-center gap-3">
                  <User size={20} className="text-slate-400" />
                  <input
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    maxLength={120}
                    className="w-full bg-transparent text-[17px] text-slate-700 font-bold outline-none"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-[13px] font-bold text-slate-500">Nombre de Usuario</span>
                <div className="h-14 rounded-2xl border border-slate-200 bg-slate-50 px-4 flex items-center gap-3">
                  <AtSign size={20} className="text-slate-400" />
                  <input
                    value={editUsername ? `@${editUsername}` : ""}
                    onChange={(event) => setEditUsername(event.target.value.replace(/^@+/, ""))}
                    maxLength={41}
                    className="w-full bg-transparent text-[17px] text-slate-700 font-bold outline-none"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-[13px] font-bold text-slate-500">Email</span>
                <div className="h-14 rounded-2xl border border-slate-200 bg-slate-50 px-4 flex items-center gap-3">
                  <Mail size={20} className="text-slate-400" />
                  <input
                    value={editEmail}
                    onChange={(event) => setEditEmail(event.target.value)}
                    maxLength={190}
                    className="w-full bg-transparent text-[17px] text-slate-700 font-bold outline-none"
                  />
                </div>
              </label>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="h-14 rounded-3xl border border-slate-200 bg-white text-lg leading-none text-slate-500 font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void saveProfile()}
                disabled={savingProfile}
                className="h-14 rounded-3xl bg-lime-400 text-lg leading-none text-slate-900 font-black shadow-[0_10px_24px_rgba(163,230,53,0.35)] disabled:opacity-60"
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
