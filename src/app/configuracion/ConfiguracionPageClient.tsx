"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  Link as LinkIcon,
  Moon,
  Plus,
  Settings,
  Shield,
  Trash2,
  Trophy,
  UserMinus,
  UserPlus,
  Users,
  X
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAuthSession } from "@/lib/use-auth-session";
import { useToast } from "@/components/ui/ToastProvider";
import { useTheme } from "@/lib/use-theme";
import type { CreateGroupResponse, GroupInvitePayload, LeaguesPayload, LeagueOption, SelectionOption } from "@/lib/types";

type MembershipListItem = Pick<SelectionOption, "groupId" | "groupName" | "leagueName" | "role"> & {
  logoDataUrl?: string | null;
  groupLogoDataUrl?: string | null;
  competitionLogoDataUrl?: string | null;
  teamLogoDataUrl?: string | null;
  avatarDataUrl?: string | null;
};

interface GroupMemberRecord {
  userId: string;
  name: string;
  role: "owner" | "admin" | "member";
  joinedAt: string;
  logoDataUrl?: string | null;
  groupLogoDataUrl?: string | null;
  competitionLogoDataUrl?: string | null;
  teamLogoDataUrl?: string | null;
  avatarDataUrl?: string | null;
}

interface GroupMembersPayload {
  members: GroupMemberRecord[];
}

interface PendingGroupAction {
  type: "leave" | "delete";
  groupId: string;
}

function initialsFromText(value: string) {
  return (
    value
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((chunk) => chunk.charAt(0).toUpperCase())
      .join("") || "FC"
  );
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

export default function ConfiguracionPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { toggleTheme } = useTheme();
  const { loading, authenticated, user, memberships, activeGroupId, setActiveGroupId, refresh } = useAuthSession();

  const [createName, setCreateName] = useState("");
  const [joinCodeOrToken, setJoinCodeOrToken] = useState("");
  const [selectedCompetitionKey, setSelectedCompetitionKey] = useState<string | null>(null);
  const [leagues, setLeagues] = useState<LeagueOption[]>([]);
  const [loadingLeagues, setLoadingLeagues] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "join">("create");

  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  const [membersModalGroupId, setMembersModalGroupId] = useState<string | null>(null);
  const [membersByGroupId, setMembersByGroupId] = useState<Record<string, GroupMemberRecord[]>>({});
  const [membersLoadedByGroupId, setMembersLoadedByGroupId] = useState<Record<string, boolean>>({});
  const [loadingMembersByGroupId, setLoadingMembersByGroupId] = useState<Record<string, boolean>>({});
  const [memberActionKey, setMemberActionKey] = useState<string | null>(null);

  const [pendingGroupAction, setPendingGroupAction] = useState<PendingGroupAction | null>(null);
  const [processingGroupAction, setProcessingGroupAction] = useState(false);

  const [inviteByGroupId, setInviteByGroupId] = useState<Record<string, { code: string; token: string; expiresAt: string } | null>>({});
  const [inviteUrlByGroupId, setInviteUrlByGroupId] = useState<Record<string, string | undefined>>({});

  const selectedLeague = useMemo(
    () => leagues.find((league) => league.competitionKey === selectedCompetitionKey) || null,
    [leagues, selectedCompetitionKey]
  );

  const membershipsForDisplay = useMemo<MembershipListItem[]>(() => {
    return memberships.map((membership) => {
      const candidate = membership as typeof membership & {
        logoDataUrl?: string | null;
        groupLogoDataUrl?: string | null;
        competitionLogoDataUrl?: string | null;
        teamLogoDataUrl?: string | null;
        avatarDataUrl?: string | null;
      };

      return {
        groupId: membership.groupId,
        groupName: membership.groupName,
        leagueName: membership.leagueName,
        role: membership.role,
        logoDataUrl: candidate.logoDataUrl ?? null,
        groupLogoDataUrl: candidate.groupLogoDataUrl ?? null,
        competitionLogoDataUrl: candidate.competitionLogoDataUrl ?? null,
        teamLogoDataUrl: candidate.teamLogoDataUrl ?? null,
        avatarDataUrl: candidate.avatarDataUrl ?? null
      };
    });
  }, [memberships]);

  const modalMembership = useMemo(
    () => membershipsForDisplay.find((membership) => membership.groupId === membersModalGroupId) || null,
    [membershipsForDisplay, membersModalGroupId]
  );

  const modalMembers = useMemo(
    () => (membersModalGroupId ? membersByGroupId[membersModalGroupId] || [] : []),
    [membersModalGroupId, membersByGroupId]
  );

  const modalMembersLoading = membersModalGroupId ? loadingMembersByGroupId[membersModalGroupId] === true : false;
  const canManageModalMembers = Boolean(modalMembership && (modalMembership.role === "owner" || modalMembership.role === "admin"));

  useEffect(() => {
    if (!loading && !authenticated) {
      router.replace("/auth");
    }
  }, [loading, authenticated, router]);

  useEffect(() => {
    const inviteFromQuery = searchParams.get("invite")?.trim() || "";
    if (inviteFromQuery) {
      setJoinCodeOrToken((prev) => prev || inviteFromQuery);
      setFormMode("join");
    }
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    async function loadLeagues() {
      setLoadingLeagues(true);
      try {
        const response = await fetch("/api/leagues", {
          method: "GET",
          cache: "no-store"
        });

        if (!response.ok) {
          throw new Error(`No se pudieron cargar las ligas (${response.status})`);
        }

        const payload = (await response.json()) as LeaguesPayload;
        if (cancelled) return;

        setLeagues(payload.leagues);
        setSelectedCompetitionKey((prev) =>
          prev && payload.leagues.some((league) => league.competitionKey === prev)
            ? prev
            : payload.leagues[0]?.competitionKey || null
        );
      } catch (error) {
        if (!cancelled) {
          showToast({
            title: "No se pudieron cargar las ligas",
            description: error instanceof Error ? error.message : "Error inesperado",
            tone: "error"
          });
          setLeagues([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingLeagues(false);
        }
      }
    }

    void loadLeagues();

    return () => {
      cancelled = true;
    };
  }, [showToast]);

  useEffect(() => {
    if (!membersModalGroupId) {
      return;
    }

    const exists = membershipsForDisplay.some((membership) => membership.groupId === membersModalGroupId);
    if (!exists) {
      setMembersModalGroupId(null);
    }
  }, [membersModalGroupId, membershipsForDisplay]);

  const loadInvite = useCallback(async (groupId: string) => {
    const response = await fetch(`/api/groups/${encodeURIComponent(groupId)}/invite`, {
      method: "GET",
      cache: "no-store"
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error || "No se pudo cargar la invitación.");
    }

    const payload = (await response.json()) as GroupInvitePayload;
    setInviteByGroupId((prev) => ({ ...prev, [groupId]: payload.invite }));
    setInviteUrlByGroupId((prev) => ({ ...prev, [groupId]: payload.inviteUrl }));
    return payload;
  }, []);

  async function createGroup() {
    const name = createName.trim();
    if (!name) {
      showToast({ title: "Ingresá un nombre de grupo", tone: "error" });
      return;
    }

    if (!selectedLeague) {
      showToast({ title: "Seleccioná una liga", tone: "error" });
      return;
    }

    setCreating(true);

    try {
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          leagueId: selectedLeague.id,
          season: selectedLeague.season,
          competitionKey: selectedLeague.competitionKey,
          competitionName: selectedLeague.competitionName,
          competitionStage: selectedLeague.competitionStage
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "No se pudo crear el grupo.");
      }

      const payload = (await response.json()) as CreateGroupResponse;

      setCreateName("");
      setInviteByGroupId((prev) => ({ ...prev, [payload.group.id]: payload.invite }));
      await refresh();
      setActiveGroupId(payload.group.id);
      showToast({ title: "Grupo creado", description: payload.group.name, tone: "success" });
    } catch (error) {
      showToast({
        title: "Error al crear grupo",
        description: error instanceof Error ? error.message : "Error inesperado",
        tone: "error"
      });
    } finally {
      setCreating(false);
    }
  }

  async function joinGroup() {
    const codeOrToken = joinCodeOrToken.trim();
    if (!codeOrToken) {
      showToast({ title: "Ingresá código o token", tone: "error" });
      return;
    }

    setJoining(true);

    try {
      const response = await fetch("/api/groups/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ codeOrToken })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "No se pudo unir al grupo.");
      }

      const payload = (await response.json()) as {
        group: { id: string; name: string };
      };

      setJoinCodeOrToken("");
      await refresh();
      setActiveGroupId(payload.group.id);
      showToast({ title: "Te uniste al grupo", description: payload.group.name, tone: "success" });
    } catch (error) {
      showToast({
        title: "Error al unirse",
        description: error instanceof Error ? error.message : "Error inesperado",
        tone: "error"
      });
    } finally {
      setJoining(false);
    }
  }

  async function leaveGroupById(groupId: string) {
    setProcessingGroupAction(true);

    try {
      const response = await fetch("/api/groups/leave", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ groupId })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "No se pudo salir del grupo.");
      }

      const payload = (await response.json().catch(() => null)) as { deletedGroup?: boolean } | null;

      setInviteByGroupId((prev) => {
        const next = { ...prev };
        delete next[groupId];
        return next;
      });
      setInviteUrlByGroupId((prev) => {
        const next = { ...prev };
        delete next[groupId];
        return next;
      });
      setMembersByGroupId((prev) => {
        const next = { ...prev };
        delete next[groupId];
        return next;
      });
      setMembersLoadedByGroupId((prev) => {
        const next = { ...prev };
        delete next[groupId];
        return next;
      });

      await refresh();
      if (membersModalGroupId === groupId) {
        setMembersModalGroupId(null);
      }
      showToast({
        title: payload?.deletedGroup ? "Grupo eliminado" : "Saliste del grupo",
        tone: "success"
      });
      return true;
    } catch (error) {
      showToast({
        title: "No se pudo salir del grupo",
        description: error instanceof Error ? error.message : "Error inesperado",
        tone: "error"
      });
      return false;
    } finally {
      setProcessingGroupAction(false);
    }
  }

  async function deleteGroupById(groupId: string) {
    setProcessingGroupAction(true);

    try {
      const response = await fetch(`/api/groups/${encodeURIComponent(groupId)}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "No se pudo eliminar el grupo.");
      }

      const payload = (await response.json().catch(() => null)) as { warningRequired?: boolean } | null;

      setInviteByGroupId((prev) => {
        const next = { ...prev };
        delete next[groupId];
        return next;
      });
      setInviteUrlByGroupId((prev) => {
        const next = { ...prev };
        delete next[groupId];
        return next;
      });
      setMembersByGroupId((prev) => {
        const next = { ...prev };
        delete next[groupId];
        return next;
      });
      setMembersLoadedByGroupId((prev) => {
        const next = { ...prev };
        delete next[groupId];
        return next;
      });

      await refresh();
      if (membersModalGroupId === groupId) {
        setMembersModalGroupId(null);
      }

      showToast({
        title: "Grupo eliminado",
        description: payload?.warningRequired ? "El grupo quedó marcado como inactivo." : undefined,
        tone: "success"
      });
      return true;
    } catch (error) {
      showToast({
        title: "No se pudo eliminar",
        description: error instanceof Error ? error.message : "Error inesperado",
        tone: "error"
      });
      return false;
    } finally {
      setProcessingGroupAction(false);
    }
  }

  async function ensureInvite(groupId: string) {
    const existing = inviteByGroupId[groupId];
    if (existing !== undefined) {
      return existing;
    }

    const payload = await loadInvite(groupId);
    return payload.invite;
  }

  function inviteDeepLink(token: string) {
    const configuredBase = process.env.NEXT_PUBLIC_APP_URL?.trim() || "";
    const runtimeOrigin = typeof window !== "undefined" ? window.location.origin.replace(/\/$/, "") : "";
    const base = configuredBase.length > 0 ? configuredBase.replace(/\/$/, "") : runtimeOrigin;
    if (!base) {
      return `/configuracion?invite=${encodeURIComponent(token)}`;
    }
    return `${base}/configuracion?invite=${encodeURIComponent(token)}`;
  }

  function resolveInviteUrl(groupId: string, token: string) {
    return inviteUrlByGroupId[groupId] || inviteDeepLink(token);
  }

  async function shareInvite(groupId: string) {
    try {
      const invite = await ensureInvite(groupId);
      if (!invite) {
        showToast({ title: "No hay invitación activa", tone: "error" });
        return;
      }

      const link = resolveInviteUrl(groupId, invite.token);
      const shareText = `Unite a mi grupo de Fulbito Prode.\nCódigo: ${invite.code}`;

      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({
          title: "Invitación Fulbito Prode",
          text: shareText,
          url: link
        });
        showToast({ title: "Invitación compartida", tone: "success" });
        return;
      }

      await navigator.clipboard.writeText(`${shareText}\n${link}`);
      showToast({ title: "Invitación lista para compartir", tone: "success" });
    } catch (error) {
      showToast({
        title: "No se pudo compartir",
        description: error instanceof Error ? error.message : "Error inesperado",
        tone: "error"
      });
    }
  }

  async function copyInviteLink(groupId: string) {
    try {
      const invite = await ensureInvite(groupId);
      if (!invite) {
        showToast({ title: "No hay invitación activa", tone: "error" });
        return;
      }
      const link = resolveInviteUrl(groupId, invite.token);
      await navigator.clipboard.writeText(link);
      showToast({ title: "Link copiado", tone: "success" });
    } catch (error) {
      showToast({
        title: "No se pudo copiar",
        description: error instanceof Error ? error.message : "Error inesperado",
        tone: "error"
      });
    }
  }

  const loadGroupMembers = useCallback(
    async (groupId: string, options?: { force?: boolean }) => {
      if (!options?.force && membersLoadedByGroupId[groupId]) {
        return;
      }

      setLoadingMembersByGroupId((prev) => ({ ...prev, [groupId]: true }));

      try {
        const response = await fetch(`/api/groups/${encodeURIComponent(groupId)}/members`, {
          method: "GET",
          cache: "no-store"
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error || "No se pudieron cargar los miembros.");
        }

        const payload = (await response.json()) as GroupMembersPayload;
        setMembersByGroupId((prev) => ({ ...prev, [groupId]: payload.members }));
        setMembersLoadedByGroupId((prev) => ({ ...prev, [groupId]: true }));
      } catch (error) {
        showToast({
          title: "No se pudieron cargar miembros",
          description: error instanceof Error ? error.message : "Error inesperado",
          tone: "error"
        });
      } finally {
        setLoadingMembersByGroupId((prev) => ({ ...prev, [groupId]: false }));
      }
    },
    [membersLoadedByGroupId, showToast]
  );

  async function openMembersModal(groupId: string) {
    setMembersModalGroupId(groupId);
    await loadGroupMembers(groupId);
  }

  async function makeMemberAdmin(groupId: string, targetUserId: string) {
    const actionKey = `${groupId}:${targetUserId}:admin`;
    setMemberActionKey(actionKey);

    try {
      const response = await fetch(`/api/groups/${encodeURIComponent(groupId)}/members`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ userId: targetUserId, role: "admin" })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "No se pudo actualizar el rol.");
      }

      setMembersByGroupId((prev) => ({
        ...prev,
        [groupId]: (prev[groupId] || []).map((member) =>
          member.userId === targetUserId ? { ...member, role: "admin" } : member
        )
      }));
      showToast({ title: "Miembro promovido", tone: "success" });
    } catch (error) {
      showToast({
        title: "No se pudo promover",
        description: error instanceof Error ? error.message : "Error inesperado",
        tone: "error"
      });
    } finally {
      setMemberActionKey(null);
    }
  }

  async function kickMember(groupId: string, targetUserId: string) {
    const actionKey = `${groupId}:${targetUserId}:kick`;
    setMemberActionKey(actionKey);

    try {
      const response = await fetch(`/api/groups/${encodeURIComponent(groupId)}/members`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ userId: targetUserId })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "No se pudo expulsar al miembro.");
      }

      setMembersByGroupId((prev) => ({
        ...prev,
        [groupId]: (prev[groupId] || []).filter((member) => member.userId !== targetUserId)
      }));
      showToast({ title: "Miembro expulsado", tone: "success" });
    } catch (error) {
      showToast({
        title: "No se pudo expulsar",
        description: error instanceof Error ? error.message : "Error inesperado",
        tone: "error"
      });
    } finally {
      setMemberActionKey(null);
    }
  }

  async function confirmPendingGroupAction() {
    if (!pendingGroupAction) {
      return;
    }

    const action = pendingGroupAction;
    const ok =
      action.type === "leave" ? await leaveGroupById(action.groupId) : await deleteGroupById(action.groupId);

    if (ok) {
      setPendingGroupAction(null);
    }
  }

  const modalMembersForDisplay = useMemo(() => {
    const selfUserId = user?.id;
    return [...modalMembers].sort((a, b) => {
      if (selfUserId && a.userId === selfUserId) return -1;
      if (selfUserId && b.userId === selfUserId) return 1;
      return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime();
    });
  }, [modalMembers, user?.id]);

  return (
    <AppShell activeTab="configuracion" showTopGlow={false}>
      <div className="min-h-full bg-slate-100">
        <header className="px-5 pt-12 pb-6 bg-white shadow-sm rounded-b-3xl z-10 sticky top-0">
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
              <button
                type="button"
                className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors relative"
                aria-label="Notificaciones"
              >
                <Bell size={18} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
              </button>
              <button
                type="button"
                onClick={() => router.push("/configuracion/ajustes")}
                className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                aria-label="Configuración"
              >
                <Settings size={18} />
              </button>
              <button
                type="button"
                onClick={() => router.push("/perfil")}
                className="p-2 rounded-full bg-lime-100 text-lime-700 font-bold text-sm h-9 w-9 flex items-center justify-center"
                aria-label="Perfil"
              >
                {initialsFromText(user?.name || "FC")}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-lime-400 p-1.5 rounded-lg text-white">
              <Users size={18} />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Grupos</h2>
            <span className="text-sm text-slate-400 font-medium ml-auto">Gestión social</span>
          </div>
        </header>

        <main className="mt-6 no-scrollbar">
          <div className="px-4 space-y-6 no-scrollbar pb-6">
            <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <span className="sr-only">Crear grupo</span>
              <input
                readOnly
                tabIndex={-1}
                aria-hidden="true"
                value=""
                placeholder="Código o token de invitación"
                className="sr-only"
              />
              <div className="flex border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => setFormMode("create")}
                  className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                    formMode === "create" ? "bg-lime-50 text-lime-700 border-b-2 border-lime-400" : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Crear Grupo
                </button>
                <button
                  type="button"
                  onClick={() => setFormMode("join")}
                  className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                    formMode === "join" ? "bg-lime-50 text-lime-700 border-b-2 border-lime-400" : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Unirse
                </button>
              </div>

              <div className="p-5">
                {formMode === "create" ? (
                  <div className="space-y-4">
                    <div className="relative">
                      <input
                        type="text"
                        value={createName}
                        onChange={(event) => setCreateName(event.target.value)}
                        placeholder="Nombre del nuevo grupo"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 transition-all"
                      />
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <select
                          value={selectedCompetitionKey || ""}
                          onChange={(event) => setSelectedCompetitionKey(event.target.value || null)}
                          className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 text-slate-600 disabled:opacity-60"
                          disabled={loadingLeagues || leagues.length === 0}
                        >
                          {leagues.map((league) => (
                            <option key={league.competitionKey} value={league.competitionKey}>
                              {league.name}
                            </option>
                          ))}
                        </select>
                        <Trophy size={16} className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" />
                      </div>
                      <button
                        type="button"
                        onClick={() => void createGroup()}
                        disabled={creating || !createName.trim() || !selectedLeague}
                        className="bg-lime-400 hover:bg-lime-500 text-slate-900 font-bold rounded-xl px-4 shadow-lg shadow-lime-200 transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none"
                        aria-label="Crear grupo"
                      >
                        {creating ? "..." : <Plus size={20} />}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={joinCodeOrToken}
                      onChange={(event) => setJoinCodeOrToken(event.target.value)}
                      placeholder="Pegar código"
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
                    />
                    <button
                      type="button"
                      onClick={() => void joinGroup()}
                      disabled={joining || !joinCodeOrToken.trim()}
                      className="bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl px-5 text-sm transition-all active:scale-95 disabled:opacity-50"
                    >
                      {joining ? "Uniendo..." : "Unirme"}
                    </button>
                  </div>
                )}
              </div>
            </section>

            <section>
              <h3 className="text-slate-800 font-bold text-lg mb-4 flex items-center gap-2">
                Mis Grupos
                <span className="bg-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded-full">{membershipsForDisplay.length}</span>
              </h3>

              {membershipsForDisplay.length === 0 ? (
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                  <p className="text-sm text-slate-500">Todavía no estás en ningún grupo.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {membershipsForDisplay.map((membership) => {
                    const logoDataUrl = resolveLogoDataUrl(membership);

                    return (
                      <article
                        key={`${membership.groupId}-${membership.role}`}
                        className="group bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative"
                      >
                        <div className="flex justify-between items-start">
                          <button
                            type="button"
                            onClick={() => setActiveGroupId(membership.groupId)}
                            className="flex gap-3 items-center text-left min-w-0"
                            aria-label={`Cambiar a ${membership.groupName}`}
                          >
                            <div
                              className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold overflow-hidden ${
                                membership.role === "owner" ? "bg-lime-100 text-lime-700" : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {logoDataUrl ? (
                                <img src={logoDataUrl} alt={`${membership.groupName} logo`} className="h-[76%] w-[76%] object-contain" />
                              ) : (
                                initialsFromText(membership.groupName)
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-slate-800 leading-tight truncate">{membership.groupName}</h4>
                              <div className="flex items-center gap-1.5 mt-1 min-w-0">
                                <Trophy size={12} className="text-slate-400 flex-shrink-0" />
                                <span className="text-xs text-slate-500 truncate">{membership.leagueName}</span>
                              </div>
                            </div>
                          </button>

                          <div className="flex items-center gap-1">
                            {membership.role === "owner" ? (
                              <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-1 rounded-full mr-1">OWNER</span>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => {
                                if (activeGroupId !== membership.groupId) {
                                  setActiveGroupId(membership.groupId);
                                }
                                void openMembersModal(membership.groupId);
                              }}
                              className="p-2 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors"
                              aria-label={`Administrar ${membership.groupName}`}
                            >
                              <Settings size={18} />
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      {membersModalGroupId && modalMembership ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:rounded-[32px] overflow-hidden no-scrollbar">
          <button
            type="button"
            onClick={() => setMembersModalGroupId(null)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            aria-label="Cerrar"
          ></button>
          <div className="bg-white w-full max-w-[469px] rounded-t-3xl p-6 relative shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90%] overflow-y-auto no-scrollbar">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>

            <div className="flex justify-between items-start mb-6">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Gestionar Grupo</label>
                <h2 className="text-2xl font-black text-slate-800 mt-1 leading-tight">{modalMembership.groupName}</h2>
                <p className="text-xs text-slate-500 font-medium">{modalMembership.leagueName}</p>
              </div>
              <button
                type="button"
                onClick={() => setMembersModalGroupId(null)}
                className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => void copyInviteLink(modalMembership.groupId)}
              disabled={!canManageModalMembers}
              className="w-full flex items-center justify-center gap-2 bg-lime-400 hover:bg-lime-500 text-slate-900 font-bold py-3.5 rounded-2xl shadow-lg shadow-lime-200 transition-all active:scale-95 mb-8 disabled:opacity-50"
            >
              <LinkIcon size={18} />
              Copiar link de invitación
            </button>

            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Miembros ({modalMembersForDisplay.length})</h3>
                <button
                  type="button"
                  onClick={() => void shareInvite(modalMembership.groupId)}
                  disabled={!canManageModalMembers}
                  className="text-[10px] font-bold text-lime-600 flex items-center gap-1 hover:underline disabled:opacity-45"
                >
                  <UserPlus size={12} /> Invitar más
                </button>
              </div>

              {modalMembersLoading ? (
                <p className="text-xs text-slate-500">Cargando miembros...</p>
              ) : modalMembersForDisplay.length === 0 ? (
                <p className="text-xs text-slate-500">Este grupo no tiene miembros activos.</p>
              ) : (
                <div className="space-y-2">
                  {modalMembersForDisplay.map((member) => {
                    const role = member.role;
                    const isSelf = member.userId === user?.id;
                    const makeAdminKey = `${modalMembership.groupId}:${member.userId}:admin`;
                    const kickMemberKey = `${modalMembership.groupId}:${member.userId}:kick`;
                    const actionBusy = memberActionKey === makeAdminKey || memberActionKey === kickMemberKey;
                    const memberLogoDataUrl = resolveLogoDataUrl(member);

                    const canKick =
                      canManageModalMembers &&
                      !isSelf &&
                      role !== "owner" &&
                      !(modalMembership.role === "admin" && role === "admin");
                    const canMakeAdmin = canManageModalMembers && !isSelf && role === "member";

                    return (
                      <div
                        key={member.userId}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 group/member transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0 overflow-hidden">
                            {memberLogoDataUrl ? (
                              <img src={memberLogoDataUrl} alt={`${member.name} logo`} className="h-[80%] w-[80%] object-contain" />
                            ) : (
                              initialsFromText(member.name)
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">{isSelf ? user?.name || member.name : member.name}</p>
                            <div className="flex items-center gap-1">
                              {role === "admin" ? <Shield size={10} className="text-blue-500 fill-blue-500" /> : null}
                              <p className="text-[10px] text-slate-400 font-medium capitalize">{role}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {canMakeAdmin ? (
                            <button
                              type="button"
                              title="Promover a Admin"
                              onClick={() => void makeMemberAdmin(modalMembership.groupId, member.userId)}
                              disabled={actionBusy}
                              className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-colors disabled:opacity-40"
                            >
                              <Shield size={16} />
                            </button>
                          ) : null}
                          {canKick ? (
                            <button
                              type="button"
                              title="Expulsar del grupo"
                              onClick={() => void kickMember(modalMembership.groupId, member.userId)}
                              disabled={actionBusy}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-40"
                            >
                              <UserMinus size={16} />
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-slate-100">
              {modalMembership.role === "member" ? (
                <button
                  type="button"
                  onClick={() => setPendingGroupAction({ type: "leave", groupId: modalMembership.groupId })}
                  className="w-full flex items-center justify-center gap-2 text-red-500 font-bold py-3 hover:bg-red-50 rounded-2xl transition-colors"
                >
                  <X size={18} /> Salir del grupo
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setPendingGroupAction({ type: "delete", groupId: modalMembership.groupId })}
                  className="w-full flex items-center justify-center gap-2 text-red-500 font-bold py-3 hover:bg-red-50 rounded-2xl transition-colors"
                >
                  <Trash2 size={18} /> Eliminar Grupo
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(pendingGroupAction)}
        onCancel={() => {
          if (!processingGroupAction) {
            setPendingGroupAction(null);
          }
        }}
        onConfirm={() => void confirmPendingGroupAction()}
        loading={processingGroupAction}
        title={pendingGroupAction?.type === "delete" ? "¿Eliminar grupo?" : "¿Salir del grupo?"}
        description={
          pendingGroupAction?.type === "delete"
            ? "Esta acción marca el grupo como inactivo y remueve miembros e invitaciones activas."
            : "Vas a abandonar este grupo. Si sos el último owner, el grupo se elimina."
        }
        confirmLabel={pendingGroupAction?.type === "delete" ? "Eliminar grupo" : "Salir del grupo"}
        tone="danger"
      />
    </AppShell>
  );
}
