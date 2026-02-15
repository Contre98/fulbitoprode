"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, PencilLine, UserRound } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { TopHeader } from "@/components/layout/TopHeader";
import { useAuthSession } from "@/lib/use-auth-session";

export default function ConfiguracionPerfilPage() {
  const router = useRouter();
  const { loading, authenticated, user, refresh } = useAuthSession();
  const [name, setName] = useState("");
  const [favoriteTeam, setFavoriteTeam] = useState("");
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !authenticated) {
      router.replace("/auth");
    }
  }, [loading, authenticated, router]);

  useEffect(() => {
    setName(user?.name || "");
    setFavoriteTeam(user?.favoriteTeam || "");
  }, [user?.name, user?.favoriteTeam]);

  async function saveProfile() {
    setSaving(true);
    setMessage(null);

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
      setMessage("Perfil actualizado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error al actualizar perfil.");
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    setLoggingOut(true);
    setMessage(null);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
      await refresh();
      router.replace("/auth");
    } catch {
      setMessage("No se pudo cerrar sesión.");
      setLoggingOut(false);
    }
  }

  return (
    <AppShell activeTab="configuracion">
      <TopHeader title="Configuración" userLabel={user?.name || "USUARIO"} />

      <section className="flex flex-col gap-3 px-5 pt-[2px] pb-4">
        <Link
          href="/configuracion"
          className="inline-flex w-fit items-center gap-1 rounded-[6px] border border-[var(--border-dim)] bg-[#111214] px-3 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)]"
        >
          <ArrowLeft size={13} />
          Volver
        </Link>

        <div className="rounded-[6px] border border-[var(--border-dim)] bg-[linear-gradient(135deg,#101113,#0b0b0d)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-[11px]">
              <div className="flex h-[62px] w-[62px] items-center justify-center rounded-full border border-[var(--border-light)] bg-[var(--bg-surface-elevated)]">
                <UserRound size={27} className="text-[var(--text-secondary)]" strokeWidth={1.8} />
              </div>
              <div className="min-w-0 flex flex-col gap-0.5">
                <p className="truncate text-[18px] font-bold text-[#f5f5f5]">{user?.name || "Jugador"}</p>
                <p className="truncate text-[13px] font-medium text-[var(--text-secondary)]">{user?.email || "-"}</p>
              </div>
            </div>

            <span className="hidden items-center gap-1 rounded-[6px] border border-[var(--border-dim)] bg-[#111218] px-[11px] py-[7px] text-[12px] font-semibold text-[var(--text-primary)] sm:inline-flex">
              <PencilLine size={13} />
              Editable
            </span>
          </div>
        </div>

        <div className="rounded-[6px] border border-[var(--border-dim)] bg-[#0b0b0d] p-4">
          <h2 className="text-[15px] font-bold text-white">Datos y preferencias</h2>

          <div className="mt-3 flex flex-col gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Nombre completo</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={120}
                className="h-11 rounded-[6px] border border-[var(--border-light)] bg-[var(--bg-surface)] px-3 text-[13px] font-semibold text-white outline-none"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Email</span>
              <input
                value={user?.email || ""}
                readOnly
                className="h-11 rounded-[6px] border border-[var(--border-dim)] bg-[#111214] px-3 text-[13px] font-semibold text-[var(--text-secondary)] outline-none"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Equipo favorito</span>
              <input
                value={favoriteTeam}
                onChange={(event) => setFavoriteTeam(event.target.value)}
                maxLength={120}
                placeholder="Boca Juniors"
                className="h-11 rounded-[6px] border border-[var(--border-light)] bg-[var(--bg-surface)] px-3 text-[13px] font-semibold text-white outline-none"
              />
            </label>
          </div>

          {message ? <p className="mt-2 text-[11px] font-medium text-[var(--text-secondary)]">{message}</p> : null}

          <div className="mt-4 grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={saveProfile}
              disabled={saving || loading}
              className="h-12 rounded-[6px] bg-[var(--accent)] text-[15px] font-black text-[var(--bg-body)] disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>

            <button
              type="button"
              onClick={logout}
              disabled={loggingOut}
              className="h-12 rounded-[6px] border border-[var(--border-dim)] bg-[#111214] text-[15px] font-semibold text-[var(--text-secondary)] disabled:opacity-60"
            >
              {loggingOut ? "Cerrando..." : "Cerrar sesión"}
            </button>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
