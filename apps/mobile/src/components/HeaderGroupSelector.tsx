import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, LayoutAnimation, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, UIManager, View } from "react-native";
import { NavigationContext } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import type { Membership, MembershipRole } from "@fulbito/domain";
import type { JoinRequestRecord } from "@fulbito/api-contracts";
import { colors, spacing } from "@fulbito/design-tokens";
import { groupsRepository } from "@/repositories";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface HeaderGroupSelectorProps {
  memberships: Membership[];
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string) => void;
  onRenameGroup?: (groupId: string, name: string) => Promise<void>;
  onCheckLeave?: (groupId: string) => Promise<{ isSoleMember: boolean; isSoleAdmin: boolean }>;
  onLeaveGroup?: (groupId: string) => Promise<void>;
  onDeleteGroup?: (groupId: string) => Promise<void>;
  onOpenChange?: (isOpen: boolean) => void;
  forceClose?: boolean;
  actionIcons?: React.ReactNode;
}

const LPF_APERTURA_2026_LABEL = "LPF: Apertura (2026)";

function competitionLabel(membership: Membership) {
  if (membership.competitionStage === "apertura") {
    return LPF_APERTURA_2026_LABEL;
  }
  return membership.competitionName || membership.leagueName || "Competencia";
}

function groupInitial(name: string) {
  return (name.trim()[0] ?? "G").toUpperCase();
}

function isAdmin(role: MembershipRole) {
  return role === "owner" || role === "admin";
}

function animate() {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

export function HeaderGroupSelector({ memberships, selectedGroupId, onSelectGroup, onRenameGroup, onCheckLeave, onLeaveGroup, onDeleteGroup, onOpenChange, forceClose, actionIcons }: HeaderGroupSelectorProps) {
  const [saving, setSaving] = useState(false);
  const navigation = useContext(NavigationContext) as { navigate?: (route: string) => void } | null;
  const panelRef = useRef<View | null>(null);
  const [open, setOpen] = useState(false);
  const [actionsGroupId, setActionsGroupId] = useState<string | null>(null);
  const [popoverPos, setPopoverPos] = useState({ top: 0, right: 0 });
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [joinRequestsGroupId, setJoinRequestsGroupId] = useState<string | null>(null);
  const [joinRequests, setJoinRequests] = useState<JoinRequestRecord[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [respondingUserId, setRespondingUserId] = useState<string | null>(null);

  const activeMembership = useMemo(
    () => memberships.find((m) => m.groupId === selectedGroupId) || memberships[0] || null,
    [memberships, selectedGroupId]
  );

  const actionsMembership = useMemo(
    () => memberships.find((m) => m.groupId === actionsGroupId) || null,
    [memberships, actionsGroupId]
  );

  const editingMembership = useMemo(
    () => memberships.find((m) => m.groupId === editingGroupId) || null,
    [memberships, editingGroupId]
  );

  const triggerLabel = activeMembership?.groupName || "Sin grupo";
  const showEditName = editingGroupId !== null;
  const showJoinRequests = joinRequestsGroupId !== null;
  const showSubPanel = showEditName || showJoinRequests;

  function toggleOpen() {
    if (memberships.length === 0) return;
    animate();
    if (open) {
      closePanel();
    } else {
      setActionsGroupId(null);
      setEditingGroupId(null);
      setOpen(true);
      onOpenChange?.(true);
    }
  }

  function closePanel() {
    animate();
    setOpen(false);
    setActionsGroupId(null);
    setEditingGroupId(null);
    setEditingName("");
    setJoinRequestsGroupId(null);
    setJoinRequests([]);
    onOpenChange?.(false);
  }

  // Close panel when dismissed externally (overlay tap or tab switch)
  useEffect(() => {
    if (forceClose && open) {
      closePanel();
    }
  }, [forceClose]); // eslint-disable-line react-hooks/exhaustive-deps

  function goToUnirseCrearGrupo() {
    closePanel();
    navigation?.navigate?.("UnirseCrearGrupo");
  }

  function openActions(groupId: string, buttonRef: View | null) {
    if (actionsGroupId === groupId) {
      setActionsGroupId(null);
      return;
    }
    if (buttonRef && panelRef.current) {
      buttonRef.measureLayout(
        panelRef.current,
        (_x, y, _w, h) => {
          setPopoverPos({ top: y + h + 4, right: 4 });
          setActionsGroupId(groupId);
        },
        () => {
          setPopoverPos({ top: 0, right: 4 });
          setActionsGroupId(groupId);
        }
      );
    } else {
      setActionsGroupId(groupId);
    }
  }

  function dismissPopover() {
    setActionsGroupId(null);
  }

  async function handleShare() {
    if (!actionsMembership) return;
    dismissPopover();
    try {
      const { invite, canRefresh } = await groupsRepository.getInvite({ groupId: actionsMembership.groupId });
      let inviteToken = invite?.token ?? null;

      if (!inviteToken && canRefresh) {
        const refreshed = await groupsRepository.refreshInvite({ groupId: actionsMembership.groupId });
        inviteToken = refreshed.invite.token;
      }

      if (!inviteToken) {
        Alert.alert("Error", "No hay un link de invitación activo. Pedile a un admin que genere uno nuevo.");
        return;
      }

      const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL || "https://api.fulbitoprode.com";
      const link = `${apiBase}/join?invite=${encodeURIComponent(inviteToken)}`;
      await Share.share({
        message: `Unite a mi grupo "${actionsMembership.groupName}" en Fulbito Prode:\n${link}`
      });
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "No se pudo generar el link de invitación.");
    }
  }

  function handleEditName() {
    if (!actionsMembership) return;
    const membership = actionsMembership;
    dismissPopover();
    animate();
    setEditingGroupId(membership.groupId);
    setEditingName(membership.groupName);
  }

  function handleSaveName() {
    if (!editingMembership || !editingName.trim() || saving) return;
    const groupId = editingMembership.groupId;
    const name = editingName.trim();
    setSaving(true);
    void (async () => {
      try {
        await onRenameGroup?.(groupId, name);
        animate();
        setEditingGroupId(null);
        setEditingName("");
      } catch (error) {
        Alert.alert("Error", error instanceof Error ? error.message : "No se pudo renombrar el grupo.");
      } finally {
        setSaving(false);
      }
    })();
  }

  function cancelEditName() {
    animate();
    setEditingGroupId(null);
    setEditingName("");
  }

  function handleViewJoinRequests() {
    if (!actionsMembership) return;
    const groupId = actionsMembership.groupId;
    dismissPopover();
    animate();
    setJoinRequestsGroupId(groupId);
    setLoadingRequests(true);
    void (async () => {
      try {
        const result = await groupsRepository.listJoinRequests({ groupId });
        setJoinRequests(result.requests);
      } catch {
        Alert.alert("Error", "No se pudieron cargar las solicitudes.");
      } finally {
        setLoadingRequests(false);
      }
    })();
  }

  function cancelJoinRequests() {
    animate();
    setJoinRequestsGroupId(null);
    setJoinRequests([]);
  }

  function handleRespondToRequest(targetUserId: string, action: "approve" | "reject") {
    if (!joinRequestsGroupId || respondingUserId) return;
    const label = action === "approve" ? "aprobar" : "rechazar";
    const request = joinRequests.find((r) => r.userId === targetUserId);
    const userName = request?.userName || "este usuario";

    Alert.alert(
      action === "approve" ? "Aprobar solicitud" : "Rechazar solicitud",
      `¿Querés ${label} la solicitud de ${userName}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: action === "approve" ? "Aprobar" : "Rechazar",
          style: action === "reject" ? "destructive" : "default",
          onPress: () => {
            setRespondingUserId(targetUserId);
            void (async () => {
              try {
                await groupsRepository.respondToJoinRequest({
                  groupId: joinRequestsGroupId,
                  userId: targetUserId,
                  action
                });
                setJoinRequests((prev) => prev.filter((r) => r.userId !== targetUserId));
                Alert.alert(
                  "Listo",
                  action === "approve"
                    ? `${userName} fue aceptado en el grupo.`
                    : `La solicitud de ${userName} fue rechazada.`
                );
              } catch (error) {
                Alert.alert("Error", error instanceof Error ? error.message : "No se pudo procesar la solicitud.");
              } finally {
                setRespondingUserId(null);
              }
            })();
          }
        }
      ]
    );
  }

  function handleLeave() {
    if (!actionsMembership) return;
    const name = actionsMembership.groupName;
    const groupId = actionsMembership.groupId;
    const memberIsAdmin = isAdmin(actionsMembership.role);
    dismissPopover();

    if (!memberIsAdmin) {
      // Regular members can leave freely
      Alert.alert(
        "Salir del grupo",
        `¿Seguro que querés salir de "${name}"?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Salir",
            style: "destructive",
            onPress: () => {
              closePanel();
              void (async () => {
                try {
                  await onLeaveGroup?.(groupId);
                } catch (error) {
                  Alert.alert("Error", error instanceof Error ? error.message : "No se pudo salir del grupo.");
                }
              })();
            }
          }
        ]
      );
      return;
    }

    // Admin/owner: need to check member count before confirming
    void (async () => {
      try {
        const info = await onCheckLeave?.(groupId);
        if (!info) return;

        if (info.isSoleMember) {
          Alert.alert(
            "Sos el único miembro",
            `No podés salir de "${name}" porque sos el único miembro. ¿Querés eliminar el grupo?`,
            [
              { text: "Cancelar", style: "cancel" },
              {
                text: "Eliminar",
                style: "destructive",
                onPress: () => {
                  closePanel();
                  void (async () => {
                    try {
                      await onDeleteGroup?.(groupId);
                    } catch (error) {
                      Alert.alert("Error", error instanceof Error ? error.message : "No se pudo eliminar el grupo.");
                    }
                  })();
                }
              }
            ]
          );
          return;
        }

        const message = info.isSoleAdmin
          ? `Sos el único admin de "${name}". Si salís, se asignará un admin nuevo automáticamente. ¿Querés salir?`
          : `¿Seguro que querés salir de "${name}"?`;

        Alert.alert(
          "Salir del grupo",
          message,
          [
            { text: "Cancelar", style: "cancel" },
            {
              text: "Salir",
              style: "destructive",
              onPress: () => {
                closePanel();
                void (async () => {
                  try {
                    await onLeaveGroup?.(groupId);
                  } catch (error) {
                    Alert.alert("Error", error instanceof Error ? error.message : "No se pudo salir del grupo.");
                  }
                })();
              }
            }
          ]
        );
      } catch (error) {
        Alert.alert("Error", error instanceof Error ? error.message : "No se pudo verificar el estado del grupo.");
      }
    })();
  }

  function handleDelete() {
    if (!actionsMembership) return;
    const name = actionsMembership.groupName;
    const groupId = actionsMembership.groupId;
    dismissPopover();
    Alert.alert(
      "Eliminar grupo",
      `¿Seguro que querés eliminar "${name}"? Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            closePanel();
            void (async () => {
              try {
                await onDeleteGroup?.(groupId);
              } catch (error) {
                Alert.alert("Error", error instanceof Error ? error.message : "No se pudo eliminar el grupo.");
              }
            })();
          }
        }
      ]
    );
  }

  const actionsIsAdmin = actionsMembership ? isAdmin(actionsMembership.role) : false;

  return (
    <View>
      {/* Top row: trigger + action icons */}
      <View style={styles.topRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Seleccionar grupo"
          onPress={toggleOpen}
          style={[styles.trigger, memberships.length === 0 && styles.triggerDisabled]}
        >
          <View style={styles.triggerAvatar}>
            <Ionicons name="people" size={18} color={colors.textTitle} />
          </View>
          <View style={styles.triggerLabelWrap}>
            <Text allowFontScaling={false} numberOfLines={1} style={styles.triggerText}>
              {triggerLabel}
            </Text>
            {activeMembership ? (
              <Text allowFontScaling={false} numberOfLines={1} style={styles.triggerSubtext}>
                {competitionLabel(activeMembership)}
              </Text>
            ) : null}
          </View>
          <Ionicons name={open ? "chevron-up" : "chevron-down"} size={14} color={colors.textSecondary} />
        </Pressable>
        {actionIcons}
      </View>

      {/* Expanded panel */}
      {open ? (
        <View ref={panelRef} style={styles.panel}>
          {/* Panel header */}
          {!showSubPanel ? (
            <View style={styles.panelHeader}>
              <Text allowFontScaling={false} style={styles.panelTitle}>Mis Grupos</Text>
              <Text allowFontScaling={false} style={styles.panelCount}>{memberships.length}</Text>
              <View style={{ flex: 1 }} />
              <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={closePanel} hitSlop={6} style={styles.closeButton}>
                <Ionicons name="close" size={14} color={colors.textMuted} />
              </Pressable>
            </View>
          ) : showEditName ? (
            <View style={styles.panelHeader}>
              <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={cancelEditName} style={styles.backButton}>
                <Ionicons name="chevron-back" size={16} color={colors.textSecondary} />
              </Pressable>
              <Text allowFontScaling={false} numberOfLines={1} style={styles.panelTitleFlex}>
                {editingMembership?.groupName ?? ""}
              </Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={closePanel} hitSlop={6} style={styles.closeButton}>
                <Ionicons name="close" size={14} color={colors.textMuted} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.panelHeader}>
              <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={cancelJoinRequests} style={styles.backButton}>
                <Ionicons name="chevron-back" size={16} color={colors.textSecondary} />
              </Pressable>
              <Text allowFontScaling={false} numberOfLines={1} style={styles.panelTitleFlex}>
                Solicitudes
              </Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={closePanel} hitSlop={6} style={styles.closeButton}>
                <Ionicons name="close" size={14} color={colors.textMuted} />
              </Pressable>
            </View>
          )}

          {/* Group list */}
          {!showSubPanel ? (
            <>
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.listScroll}
                contentContainerStyle={styles.list}
                nestedScrollEnabled
              >
                {memberships.map((membership, index) => {
                  const active = membership.groupId === (activeMembership?.groupId || null);
                  return (
                    <MembershipRow
                      key={membership.groupId}
                      membership={membership}
                      active={active}
                      isLast={index === memberships.length - 1}
                      onSelect={() => { onSelectGroup(membership.groupId); closePanel(); }}
                      onMore={(ref) => openActions(membership.groupId, ref)}
                    />
                  );
                })}
              </ScrollView>

              <View style={styles.footerDivider} />
              <Pressable accessibilityRole="button" accessibilityLabel="Unirse o crear grupo" onPress={goToUnirseCrearGrupo} style={styles.joinButton}>
                <View style={styles.joinIconWrap}>
                  <Text allowFontScaling={false} style={styles.joinIcon}>+</Text>
                </View>
                <Text allowFontScaling={false} style={styles.joinText}>Unirse/Crear grupo</Text>
              </Pressable>

              {/* Actions popover overlay */}
              {actionsGroupId && actionsMembership ? (
                <>
                  <Pressable style={styles.popoverBackdrop} onPress={dismissPopover} />
                  <View style={[styles.popover, { top: popoverPos.top, right: popoverPos.right }]}>
                    <Pressable onPress={() => void handleShare()} style={styles.popoverRow}>
                      <Ionicons name="share-outline" size={17} color={colors.textSecondary} />
                      <Text allowFontScaling={false} style={styles.popoverLabel}>Compartir link</Text>
                    </Pressable>

                    {actionsIsAdmin ? (
                      <>
                        <Pressable onPress={handleEditName} style={styles.popoverRow}>
                          <Ionicons name="pencil-outline" size={17} color={colors.textSecondary} />
                          <Text allowFontScaling={false} style={styles.popoverLabel}>Editar nombre</Text>
                        </Pressable>
                        <Pressable onPress={handleViewJoinRequests} style={styles.popoverRow}>
                          <Ionicons name="person-add-outline" size={17} color={colors.textSecondary} />
                          <Text allowFontScaling={false} style={styles.popoverLabel}>Solicitudes</Text>
                        </Pressable>
                      </>
                    ) : null}

                    <View style={styles.popoverDivider} />

                    <Pressable onPress={handleLeave} style={styles.popoverRow}>
                      <Ionicons name="log-out-outline" size={17} color={colors.dangerAccent} />
                      <Text allowFontScaling={false} style={styles.popoverLabelDanger}>Salir</Text>
                    </Pressable>

                    {actionsIsAdmin ? (
                      <Pressable onPress={handleDelete} style={styles.popoverRow}>
                        <Ionicons name="trash-outline" size={17} color={colors.dangerAccent} />
                        <Text allowFontScaling={false} style={styles.popoverLabelDanger}>Eliminar</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </>
              ) : null}
            </>
          ) : null}

          {/* Edit name view */}
          {showEditName && editingMembership ? (
            <View style={styles.editNameWrap}>
              <TextInput
                style={styles.editNameInput}
                value={editingName}
                onChangeText={setEditingName}
                placeholder="Nombre del grupo"
                placeholderTextColor={colors.textSoft}
                autoFocus
                maxLength={40}
              />
              <View style={styles.editNameActions}>
                <Pressable onPress={cancelEditName} style={styles.editNameCancel}>
                  <Text allowFontScaling={false} style={styles.editNameCancelText}>Cancelar</Text>
                </Pressable>
                <Pressable onPress={handleSaveName} style={[styles.editNameSave, (!editingName.trim() || saving) && styles.editNameSaveDisabled]}>
                  <Text allowFontScaling={false} style={styles.editNameSaveText}>{saving ? "Guardando..." : "Guardar"}</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {/* Join requests view */}
          {showJoinRequests ? (
            <View style={styles.joinRequestsWrap}>
              {loadingRequests ? (
                <View style={styles.joinRequestsCentered}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : joinRequests.length === 0 ? (
                <View style={styles.joinRequestsCentered}>
                  <Ionicons name="checkmark-circle-outline" size={32} color={colors.textSoft} />
                  <Text allowFontScaling={false} style={styles.joinRequestsEmpty}>No hay solicitudes pendientes</Text>
                </View>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false} style={styles.joinRequestsList} nestedScrollEnabled>
                  {joinRequests.map((request) => (
                    <View key={request.userId} style={styles.joinRequestRow}>
                      <View style={styles.joinRequestAvatar}>
                        <Text allowFontScaling={false} style={styles.joinRequestAvatarText}>
                          {(request.userName.trim()[0] ?? "U").toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.joinRequestInfo}>
                        <Text allowFontScaling={false} numberOfLines={1} style={styles.joinRequestName}>
                          {request.userName}
                        </Text>
                      </View>
                      {respondingUserId === request.userId ? (
                        <ActivityIndicator size="small" color={colors.primaryDeep} />
                      ) : (
                        <View style={styles.joinRequestActions}>
                          <Pressable
                            onPress={() => handleRespondToRequest(request.userId, "approve")}
                            style={styles.joinRequestApproveBtn}
                          >
                            <Ionicons name="checkmark" size={18} color={colors.successDeep} />
                          </Pressable>
                          <Pressable
                            onPress={() => handleRespondToRequest(request.userId, "reject")}
                            style={styles.joinRequestRejectBtn}
                          >
                            <Ionicons name="close" size={18} color={colors.dangerAccent} />
                          </Pressable>
                        </View>
                      )}
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

// ─── MembershipRow (extracted for ref forwarding) ───────────────────────────

interface MembershipRowProps {
  membership: Membership;
  active: boolean;
  isLast: boolean;
  onSelect: () => void;
  onMore: (ref: View | null) => void;
}

function MembershipRow({ membership, active, isLast, onSelect, onMore }: MembershipRowProps) {
  const moreRef = useRef<View | null>(null);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onSelect}
      style={({ pressed }) => [
        styles.membershipRow,
        active && styles.membershipRowActive,
        pressed && !active && styles.membershipRowPressed,
        !isLast && styles.membershipRowGap
      ]}
    >
      <View style={[styles.rowAvatar, active && styles.rowAvatarActive]}>
        <Text allowFontScaling={false} style={[styles.rowAvatarText, active && styles.rowAvatarTextActive]}>
          {groupInitial(membership.groupName)}
        </Text>
      </View>
      <View style={styles.rowTextWrap}>
        <Text allowFontScaling={false} numberOfLines={1} style={[styles.groupName, active && styles.groupNameActive]}>
          {membership.groupName}
        </Text>
        <Text allowFontScaling={false} numberOfLines={1} style={styles.groupMeta}>{competitionLabel(membership)}</Text>
      </View>
      <Pressable
        ref={moreRef}
        accessibilityRole="button"
        accessibilityLabel="Opciones del grupo"
        hitSlop={8}
        onPress={() => onMore(moreRef.current)}
        style={[styles.moreButton, active && styles.moreButtonActive]}
      >
        <Ionicons name="ellipsis-horizontal" size={18} color={colors.textMuted} />
      </Pressable>
    </Pressable>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  trigger: {
    maxWidth: 240,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
    paddingLeft: 6,
    paddingRight: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1
  },
  triggerDisabled: {
    opacity: 0.5
  },
  triggerAvatar: {
    height: 36,
    width: 36,
    borderRadius: 10,
    backgroundColor: colors.primaryStrong,
    alignItems: "center",
    justifyContent: "center"
  },
  triggerLabelWrap: {
    flex: 1,
    gap: 1
  },
  triggerText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 18
  },
  triggerSubtext: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 13
  },

  // ─── Panel ────────────────────────────────────────────────────────────────
  panel: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10
  },
  panelTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "900"
  },
  panelTitleFlex: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "900"
  },
  panelCount: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    color: colors.primaryDeep,
    fontSize: 11,
    fontWeight: "800",
    overflow: "hidden"
  },
  backButton: {
    height: 30,
    width: 30,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted
  },
  closeButton: {
    height: 28,
    width: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted
  },

  // ─── List ─────────────────────────────────────────────────────────────────
  listScroll: {
    maxHeight: 280
  },
  list: {
    gap: 0
  },
  membershipRow: {
    minHeight: 58,
    borderRadius: 12,
    paddingLeft: 10,
    paddingRight: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  membershipRowActive: {
    backgroundColor: colors.primaryHighlight
  },
  membershipRowPressed: {
    backgroundColor: colors.surfaceMuted
  },
  membershipRowGap: {
    marginBottom: 2
  },
  rowAvatar: {
    height: 36,
    width: 36,
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center"
  },
  rowAvatarActive: {
    backgroundColor: colors.primaryStrong
  },
  rowAvatarText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "900"
  },
  rowAvatarTextActive: {
    color: colors.textTitle
  },
  rowTextWrap: {
    flex: 1,
    gap: 2
  },
  groupName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700"
  },
  groupNameActive: {
    fontWeight: "900"
  },
  groupMeta: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600"
  },
  moreButton: {
    height: 32,
    width: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center"
  },
  moreButtonActive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderMuted
  },
  footerDivider: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight
  },
  joinButton: {
    marginTop: 10,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: colors.brandTint,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm
  },
  joinIconWrap: {
    height: 22,
    width: 22,
    borderRadius: 999,
    backgroundColor: colors.primaryStrong,
    alignItems: "center",
    justifyContent: "center"
  },
  joinIcon: {
    color: colors.textTitle,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 16
  },
  joinText: {
    color: colors.textBrandDark,
    fontSize: 13,
    fontWeight: "800"
  },

  // ─── Popover overlay ──────────────────────────────────────────────────────
  popoverBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10
  },
  popover: {
    position: "absolute",
    zIndex: 11,
    minWidth: 180,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 4,
    shadowColor: "#0F172A",
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  popoverRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 10
  },
  popoverLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700"
  },
  popoverLabelDanger: {
    color: colors.dangerAccent,
    fontSize: 14,
    fontWeight: "700"
  },
  popoverDivider: {
    marginVertical: 3,
    marginHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight
  },

  // ─── Edit name ────────────────────────────────────────────────────────────
  editNameWrap: {
    gap: 10
  },
  editNameInput: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 12,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700"
  },
  editNameActions: {
    flexDirection: "row",
    gap: 8
  },
  editNameCancel: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center"
  },
  editNameCancelText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "800"
  },
  editNameSave: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: colors.primaryStrong,
    alignItems: "center",
    justifyContent: "center"
  },
  editNameSaveDisabled: {
    opacity: 0.4
  },
  editNameSaveText: {
    color: colors.textTitle,
    fontSize: 13,
    fontWeight: "800"
  },

  // ─── Join requests ──────────────────────────────────────────────────────
  joinRequestsWrap: {
    gap: 8
  },
  joinRequestsCentered: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 8
  },
  joinRequestsEmpty: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700"
  },
  joinRequestsList: {
    maxHeight: 240
  },
  joinRequestRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4
  },
  joinRequestAvatar: {
    height: 34,
    width: 34,
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center"
  },
  joinRequestAvatarText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "900"
  },
  joinRequestInfo: {
    flex: 1,
    gap: 2
  },
  joinRequestName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700"
  },
  joinRequestActions: {
    flexDirection: "row",
    gap: 6
  },
  joinRequestApproveBtn: {
    height: 32,
    width: 32,
    borderRadius: 8,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center"
  },
  joinRequestRejectBtn: {
    height: 32,
    width: 32,
    borderRadius: 8,
    backgroundColor: colors.surfaceTintWarning,
    alignItems: "center",
    justifyContent: "center"
  }
});
