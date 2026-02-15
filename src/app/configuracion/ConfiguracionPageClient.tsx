"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, Link2, Pencil, Plus, RefreshCw, Users, X } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { TopHeader } from "@/components/layout/TopHeader";
import { useAuthSession } from "@/lib/use-auth-session";
import type {
  CreateGroupResponse,
  GroupInvite,
  GroupInvitePayload,
  LeaguesPayload,
  LeagueOption,
  RefreshInviteResponse,
  SelectionOption
} from "@/lib/types";

type MembershipListItem = Pick<SelectionOption, "groupId" | "groupName" | "leagueName" | "role">;

export default function ConfiguracionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loading, authenticated, user, memberships, activeGroupId, setActiveGroupId, refresh } = useAuthSession();
  const [createName, setCreateName] = useState("");
  const [joinCodeOrToken, setJoinCodeOrToken] = useState("");
  const [selectedCompetitionKey, setSelectedCompetitionKey] = useState<string | null>(null);
  const [leagues, setLeagues] = useState<LeagueOption[]>([]);
  const [loadingLeagues, setLoadingLeagues] = useState(false);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [loadingInvite, setLoadingInvite] = useState(false);
  const [refreshingInvite, setRefreshingInvite] = useState(false);
  const [editingGroupName, setEditingGroupName] = useState(false);
  const [groupNameDraft, setGroupNameDraft] = useState("");
  const [renamingGroup, setRenamingGroup] = useState(false);
  const [inviteByGroupId, setInviteByGroupId] = useState<Record<string, GroupInvite | null>>({});
  const [canRefreshInviteByGroupId, setCanRefreshInviteByGroupId] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<string | null>(null);

  const selectedLeague = useMemo(
    () => leagues.find((league) => league.competitionKey === selectedCompetitionKey) || null,
    [leagues, selectedCompetitionKey]
  );
  const membershipsForDisplay = useMemo<MembershipListItem[]>(
    () =>
      memberships.map((membership) => ({
        groupId: membership.groupId,
        groupName: membership.groupName,
        leagueName: membership.leagueName,
        role: membership.role
      })),
    [memberships]
  );
  const activeInvite = activeGroupId ? inviteByGroupId[activeGroupId] || null : null;
  const canRefreshActiveInvite = activeGroupId ? canRefreshInviteByGroupId[activeGroupId] === true : false;
  const activeMembership = useMemo(
    () => membershipsForDisplay.find((membership) => membership.groupId === activeGroupId) || null,
    [membershipsForDisplay, activeGroupId]
  );
  const canEditActiveGroup = Boolean(activeMembership && (activeMembership.role === "owner" || activeMembership.role === "admin"));

  useEffect(() => {
    if (!loading && !authenticated) {
      router.replace("/auth");
    }
  }, [loading, authenticated, router]);

  useEffect(() => {
    const inviteFromQuery = searchParams.get("invite")?.trim() || "";
    if (inviteFromQuery) {
      setJoinCodeOrToken((prev) => prev || inviteFromQuery);
    }
  }, [searchParams]);

  useEffect(() => {
    setEditingGroupName(false);
    setGroupNameDraft(activeMembership?.groupName || "");
  }, [activeMembership?.groupName, activeMembership?.groupId]);

  const loadInvite = useCallback(
    async (groupId: string) => {
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
      setCanRefreshInviteByGroupId((prev) => ({ ...prev, [groupId]: payload.canRefresh }));
      return payload;
    },
    []
  );

  useEffect(() => {
    if (!activeGroupId) {
      return;
    }

    let cancelled = false;
    setLoadingInvite(true);

    void loadInvite(activeGroupId)
      .catch((error) => {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : "No se pudo cargar la invitación activa.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingInvite(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeGroupId, loadInvite]);

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
        if (cancelled) {
          return;
        }

        setLeagues(payload.leagues);
        setSelectedCompetitionKey((prev) =>
          prev && payload.leagues.some((league) => league.competitionKey === prev)
            ? prev
            : payload.leagues[0]?.competitionKey || null
        );
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : "No se pudieron cargar las ligas.");
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
  }, []);

  async function createGroup() {
    const name = createName.trim();
    if (!name) {
      setMessage("Ingresá un nombre de grupo.");
      return;
    }

    if (!selectedLeague) {
      setMessage("Seleccioná una liga.");
      return;
    }

    setCreating(true);
    setMessage(null);

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
      setCanRefreshInviteByGroupId((prev) => ({ ...prev, [payload.group.id]: true }));
      await refresh();
      setActiveGroupId(payload.group.id);
      setMessage(`Grupo creado: ${payload.group.name}. Invitación lista para compartir.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error al crear grupo.");
    } finally {
      setCreating(false);
    }
  }

  async function joinGroup() {
    const codeOrToken = joinCodeOrToken.trim();
    if (!codeOrToken) {
      setMessage("Ingresá código o token de invitación.");
      return;
    }

    setJoining(true);
    setMessage(null);

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
      setMessage(`Te uniste a ${payload.group.name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error al unirse al grupo.");
    } finally {
      setJoining(false);
    }
  }

  async function leaveActiveGroup() {
    if (!activeGroupId) {
      return;
    }

    setMessage(null);

    try {
      const response = await fetch("/api/groups/leave", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ groupId: activeGroupId })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "No se pudo abandonar el grupo.");
      }
      const payload = (await response.json().catch(() => null)) as { deletedGroup?: boolean } | null;

      setInviteByGroupId((prev) => {
        const next = { ...prev };
        delete next[activeGroupId];
        return next;
      });
      setCanRefreshInviteByGroupId((prev) => {
        const next = { ...prev };
        delete next[activeGroupId];
        return next;
      });
      await refresh();
      setMessage(payload?.deletedGroup ? "El grupo activo fue eliminado." : "Abandonaste el grupo activo.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error al abandonar grupo.");
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
    const base =
      configuredBase.length > 0 ? configuredBase.replace(/\/$/, "") : window.location.origin.replace(/\/$/, "");
    return `${base}/configuracion?invite=${encodeURIComponent(token)}`;
  }

  async function copyInviteShare(groupId: string) {
    try {
      const invite = await ensureInvite(groupId);
      if (!invite) {
        setMessage("No hay invitación activa para este grupo.");
        return;
      }

      const shareValue = `Invitación Fulbito Prode\nCódigo: ${invite.code}\nToken: ${invite.token}\nLink: ${inviteDeepLink(invite.token)}`;
      await navigator.clipboard.writeText(shareValue);
      setMessage("Invitación copiada al portapapeles.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo copiar la invitación.");
    }
  }

  async function copyInviteToken(groupId: string) {
    try {
      const invite = await ensureInvite(groupId);
      if (!invite) {
        setMessage("No hay invitación activa para este grupo.");
        return;
      }
      await navigator.clipboard.writeText(invite.token);
      setMessage("Token copiado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo copiar el token.");
    }
  }

  async function refreshInvite() {
    if (!activeGroupId) {
      return;
    }

    setRefreshingInvite(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/groups/${encodeURIComponent(activeGroupId)}/invite/refresh`, {
        method: "POST"
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "No se pudo regenerar la invitación.");
      }

      const payload = (await response.json()) as RefreshInviteResponse;
      setInviteByGroupId((prev) => ({ ...prev, [activeGroupId]: payload.invite }));
      setCanRefreshInviteByGroupId((prev) => ({ ...prev, [activeGroupId]: true }));
      setMessage("Invitación regenerada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo regenerar la invitación.");
    } finally {
      setRefreshingInvite(false);
    }
  }

  async function renameActiveGroup() {
    if (!activeGroupId) {
      return;
    }

    const nextName = groupNameDraft.trim();
    if (!nextName) {
      setMessage("Ingresá un nombre de grupo válido.");
      return;
    }

    setRenamingGroup(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/groups/${encodeURIComponent(activeGroupId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name: nextName })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "No se pudo editar el grupo.");
      }

      await refresh();
      setEditingGroupName(false);
      setMessage("Nombre de grupo actualizado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo editar el grupo.");
    } finally {
      setRenamingGroup(false);
    }
  }

  return (
    <AppShell activeTab="configuracion">
      <TopHeader title="Grupos" userLabel={user?.name || "USUARIO"} />

      <section className="flex flex-col gap-[10px] px-5 pt-[10px]">
        <div className="h-px w-full bg-[var(--bg-surface)]" />

        <div className="rounded-[6px] border border-[var(--border-dim)] bg-[#0b0b0d] p-3">
          <p className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-white">
            <Plus size={14} />
            Crear grupo
          </p>

          <div className="mb-2 grid grid-cols-[1fr_auto] gap-2">
            <input
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              placeholder="Nombre del grupo"
              className="h-10 w-full rounded-[6px] border border-[var(--border-light)] bg-[var(--bg-surface)] px-3 text-[12px] font-semibold text-white outline-none"
            />
            <button
              type="button"
              onClick={createGroup}
              disabled={creating || !createName.trim() || !selectedLeague}
              className="h-10 rounded-[6px] bg-[var(--accent)] px-3 text-[12px] font-bold text-black disabled:opacity-60"
            >
              {creating ? "Creando..." : "Crear"}
            </button>
          </div>

          <div>
            <select
              value={selectedCompetitionKey || ""}
              onChange={(event) => setSelectedCompetitionKey(event.target.value || null)}
              className="h-10 w-full rounded-[6px] border border-[var(--border-light)] bg-[var(--bg-surface)] px-3 text-[12px] font-semibold text-white outline-none"
              disabled={loadingLeagues || leagues.length === 0}
            >
              {leagues.map((league) => (
                <option key={league.competitionKey} value={league.competitionKey}>
                  {league.name} ({league.season})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-[6px] border border-[var(--border-dim)] bg-[#0b0b0d] p-3">
          <p className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-white">
            <Users size={14} />
            Unirme por invitación
          </p>
          <div className="flex gap-2">
            <input
              value={joinCodeOrToken}
              onChange={(event) => setJoinCodeOrToken(event.target.value)}
              placeholder="Código o token"
              className="h-10 w-full rounded-[6px] border border-[var(--border-light)] bg-[var(--bg-surface)] px-3 text-[12px] font-semibold text-white outline-none"
            />
            <button
              type="button"
              onClick={joinGroup}
              disabled={joining || !joinCodeOrToken.trim()}
              className="h-10 rounded-[6px] border border-[var(--border-dim)] bg-[#111214] px-3 text-[12px] font-semibold text-[var(--text-secondary)] disabled:opacity-60"
            >
              {joining ? "Uniendo..." : "Unirme"}
            </button>
          </div>
        </div>

        <div className="rounded-[6px] border border-[var(--border-dim)] bg-[#0b0b0d] p-[10px]">
          <p className="mb-2 text-[12px] font-bold text-white">Mis grupos</p>
          <div className="space-y-2">
            {membershipsForDisplay.length === 0 ? (
              <p className="text-[11px] font-medium text-[var(--text-secondary)]">Todavía no estás en ningún grupo.</p>
            ) : (
              membershipsForDisplay.map((membership) => {
                const isActive = activeGroupId === membership.groupId;

                return (
                  <div
                    key={`${membership.groupId}-${membership.role}`}
                    className="flex items-center justify-between gap-3 rounded-[6px] border border-[var(--border-dim)] bg-[#111214] px-[10px] py-2"
                  >
                    <div className="min-w-0 flex flex-col">
                      <span className="truncate text-[12px] font-semibold text-white">{membership.groupName}</span>
                      <span className="truncate text-[10px] font-medium text-[var(--text-secondary)]">
                        {membership.leagueName} · {membership.role}
                      </span>
                    </div>
                    {isActive ? (
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
                        <button
                          type="button"
                          disabled={!canEditActiveGroup}
                          onClick={() => {
                            if (!canEditActiveGroup) return;
                            setEditingGroupName((value) => !value);
                          }}
                          className="flex h-6 w-6 items-center justify-center rounded-[6px] border border-[var(--border-dim)] bg-[#16181C]"
                          aria-label={`Editar ${membership.groupName}`}
                        >
                          <Pencil size={12} className="text-[#D2D7DF]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void leaveActiveGroup()}
                          className="flex h-6 w-6 items-center justify-center rounded-[6px] border border-[var(--border-dim)] bg-[#16181C]"
                          aria-label={`Salir de ${membership.groupName}`}
                        >
                          <X size={12} className="text-[#FF8A8A]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void copyInviteShare(membership.groupId)}
                          className="flex h-6 w-6 items-center justify-center rounded-[6px] border border-[var(--border-dim)] bg-[#16181C]"
                          aria-label={`Copiar enlace de ${membership.groupName}`}
                        >
                          <Link2 size={12} className="text-[#D2D7DF]" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveGroupId(membership.groupId);
                          }}
                          className="flex h-6 w-6 items-center justify-center rounded-[6px] border border-[var(--border-dim)] bg-[#16181C]"
                          aria-label={`Cambiar a ${membership.groupName}`}
                        >
                          <ExternalLink size={12} className="text-[#FF8A8A]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void copyInviteShare(membership.groupId)}
                          className="flex h-6 w-6 items-center justify-center rounded-[6px] border border-[var(--border-dim)] bg-[#16181C]"
                          aria-label={`Copiar enlace de ${membership.groupName}`}
                        >
                          <Link2 size={12} className="text-[#D2D7DF]" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {activeGroupId ? (
          <div className="rounded-[6px] border border-[var(--border-dim)] bg-[#0b0b0d] p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-[13px] font-semibold text-white">Invitación activa</p>
              <button
                type="button"
                disabled={refreshingInvite || !canRefreshActiveInvite}
                onClick={() => void refreshInvite()}
                className="inline-flex h-8 items-center gap-1 rounded-[6px] border border-[var(--border-dim)] bg-[#16181C] px-2 text-[11px] font-semibold text-[var(--text-secondary)] disabled:opacity-60"
              >
                <RefreshCw size={12} className={refreshingInvite ? "animate-spin" : ""} />
                {refreshingInvite ? "Regenerando" : "Regenerar"}
              </button>
            </div>

            {editingGroupName ? (
              <div className="mb-3 rounded-[6px] border border-[var(--border-dim)] bg-[#111214] p-2.5">
                <p className="mb-2 text-[10px] font-medium text-[var(--text-secondary)]">Editar nombre del grupo</p>
                <div className="flex gap-2">
                  <input
                    value={groupNameDraft}
                    onChange={(event) => setGroupNameDraft(event.target.value)}
                    className="h-9 w-full rounded-[6px] border border-[var(--border-light)] bg-[var(--bg-surface)] px-2.5 text-[12px] font-semibold text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => void renameActiveGroup()}
                    disabled={renamingGroup || !groupNameDraft.trim()}
                    className="h-9 rounded-[6px] bg-[var(--accent)] px-3 text-[11px] font-bold text-black disabled:opacity-60"
                  >
                    {renamingGroup ? "Guardando" : "Guardar"}
                  </button>
                </div>
                <p className="mt-2 text-[10px] text-[var(--text-secondary)]">La liga del grupo no se puede modificar.</p>
              </div>
            ) : null}

            {loadingInvite ? (
              <p className="text-[11px] font-medium text-[var(--text-secondary)]">Cargando invitación...</p>
            ) : activeInvite ? (
              <div className="space-y-2">
                <div className="rounded-[6px] border border-[var(--border-dim)] bg-[#111214] p-2.5">
                  <p className="text-[10px] font-medium text-[var(--text-secondary)]">Código</p>
                  <p className="mt-1 text-[14px] font-black tracking-[0.8px] text-white">{activeInvite.code}</p>
                </div>
                <div className="rounded-[6px] border border-[var(--border-dim)] bg-[#111214] p-2.5">
                  <p className="text-[10px] font-medium text-[var(--text-secondary)]">Token</p>
                  <p className="mt-1 truncate text-[11px] font-semibold text-white">{activeInvite.token}</p>
                </div>
                <p className="text-[10px] font-medium text-[var(--text-secondary)]">
                  Expira: {new Date(activeInvite.expiresAt).toLocaleString("es-AR")}
                </p>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => void copyInviteShare(activeGroupId)}
                    className="h-9 rounded-[6px] border border-[var(--border-dim)] bg-[#16181C] text-[11px] font-semibold text-[var(--text-secondary)]"
                  >
                    Copiar invitación
                  </button>
                  <button
                    type="button"
                    onClick={() => void copyInviteToken(activeGroupId)}
                    className="h-9 rounded-[6px] border border-[var(--border-dim)] bg-[#16181C] text-[11px] font-semibold text-[var(--text-secondary)]"
                  >
                    Copiar token
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!activeInvite) return;
                      await navigator.clipboard.writeText(activeInvite.code);
                      setMessage("Código copiado.");
                    }}
                    className="h-9 rounded-[6px] border border-[var(--border-dim)] bg-[#16181C] text-[11px] font-semibold text-[var(--text-secondary)]"
                  >
                    Copiar código
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-[11px] font-medium text-[var(--text-secondary)]">No hay invitación activa para este grupo.</p>
            )}
          </div>
        ) : null}

        {message ? <p className="text-[11px] font-medium text-[var(--text-secondary)]">{message}</p> : null}
      </section>
    </AppShell>
  );
}
