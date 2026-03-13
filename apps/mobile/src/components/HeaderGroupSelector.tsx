import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Alert, LayoutAnimation, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, UIManager, View } from "react-native";
import { NavigationContext } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import type { Membership, MembershipRole } from "@fulbito/domain";
import { colors, spacing } from "@fulbito/design-tokens";

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

  function handleShare() {
    if (!actionsMembership) return;
    dismissPopover();
    const link = `https://fulbito.prode/join/${actionsMembership.groupId}`;
    void Share.share({
      message: `Unite a mi grupo "${actionsMembership.groupName}" en Fulbito Prode: ${link}`
    });
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
          {!showEditName ? (
            <View style={styles.panelHeader}>
              <Text allowFontScaling={false} style={styles.panelTitle}>Mis Grupos</Text>
              <Text allowFontScaling={false} style={styles.panelCount}>{memberships.length}</Text>
              <View style={{ flex: 1 }} />
              <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={closePanel} hitSlop={6} style={styles.closeButton}>
                <Ionicons name="close" size={14} color={colors.textMuted} />
              </Pressable>
            </View>
          ) : (
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
          )}

          {/* Group list */}
          {!showEditName ? (
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
                    <Pressable onPress={handleShare} style={styles.popoverRow}>
                      <Ionicons name="share-outline" size={17} color={colors.textSecondary} />
                      <Text allowFontScaling={false} style={styles.popoverLabel}>Compartir link</Text>
                    </Pressable>

                    {actionsIsAdmin ? (
                      <Pressable onPress={handleEditName} style={styles.popoverRow}>
                        <Ionicons name="pencil-outline" size={17} color={colors.textSecondary} />
                        <Text allowFontScaling={false} style={styles.popoverLabel}>Editar nombre</Text>
                      </Pressable>
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
        style={styles.moreButton}
      >
        <Ionicons name="ellipsis-horizontal" size={18} color={active ? colors.textTitle : colors.textMuted} />
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
  }
});
