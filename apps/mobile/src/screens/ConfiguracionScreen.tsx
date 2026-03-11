import { useEffect, useMemo, useState } from "react";
import { DevSettings, Modal, Pressable, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { GroupMemberRecord } from "@fulbito/api-contracts";
import { colors } from "@fulbito/design-tokens";
import type { MembershipRole } from "@fulbito/domain";
import { translateBackendError } from "@fulbito/domain";
import { ScreenFrame } from "@/components/ScreenFrame";
import { HeaderActionIcons } from "@/components/HeaderActionIcons";
import { groupsRepository } from "@/repositories";
import { useAuth } from "@/state/AuthContext";
import { useGroupSelection } from "@/state/GroupContext";
import { usePendingInvite } from "@/state/PendingInviteContext";
import { useThemePreference } from "@/state/ThemePreferenceContext";

type Mode = "create" | "join";
type PendingGroupAction = { type: "leave" | "delete"; groupId: string } | null;

function stageLabel(value: string | undefined) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function memberRoleLabel(role: GroupMemberRecord["role"]) {
  if (role === "owner") return "OWNER";
  if (role === "admin") return "ADMIN";
  return "MEMBER";
}

function inviteLinkFromToken(token: string) {
  return `/configuracion?invite=${encodeURIComponent(token)}`;
}

export function ConfiguracionScreen() {
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { session, refresh } = useAuth();
  const { memberships, setSelectedGroupId } = useGroupSelection();
  const { pendingInviteToken, setPendingInviteToken, clearPendingInviteToken } = usePendingInvite();
  const { themeName, setPreference } = useThemePreference();
  const [mode, setMode] = useState<Mode>("create");
  const [groupNameInput, setGroupNameInput] = useState("");
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [manageGroupId, setManageGroupId] = useState<string | null>(null);
  const [renameGroupInput, setRenameGroupInput] = useState("");
  const [latestInviteCode, setLatestInviteCode] = useState<string | null>(null);
  const [latestInviteUrl, setLatestInviteUrl] = useState<string | null>(null);
  const [adminActionLoading, setAdminActionLoading] = useState<"rename" | "invite" | null>(null);
  const [inviteActionLoading, setInviteActionLoading] = useState<"copy" | "share" | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [manageMembers, setManageMembers] = useState<GroupMemberRecord[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberActionKey, setMemberActionKey] = useState<string | null>(null);
  const [modalViewerRole, setModalViewerRole] = useState<MembershipRole | null>(null);
  const [modalCanManage, setModalCanManage] = useState(false);
  const [pendingGroupAction, setPendingGroupAction] = useState<PendingGroupAction>(null);
  const [processingGroupAction, setProcessingGroupAction] = useState(false);
  const [themeToggleLoading, setThemeToggleLoading] = useState(false);

  const manageMembership = useMemo(
    () => memberships.find((membership) => membership.groupId === manageGroupId) ?? null,
    [manageGroupId, memberships]
  );
  const canManageSelectedGroup = Boolean(
    manageMembership && (manageMembership.role === "owner" || manageMembership.role === "admin")
  );

  const createGroupMutation = useMutation({
    mutationFn: async (name: string) =>
      groupsRepository.createGroup({
        name,
        competitionStage: "apertura",
        competitionName: "Liga Profesional",
        competitionKey: "argentina-128",
        leagueId: 128,
        season: "2026"
      }),
    onSuccess: async (group) => {
      await refresh();
      setSelectedGroupId(group.id);
      setGroupNameInput("");
      setActionStatus("Grupo creado correctamente.");
    },
    onError: (error) => {
      setActionStatus(translateBackendError(error, "No se pudo crear el grupo. Reintentá."));
    }
  });

  const joinGroupMutation = useMutation({
    mutationFn: async (codeOrToken: string) => groupsRepository.joinGroup({ codeOrToken }),
    onSuccess: async (group) => {
      const usedCodeOrToken = joinCodeInput.trim();
      await refresh();
      setSelectedGroupId(group.id);
      setJoinCodeInput("");
      if (pendingInviteToken && pendingInviteToken === usedCodeOrToken) {
        await clearPendingInviteToken();
      }
      setActionStatus("Te uniste al grupo correctamente.");
    },
    onError: (error) => {
      setActionStatus(translateBackendError(error, "No se pudo unir al grupo. Revisá el código e intentá otra vez."));
    }
  });

  const actionLoading = createGroupMutation.isPending || joinGroupMutation.isPending;

  useEffect(() => {
    const inviteFromRoute =
      typeof (route as { params?: { invite?: unknown } }).params?.invite === "string"
        ? (route as { params?: { invite?: string } }).params?.invite?.trim() || ""
        : "";
    const inviteToken = inviteFromRoute || pendingInviteToken || "";
    if (!inviteToken) {
      return;
    }
    setMode("join");
    setJoinCodeInput((current) => current || inviteToken);
    if (pendingInviteToken !== inviteToken) {
      void setPendingInviteToken(inviteToken);
    }
    setActionStatus('Invitación detectada. Revisá el código y tocá "Unirse al grupo".');
  }, [pendingInviteToken, route, setPendingInviteToken]);

  function submitCreateGroup() {
    const clean = groupNameInput.trim();
    if (!clean) {
      setActionStatus("Ingresá un nombre de grupo.");
      return;
    }
    setActionStatus(null);
    void createGroupMutation.mutateAsync(clean).catch(() => undefined);
  }

  function submitJoinGroup() {
    const clean = joinCodeInput.trim();
    if (!clean) {
      setActionStatus("Ingresá un código de invitación.");
      return;
    }
    setActionStatus(null);
    void joinGroupMutation.mutateAsync(clean).catch(() => undefined);
  }

  async function loadManageMembers(groupId: string) {
    const payload = await groupsRepository.listMembers({ groupId });
    setManageMembers(payload.members);
    setModalViewerRole(payload.viewerRole);
    setModalCanManage(payload.canManage);
  }

  async function loadManageInvite(groupId: string) {
    const payload = await groupsRepository.getInvite({ groupId });
    const inviteCode = payload.invite?.code ?? null;
    const inviteUrl = payload.inviteUrl ?? (payload.invite?.token ? inviteLinkFromToken(payload.invite.token) : null);
    setLatestInviteCode(inviteCode);
    setLatestInviteUrl(inviteUrl);
    return { inviteCode, inviteUrl };
  }

  async function openManageModal(groupId: string, currentName: string) {
    setManageGroupId(groupId);
    setRenameGroupInput(currentName);
    setLatestInviteCode(null);
    setLatestInviteUrl(null);
    setManageMembers([]);
    setModalViewerRole(null);
    setModalCanManage(false);
    setMembersLoading(true);
    setInviteLoading(true);
    try {
      await loadManageMembers(groupId);
      await loadManageInvite(groupId);
    } catch (error) {
      setActionStatus(translateBackendError(error, "No se pudieron cargar los miembros del grupo."));
    } finally {
      setMembersLoading(false);
      setInviteLoading(false);
    }
  }

  function closeManageModal() {
    setManageGroupId(null);
    setRenameGroupInput("");
    setLatestInviteCode(null);
    setLatestInviteUrl(null);
    setAdminActionLoading(null);
    setInviteActionLoading(null);
    setInviteLoading(false);
    setManageMembers([]);
    setMembersLoading(false);
    setMemberActionKey(null);
    setModalViewerRole(null);
    setModalCanManage(false);
    setPendingGroupAction(null);
    setProcessingGroupAction(false);
  }

  async function submitRenameGroup() {
    if (!manageMembership || !canManageSelectedGroup) {
      setActionStatus("Solo owners o admins pueden renombrar el grupo.");
      return;
    }

    const nextName = renameGroupInput.trim();
    if (!nextName) {
      setActionStatus("Ingresá un nombre de grupo.");
      return;
    }

    setAdminActionLoading("rename");
    try {
      const payload = await groupsRepository.updateGroupName({
        groupId: manageMembership.groupId,
        name: nextName
      });
      await refresh();
      setSelectedGroupId(payload.group.id);
      setRenameGroupInput(payload.group.name);
      setActionStatus("Nombre del grupo actualizado.");
    } catch (error) {
      setActionStatus(translateBackendError(error, "No se pudo renombrar el grupo."));
    } finally {
      setAdminActionLoading(null);
    }
  }

  async function submitRefreshInvite() {
    if (!manageMembership || !canManageSelectedGroup) {
      setActionStatus("Solo owners o admins pueden regenerar invitaciones.");
      return;
    }

    setAdminActionLoading("invite");
    try {
      const payload = await groupsRepository.refreshInvite({ groupId: manageMembership.groupId });
      setLatestInviteCode(payload.invite.code);
      setLatestInviteUrl(inviteLinkFromToken(payload.invite.token));
      setActionStatus(`Invitación actualizada. Código: ${payload.invite.code}`);
    } catch (error) {
      setActionStatus(translateBackendError(error, "No se pudo regenerar la invitación."));
    } finally {
      setAdminActionLoading(null);
    }
  }

  async function submitShareInvite() {
    if (!manageMembership || !canManageSelectedGroup) {
      setActionStatus("Solo owners o admins pueden compartir invitaciones.");
      return;
    }

    setInviteActionLoading("share");
    try {
      let code = latestInviteCode;
      let link = latestInviteUrl;
      if (!code) {
        const loadedInvite = await loadManageInvite(manageMembership.groupId);
        code = loadedInvite.inviteCode;
        link = loadedInvite.inviteUrl;
      }
      if (!code) {
        setActionStatus("No hay invitación activa para compartir.");
        return;
      }
      const message = `${link ? `${link}\n` : ""}Código: ${code}`;
      await Share.share({
        message,
        title: "Invitación Fulbito Prode"
      });
      setActionStatus("Invitación compartida.");
    } catch (error) {
      setActionStatus(translateBackendError(error, "No se pudo compartir la invitación."));
    } finally {
      setInviteActionLoading(null);
    }
  }

  async function submitCopyInvite() {
    if (!manageMembership || !canManageSelectedGroup) {
      setActionStatus("Solo owners o admins pueden copiar invitaciones.");
      return;
    }

    setInviteActionLoading("copy");
    try {
      let code = latestInviteCode;
      let link = latestInviteUrl;
      if (!code) {
        const loadedInvite = await loadManageInvite(manageMembership.groupId);
        code = loadedInvite.inviteCode;
        link = loadedInvite.inviteUrl;
      }
      if (!code) {
        setActionStatus("No hay invitación activa para copiar.");
        return;
      }

      const text = `${link ? `${link}\n` : ""}Código: ${code}`;
      const maybeClipboard = (globalThis as { navigator?: { clipboard?: { writeText?: (value: string) => Promise<void> } } }).navigator?.clipboard;
      if (maybeClipboard?.writeText) {
        await maybeClipboard.writeText(text);
        setActionStatus("Invitación copiada.");
        return;
      }

      await Share.share({
        message: text,
        title: "Copiar invitación Fulbito Prode"
      });
      setActionStatus("No se pudo copiar automáticamente. Abrimos compartir para que puedas copiar.");
    } catch (error) {
      setActionStatus(translateBackendError(error, "No se pudo copiar la invitación."));
    } finally {
      setInviteActionLoading(null);
    }
  }

  async function submitPromoteMember(member: GroupMemberRecord) {
    if (!manageMembership) {
      return;
    }
    if (!canManageSelectedGroup || !modalCanManage) {
      setActionStatus("Solo owners o admins pueden gestionar miembros.");
      return;
    }
    if (member.role !== "member") {
      return;
    }

    const actionKey = `promote:${member.userId}`;
    setMemberActionKey(actionKey);
    try {
      await groupsRepository.updateMemberRole({
        groupId: manageMembership.groupId,
        userId: member.userId,
        role: "admin"
      });
      await loadManageMembers(manageMembership.groupId);
      setActionStatus(`${member.name} ahora es admin.`);
    } catch (error) {
      setActionStatus(translateBackendError(error, "No se pudo actualizar el rol."));
    } finally {
      setMemberActionKey(null);
    }
  }

  async function submitRemoveMember(member: GroupMemberRecord) {
    if (!manageMembership) {
      return;
    }
    if (!canManageSelectedGroup || !modalCanManage) {
      setActionStatus("Solo owners o admins pueden gestionar miembros.");
      return;
    }
    if (member.role === "owner") {
      setActionStatus("No podés quitar al owner del grupo.");
      return;
    }

    const actionKey = `remove:${member.userId}`;
    setMemberActionKey(actionKey);
    try {
      await groupsRepository.removeMember({
        groupId: manageMembership.groupId,
        userId: member.userId
      });
      await loadManageMembers(manageMembership.groupId);
      setActionStatus(`${member.name} fue removido del grupo.`);
    } catch (error) {
      setActionStatus(translateBackendError(error, "No se pudo quitar al miembro."));
    } finally {
      setMemberActionKey(null);
    }
  }

  function requestLeaveGroup() {
    if (!manageMembership) return;
    setPendingGroupAction({
      type: "leave",
      groupId: manageMembership.groupId
    });
  }

  function requestDeleteGroup() {
    if (!manageMembership || !canManageSelectedGroup) return;
    setPendingGroupAction({
      type: "delete",
      groupId: manageMembership.groupId
    });
  }

  function closePendingGroupAction() {
    if (processingGroupAction) {
      return;
    }
    setPendingGroupAction(null);
  }

  async function submitPendingGroupAction() {
    const action = pendingGroupAction;
    if (!action) {
      return;
    }

    setProcessingGroupAction(true);
    try {
      if (action.type === "leave") {
        const payload = await groupsRepository.leaveGroup({ groupId: action.groupId });
        await refresh();
        closeManageModal();
        setActionStatus(
          payload.deletedGroup
            ? "Saliste del grupo y quedó dado de baja por falta de miembros."
            : "Saliste del grupo correctamente."
        );
      } else {
        const payload = await groupsRepository.deleteGroup({ groupId: action.groupId });
        await refresh();
        closeManageModal();
        setActionStatus(
          payload.warningRequired
            ? "Grupo eliminado. Quedó marcado como inactivo."
            : "Grupo eliminado correctamente."
        );
      }
    } catch (error) {
      setActionStatus(
        translateBackendError(
          error,
          action.type === "leave" ? "No se pudo salir del grupo." : "No se pudo eliminar el grupo."
        )
      );
    } finally {
      setProcessingGroupAction(false);
      setPendingGroupAction(null);
    }
  }

  async function toggleTheme() {
    const nextTheme = themeName === "dark" ? "light" : "dark";
    setThemeToggleLoading(true);
    try {
      await setPreference(nextTheme);
      const nextThemeLabel = nextTheme === "dark" ? "oscuro" : "claro";
      if (typeof DevSettings.reload === "function") {
        setActionStatus(`Tema ${nextThemeLabel} aplicado. Reiniciando interfaz...`);
        DevSettings.reload();
        return;
      }
      setActionStatus(`Tema ${nextThemeLabel} guardado. Reiniciá la app para aplicarlo en todas las pantallas.`);
    } catch (error) {
      setActionStatus(translateBackendError(error, "No se pudo actualizar el tema."));
    } finally {
      setThemeToggleLoading(false);
    }
  }

  return (
    <ScreenFrame
      title="Grupos"
      subtitle="Gestión social"
      hideDataModeBadge
      containerStyle={styles.screenContainer}
      contentStyle={styles.screenContent}
      header={
        <View style={[styles.headerCard, { paddingTop: Math.max(insets.top, 10) + 2 }]}>
          <View style={styles.brandRow}>
            <HeaderActionIcons />
          </View>
          <View style={styles.titleRow}>
            <View style={styles.sectionIcon}>
              <Text allowFontScaling={false} style={styles.sectionIconText}>◍</Text>
            </View>
            <Text allowFontScaling={false} style={styles.sectionTitle}>Grupos</Text>
            <Text allowFontScaling={false} style={styles.sectionSubtitle}>Gestión social</Text>
          </View>
        </View>
      }
    >
      <View style={styles.tabBar}>
        <Pressable onPress={() => setMode("create")} style={[styles.tab, mode === "create" ? styles.tabActive : null]}>
          <Text allowFontScaling={false} style={[styles.tabLabel, mode === "create" ? styles.tabLabelActive : null]}>Crear Grupo</Text>
        </Pressable>
        <Pressable onPress={() => setMode("join")} style={[styles.tab, mode === "join" ? styles.tabActive : null]}>
          <Text allowFontScaling={false} style={[styles.tabLabel, mode === "join" ? styles.tabLabelActive : null]}>Unirse</Text>
        </Pressable>
      </View>

      <View style={styles.themeCard}>
        <View style={styles.themeMeta}>
          <Text allowFontScaling={false} style={styles.themeLabel}>Tema</Text>
          <Text allowFontScaling={false} style={styles.themeValue}>{themeName === "dark" ? "Oscuro" : "Claro"}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cambiar tema"
          disabled={themeToggleLoading}
          onPress={() => void toggleTheme()}
          style={[styles.themeToggleButton, themeToggleLoading ? styles.buttonDisabled : null]}
        >
          <Text allowFontScaling={false} style={styles.themeToggleButtonText}>
            {themeToggleLoading ? "Aplicando..." : themeName === "dark" ? "Pasar a claro" : "Pasar a oscuro"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.formCard}>
        {mode === "create" ? (
          <>
            <TextInput
              editable={!actionLoading}
              value={groupNameInput}
              onChangeText={setGroupNameInput}
              placeholder="Nombre del nuevo grupo"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
            <View style={styles.row}>
              <TextInput editable={false} value="Liga Profesional Apertura" style={[styles.input, styles.rowInput]} />
              <Pressable disabled={actionLoading} onPress={submitCreateGroup} style={[styles.plusButton, actionLoading ? styles.buttonDisabled : null]}>
                <Text allowFontScaling={false} style={styles.plusText}>{actionLoading ? "…" : "+"}</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <TextInput
              editable={!actionLoading}
              value={joinCodeInput}
              onChangeText={setJoinCodeInput}
              placeholder="Código de invitación"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              style={styles.input}
            />
            <Pressable disabled={actionLoading} onPress={submitJoinGroup} style={[styles.joinButton, actionLoading ? styles.buttonDisabled : null]}>
              <Text allowFontScaling={false} style={styles.joinButtonText}>{actionLoading ? "Uniendo..." : "Unirse al grupo"}</Text>
            </Pressable>
          </>
        )}
      </View>
      {actionStatus ? <Text allowFontScaling={false} style={styles.statusText}>{actionStatus}</Text> : null}

      <View style={styles.listHeaderRow}>
        <Text allowFontScaling={false} style={styles.listHeader}>Mis Grupos</Text>
        <Text allowFontScaling={false} style={styles.listCount}>{memberships.length}</Text>
      </View>

      {memberships.map((membership) => (
        <View key={membership.groupId} style={styles.groupCard}>
          <View style={styles.avatarBox}>
            <Text allowFontScaling={false} style={styles.avatarText}>
              {membership.groupName
                .split(/\s+/)
                .map((token) => token[0] ?? "")
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </Text>
          </View>
          <View style={styles.groupInfo}>
            <Text allowFontScaling={false} numberOfLines={1} style={styles.groupName}>{membership.groupName}</Text>
            <Text allowFontScaling={false} numberOfLines={1} style={styles.groupMeta}>
              {stageLabel(membership.competitionStage)} {membership.leagueName}
            </Text>
          </View>
          <View style={styles.groupActions}>
            <View style={styles.ownerChip}>
              <Text allowFontScaling={false} style={styles.ownerChipText}>{membership.role.toUpperCase()}</Text>
            </View>
            <Pressable
              onPress={() => openManageModal(membership.groupId, membership.groupName)}
              hitSlop={11}
              style={styles.settingsWrap}
              accessibilityRole="button"
              accessibilityLabel={`Gestionar ${membership.groupName}`}
            >
              <Text allowFontScaling={false} style={styles.settingsGlyph}>≣</Text>
            </Pressable>
          </View>
        </View>
      ))}

      <Modal visible={Boolean(manageMembership)} animationType="slide" transparent onRequestClose={closeManageModal}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={closeManageModal} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <View>
                <Text allowFontScaling={false} style={styles.modalLabel}>Gestionar Grupo</Text>
                <Text allowFontScaling={false} style={styles.modalTitle}>{manageMembership?.groupName ?? "Grupo"}</Text>
              </View>
              <Pressable onPress={closeManageModal} hitSlop={6} style={styles.modalClose}>
                <Text allowFontScaling={false} style={styles.modalCloseGlyph}>✕</Text>
              </Pressable>
            </View>

            {canManageSelectedGroup ? (
              <>
                <TextInput
                  editable={adminActionLoading === null}
                  value={renameGroupInput}
                  onChangeText={setRenameGroupInput}
                  placeholder="Nuevo nombre del grupo"
                  placeholderTextColor={colors.textMuted}
                  style={styles.modalInput}
                />
                <Pressable
                  onPress={() => void submitRenameGroup()}
                  disabled={adminActionLoading !== null}
                  style={[styles.modalPrimaryButton, adminActionLoading !== null ? styles.buttonDisabled : null]}
                >
                  <Text allowFontScaling={false} style={styles.modalPrimaryText}>
                    {adminActionLoading === "rename" ? "Guardando..." : "Guardar nombre"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => void submitRefreshInvite()}
                  disabled={adminActionLoading !== null}
                  style={[styles.modalSecondaryButton, adminActionLoading !== null ? styles.buttonDisabled : null]}
                >
                  <Text allowFontScaling={false} style={styles.modalSecondaryText}>
                    {adminActionLoading === "invite" ? "Actualizando..." : "Regenerar invitación"}
                  </Text>
                </Pressable>
                {latestInviteCode ? <Text allowFontScaling={false} style={styles.inviteCodeText}>Código nuevo: {latestInviteCode}</Text> : null}
                {inviteLoading ? <Text allowFontScaling={false} style={styles.modalHint}>Cargando invitación...</Text> : null}
                {latestInviteCode ? (
                  <Text allowFontScaling={false} style={styles.inviteCodeText}>
                    Invitación activa: {latestInviteCode}
                  </Text>
                ) : null}
                {latestInviteUrl ? (
                  <Text allowFontScaling={false} numberOfLines={2} style={styles.inviteLinkText}>
                    {latestInviteUrl}
                  </Text>
                ) : null}
                <View style={styles.inviteActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Copiar invitación"
                    disabled={inviteActionLoading !== null}
                    onPress={() => void submitCopyInvite()}
                    style={[styles.memberActionButton, inviteActionLoading !== null ? styles.memberActionDisabled : null]}
                  >
                    <Text allowFontScaling={false} style={styles.memberActionText}>
                      {inviteActionLoading === "copy" ? "..." : "Copiar invitación"}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Compartir invitación"
                    disabled={inviteActionLoading !== null}
                    onPress={() => void submitShareInvite()}
                    style={[styles.memberActionButton, inviteActionLoading !== null ? styles.memberActionDisabled : null]}
                  >
                    <Text allowFontScaling={false} style={styles.memberActionText}>
                      {inviteActionLoading === "share" ? "..." : "Compartir invitación"}
                    </Text>
                  </Pressable>
                </View>

                <Text allowFontScaling={false} style={styles.membersTitle}>MIEMBROS</Text>
                {membersLoading ? <Text allowFontScaling={false} style={styles.modalHint}>Cargando miembros...</Text> : null}
                {!membersLoading && manageMembers.length === 0 ? (
                  <Text allowFontScaling={false} style={styles.modalHint}>Sin miembros registrados.</Text>
                ) : null}
                {!membersLoading
                  ? manageMembers.map((member) => {
                      const isSelf = member.userId === session?.user.id;
                      const canPromoteMember =
                        canManageSelectedGroup &&
                        modalCanManage &&
                        member.role === "member" &&
                        !isSelf;
                      const canKickMember =
                        canManageSelectedGroup &&
                        modalCanManage &&
                        member.role !== "owner" &&
                        !isSelf &&
                        !(modalViewerRole === "admin" && member.role === "admin");
                      return (
                        <View key={member.userId} style={styles.memberRow}>
                          <View style={styles.memberMain}>
                            <Text allowFontScaling={false} numberOfLines={1} style={styles.memberName}>{member.name}</Text>
                            <View style={styles.memberRoleChip}>
                              <Text allowFontScaling={false} style={styles.memberRoleText}>{memberRoleLabel(member.role)}</Text>
                            </View>
                          </View>
                          <View style={styles.memberActions}>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Promover ${member.name}`}
                              disabled={!canPromoteMember || memberActionKey !== null}
                              onPress={() => void submitPromoteMember(member)}
                              style={[styles.memberActionButton, !canPromoteMember ? styles.memberActionDisabled : null]}
                            >
                              <Text allowFontScaling={false} style={styles.memberActionText}>
                                {memberActionKey === `promote:${member.userId}` ? "..." : "Hacer admin"}
                              </Text>
                            </Pressable>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Quitar ${member.name}`}
                              disabled={!canKickMember || memberActionKey !== null}
                              onPress={() => void submitRemoveMember(member)}
                              style={[styles.memberActionDangerButton, !canKickMember ? styles.memberActionDisabled : null]}
                            >
                              <Text allowFontScaling={false} style={styles.memberActionDangerText}>
                                {memberActionKey === `remove:${member.userId}` ? "..." : "Quitar"}
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      );
                    })
                  : null}
              </>
            ) : (
              <Text allowFontScaling={false} style={styles.modalHint}>Solo owners o admins pueden modificar este grupo.</Text>
            )}

            <Text allowFontScaling={false} style={styles.membersTitle}>ACCIONES</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Salir de ${manageMembership?.groupName ?? "grupo"}`}
              onPress={requestLeaveGroup}
              style={styles.destructiveButton}
            >
              <Text allowFontScaling={false} style={styles.destructiveButtonText}>Salir del grupo</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Eliminar ${manageMembership?.groupName ?? "grupo"}`}
              disabled={!canManageSelectedGroup}
              onPress={requestDeleteGroup}
              style={[styles.destructiveDangerButton, !canManageSelectedGroup ? styles.memberActionDisabled : null]}
            >
              <Text allowFontScaling={false} style={styles.destructiveDangerButtonText}>Eliminar grupo</Text>
            </Pressable>

            <Pressable onPress={closeManageModal} style={styles.modalCloseButton}>
              <Text allowFontScaling={false} style={styles.modalCloseButtonText}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(pendingGroupAction)} transparent animationType="fade" onRequestClose={closePendingGroupAction}>
        <View style={styles.confirmRoot}>
          <Pressable style={styles.confirmBackdrop} onPress={closePendingGroupAction} />
          <View style={styles.confirmCard}>
            <Text allowFontScaling={false} style={styles.confirmTitle}>
              {pendingGroupAction?.type === "leave" ? "Confirmar salida" : "Confirmar eliminación"}
            </Text>
            <Text allowFontScaling={false} style={styles.confirmDescription}>
              {pendingGroupAction?.type === "leave"
                ? "Vas a salir del grupo. Esta acción se puede revertir solo con una nueva invitación."
                : "Vas a eliminar el grupo. Esta acción impacta a todos los miembros."}
            </Text>
            <View style={styles.confirmActions}>
              <Pressable
                accessibilityRole="button"
                disabled={processingGroupAction}
                onPress={closePendingGroupAction}
                style={[styles.confirmCancelButton, processingGroupAction ? styles.memberActionDisabled : null]}
              >
                <Text allowFontScaling={false} style={styles.confirmCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={processingGroupAction}
                onPress={() => void submitPendingGroupAction()}
                style={[styles.confirmSubmitButton, processingGroupAction ? styles.memberActionDisabled : null]}
              >
                <Text allowFontScaling={false} style={styles.confirmSubmitText}>
                  {processingGroupAction ? "Procesando..." : "Confirmar"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    paddingHorizontal: 12,
    paddingTop: 0,
    paddingBottom: 0,
    backgroundColor: colors.canvas
  },
  screenContent: {
    gap: 10
  },
  headerCard: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginHorizontal: -12
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8
  },
  profileDot: {
    height: 32,
    width: 32,
    borderRadius: 999,
    backgroundColor: colors.brandTint,
    alignItems: "center",
    justifyContent: "center"
  },
  profileDotText: {
    color: colors.iconStrong,
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.2
  },
  titleRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  sectionIcon: {
    height: 34,
    width: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryStrong
  },
  sectionIconText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.textStrong
  },
  sectionTitle: {
    color: colors.textTitle,
    fontSize: 24,
    fontWeight: "800"
  },
  sectionSubtitle: {
    marginLeft: "auto",
    color: colors.textMutedAlt,
    fontSize: 12,
    fontWeight: "700"
  },
  tabBar: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceSoft,
    overflow: "hidden"
  },
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center"
  },
  tabActive: {
    backgroundColor: colors.primarySoft,
    borderBottomWidth: 2,
    borderBottomColor: colors.primaryStrong
  },
  tabLabel: {
    color: colors.textMutedAlt,
    fontSize: 14,
    fontWeight: "700"
  },
  tabLabelActive: {
    color: colors.primaryAccent,
    fontWeight: "800"
  },
  themeCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  themeMeta: {
    flex: 1
  },
  themeLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  themeValue: {
    marginTop: 2,
    color: colors.textHigh,
    fontSize: 15,
    fontWeight: "800"
  },
  themeToggleButton: {
    minHeight: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12
  },
  themeToggleButtonText: {
    color: colors.primaryAccent,
    fontSize: 12,
    fontWeight: "900"
  },
  formCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceSoft,
    padding: 10,
    gap: 7
  },
  input: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    backgroundColor: colors.brandTintAlt,
    paddingHorizontal: 12,
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "700"
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  rowInput: {
    flex: 1
  },
  plusButton: {
    height: 44,
    width: 44,
    borderRadius: 10,
    backgroundColor: colors.primaryLime,
    alignItems: "center",
    justifyContent: "center"
  },
  plusText: {
    color: colors.textSlateSoft,
    fontSize: 22,
    lineHeight: 22
  },
  buttonDisabled: {
    opacity: 0.65
  },
  joinButton: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: colors.primaryStrong,
    alignItems: "center",
    justifyContent: "center"
  },
  joinButtonText: {
    color: colors.textHigh,
    fontWeight: "800",
    fontSize: 15
  },
  listHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  listHeader: {
    color: colors.textHigh,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "800"
  },
  listCount: {
    marginTop: 5,
    color: colors.textGray,
    fontSize: 14,
    fontWeight: "700"
  },
  groupCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceSoft,
    minHeight: 62,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  avatarBox: {
    height: 36,
    width: 36,
    borderRadius: 10,
    backgroundColor: colors.brandTint,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarText: {
    color: colors.primaryTextSoft,
    fontSize: 16,
    lineHeight: 18,
    fontWeight: "900"
  },
  groupInfo: {
    flex: 1
  },
  groupName: {
    color: colors.textHigh,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "800"
  },
  groupMeta: {
    marginTop: 2,
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: "700"
  },
  ownerChip: {
    paddingHorizontal: 9,
    height: 22,
    borderRadius: 999,
    backgroundColor: colors.surfaceTintWarm,
    alignItems: "center",
    justifyContent: "center"
  },
  ownerChipText: {
    color: colors.warningDeep,
    fontSize: 11,
    fontWeight: "900"
  },
  groupActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  settingsWrap: {
    height: 22,
    width: 22,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceTintNeutral
  },
  settingsGlyph: {
    color: colors.textSoft,
    fontSize: 14
  },
  statusText: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: "700"
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end"
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 16,
    paddingBottom: 18,
    paddingTop: 10,
    gap: 10
  },
  modalHandle: {
    alignSelf: "center",
    width: 40,
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.borderSubtle
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  modalLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  modalTitle: {
    marginTop: 2,
    color: colors.textHigh,
    fontSize: 20,
    fontWeight: "900"
  },
  modalClose: {
    height: 32,
    width: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceTintNeutral
  },
  modalCloseGlyph: {
    color: colors.textTertiary,
    fontSize: 13,
    fontWeight: "800"
  },
  modalInput: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    color: colors.textHigh,
    fontSize: 14,
    fontWeight: "700"
  },
  modalPrimaryButton: {
    minHeight: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryStrong
  },
  modalPrimaryText: {
    color: colors.textHigh,
    fontSize: 15,
    fontWeight: "800"
  },
  modalSecondaryButton: {
    minHeight: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  modalSecondaryText: {
    color: colors.textBody,
    fontSize: 13,
    fontWeight: "800"
  },
  inviteCodeText: {
    color: colors.textSlateStrong,
    fontSize: 12,
    fontWeight: "700"
  },
  inviteLinkText: {
    color: colors.textBodyMuted,
    fontSize: 12,
    fontWeight: "700"
  },
  inviteActions: {
    flexDirection: "row",
    gap: 8
  },
  membersTitle: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.6
  },
  memberRow: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
    padding: 8,
    gap: 8
  },
  memberMain: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8
  },
  memberName: {
    flex: 1,
    color: colors.textHigh,
    fontSize: 14,
    fontWeight: "700",
    marginRight: 8
  },
  memberRoleChip: {
    borderRadius: 999,
    minHeight: 20,
    paddingHorizontal: 8,
    backgroundColor: colors.surfaceTintBlue,
    alignItems: "center",
    justifyContent: "center"
  },
  memberRoleText: {
    color: colors.textBodyMuted,
    fontSize: 11,
    fontWeight: "900"
  },
  memberActions: {
    flexDirection: "row",
    gap: 6
  },
  memberActionButton: {
    minHeight: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderInfo,
    backgroundColor: colors.surfaceTintBlueSoft,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10
  },
  memberActionText: {
    color: colors.textBody,
    fontSize: 13,
    fontWeight: "900"
  },
  memberActionDangerButton: {
    minHeight: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderDangerMuted,
    backgroundColor: colors.surfaceTintDangerSoft,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10
  },
  memberActionDangerText: {
    color: colors.dangerDeep,
    fontSize: 13,
    fontWeight: "900"
  },
  memberActionDisabled: {
    opacity: 0.45
  },
  destructiveButton: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center"
  },
  destructiveButtonText: {
    color: colors.textBody,
    fontSize: 15,
    fontWeight: "800"
  },
  destructiveDangerButton: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderDangerMuted,
    backgroundColor: colors.surfaceTintDangerSoft,
    alignItems: "center",
    justifyContent: "center"
  },
  destructiveDangerButtonText: {
    color: colors.dangerDeep,
    fontSize: 15,
    fontWeight: "900"
  },
  modalHint: {
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: "600"
  },
  modalCloseButton: {
    minHeight: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface
  },
  modalCloseButtonText: {
    color: colors.textBody,
    fontSize: 13,
    fontWeight: "700"
  },
  confirmRoot: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20
  },
  confirmBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay
  },
  confirmCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceSoft,
    padding: 14,
    gap: 10
  },
  confirmTitle: {
    color: colors.textHigh,
    fontSize: 18,
    fontWeight: "900"
  },
  confirmDescription: {
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: "700"
  },
  confirmActions: {
    flexDirection: "row",
    gap: 8
  },
  confirmCancelButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center"
  },
  confirmCancelText: {
    color: colors.textBody,
    fontSize: 13,
    fontWeight: "800"
  },
  confirmSubmitButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: colors.textStrong,
    alignItems: "center",
    justifyContent: "center"
  },
  confirmSubmitText: {
    color: colors.textInverse,
    fontSize: 15,
    fontWeight: "900"
  }
});
