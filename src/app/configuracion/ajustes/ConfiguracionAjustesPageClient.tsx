"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  ChevronRight,
  FileText,
  HelpCircle,
  Lock,
  LogOut,
  Moon,
  Settings,
  Smartphone,
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
  const { toggleTheme } = useTheme();
  const { loading, authenticated, user, memberships, activeGroupId, refresh } = useAuthSession();
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
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

  function showUnavailableMessage(label: string) {
    showToast({
      title: "Próximamente",
      description: `${label} estará disponible en una próxima versión.`,
      tone: "info"
    });
  }

  return (
    <AppShell activeTab={null} showTopGlow={false}>
      <div className="min-h-full bg-slate-100">
        <header className="sticky top-0 z-10 rounded-b-3xl bg-white px-5 pt-12 pb-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-slate-900 p-1.5 text-lime-400 shadow-sm">
                <Trophy size={18} strokeWidth={2.5} />
              </div>
              <h1 className="text-xl font-black uppercase tracking-tighter text-slate-900">
                <span className="italic">Fulbito</span>
                <span className="text-lime-500">Prode</span>
              </h1>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="rounded-full bg-slate-100 p-2 text-slate-600 transition-colors hover:bg-slate-200"
                aria-label="Cambiar tema"
              >
                <Moon size={18} />
              </button>
              <button
                type="button"
                className="relative rounded-full bg-slate-100 p-2 text-slate-600 transition-colors hover:bg-slate-200"
                aria-label="Notificaciones"
              >
                <Bell size={18} />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full border border-white bg-red-500" />
              </button>
              <button type="button" className="rounded-full bg-slate-100 p-2 text-slate-600" aria-label="Configuración">
                <Settings size={18} />
              </button>
              <button
                type="button"
                onClick={() => router.push("/perfil")}
                className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-lime-100 text-sm font-bold text-lime-700"
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
            <div className="rounded-lg bg-lime-400 p-1.5 text-white">
              <Settings size={18} />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Configuración</h2>
            <span className="ml-auto text-sm font-medium text-slate-400">Ajustes de la cuenta</span>
          </div>
        </header>

        <main className="mt-6 no-scrollbar">
          <div className="space-y-6 px-4 pb-6 no-scrollbar">
            <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
                      <Bell size={18} />
                    </div>
                    <span className="text-sm font-bold text-slate-800">Push Notifications</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPushNotificationsEnabled((value) => !value)}
                    className={`relative h-6 w-10 rounded-full transition-colors ${pushNotificationsEnabled ? "bg-lime-400" : "bg-slate-200"}`}
                    aria-label="Push Notifications"
                    aria-pressed={pushNotificationsEnabled}
                  >
                    <span
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${
                        pushNotificationsEnabled ? "right-1" : "left-1"
                      }`}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
                      <Smartphone size={18} />
                    </div>
                    <span className="text-sm font-bold text-slate-800">Vibración</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVibrationEnabled((value) => !value)}
                    className={`relative h-6 w-10 rounded-full transition-colors ${vibrationEnabled ? "bg-lime-400" : "bg-slate-200"}`}
                    aria-label="Vibración"
                    aria-pressed={vibrationEnabled}
                  >
                    <span
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${
                        vibrationEnabled ? "right-1" : "left-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Cuenta</h3>
              <div className="space-y-4">
                <Link href="/perfil" className="group flex w-full items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-slate-100 p-2 text-slate-600 transition-colors group-hover:bg-slate-200">
                      <User size={18} />
                    </div>
                    <span className="text-sm font-bold text-slate-800">Mi Perfil</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
                </Link>
                <button type="button" onClick={() => showUnavailableMessage("Cambiar Contraseña")} className="group flex w-full items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-slate-100 p-2 text-slate-600 transition-colors group-hover:bg-slate-200">
                      <Lock size={18} />
                    </div>
                    <span className="text-sm font-bold text-slate-800">Cambiar Contraseña</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Soporte</h3>
              <div className="space-y-4">
                <button type="button" onClick={() => showUnavailableMessage("Ayuda y FAQ")} className="group flex w-full items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-slate-100 p-2 text-slate-600 transition-colors group-hover:bg-slate-200">
                      <HelpCircle size={18} />
                    </div>
                    <span className="text-sm font-bold text-slate-800">Ayuda y FAQ</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
                </button>
                <button
                  type="button"
                  onClick={() => showUnavailableMessage("Términos y Condiciones")}
                  className="group flex w-full items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-slate-100 p-2 text-slate-600 transition-colors group-hover:bg-slate-200">
                      <FileText size={18} />
                    </div>
                    <span className="text-sm font-bold text-slate-800">Términos y Condiciones</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
                </button>
              </div>
            </section>

            <button
              type="button"
              onClick={() => void logout()}
              disabled={loggingOut}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-red-50 py-5 font-bold text-red-500 transition-colors hover:bg-red-100 disabled:opacity-60"
            >
              <LogOut size={18} /> {loggingOut ? "Cerrando..." : "Cerrar Sesión"}
            </button>

            <div className="mt-4 text-center">
              <p className="text-[10px] font-bold text-slate-400">Fulbito Prode v1.0.2</p>
            </div>
          </div>
        </main>
      </div>
    </AppShell>
  );
}
