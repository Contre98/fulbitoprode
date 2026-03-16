import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { NavigationContext } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import type { Membership, MembershipRole } from "@fulbito/domain";
import type { GroupMemberRecord, JoinRequestRecord } from "@fulbito/api-contracts";
import { getColors, spacing } from "@fulbito/design-tokens";
import type { ColorTokens } from "@fulbito/design-tokens";
import { groupsRepository } from "@/repositories";
import { usePressScale } from "@/lib/usePressScale";
import { useAppDialog } from "@/state/AppDialogContext";
import { useAuth } from "@/state/AuthContext";
import { useThemePreference } from "@/state/ThemePreferenceContext";
import { useThemeColors } from "@/theme/useThemeColors";

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

const CHEVRON_SPRING = {
  damping: 18,
  stiffness: 280,
  mass: 0.45
} as const;
const PANEL_OPEN_SPRING = {
  damping: 22,
  stiffness: 310,
  mass: 0.5
} as const;
const PANEL_CLOSE_TIMING_MS = 110;
const POPOVER_SPRING = {
  damping: 20,
  stiffness: 320,
  mass: 0.45
} as const;
const TRIGGER_PRESS_IN_SPRING = {
  damping: 22,
  stiffness: 460,
  mass: 0.4
} as const;
const TRIGGER_PRESS_OUT_SPRING = {
  damping: 18,
  stiffness: 340,
  mass: 0.45
} as const;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
let activeColors: ColorTokens = getColors("light");

type PressScaleTouchableProps = Omit<React.ComponentProps<typeof Pressable>, "children"> & {
  children: React.ReactNode;
  pressScale?: number;
};

function PressScaleTouchable({
  children,
  pressScale = 0.97,
  disabled,
  onPressIn,
  onPressOut,
  style,
  ...rest
}: PressScaleTouchableProps) {
  const press = usePressScale(pressScale, Boolean(disabled));
  const handlePressIn = useCallback((event: any) => {
    press.onPressIn();
    onPressIn?.(event);
  }, [onPressIn, press.onPressIn]);
  const handlePressOut = useCallback((event: any) => {
    press.onPressOut();
    onPressOut?.(event);
  }, [onPressOut, press.onPressOut]);

  return (
    <Animated.View style={press.animatedStyle}>
      <Pressable
        {...rest}
        disabled={disabled}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

export function HeaderGroupSelector({ memberships, selectedGroupId, onSelectGroup, onRenameGroup, onCheckLeave, onLeaveGroup, onDeleteGroup, onOpenChange, forceClose, actionIcons }: HeaderGroupSelectorProps) {
  const themeColors = useThemeColors();
  activeColors = themeColors;
  styles = useMemo(() => createStyles(), [themeColors]);
  const { themePreference } = useThemePreference();
  const isDark = themePreference === "dark";
  const { session } = useAuth();
  const reducedMotion = useReducedMotion();
  const [saving, setSaving] = useState(false);
  const dialog = useAppDialog();
  const navigation = useContext(NavigationContext) as { navigate?: (route: string) => void } | null;
  const panelRef = useRef<View | null>(null);
  const [open, setOpen] = useState(false);
  const [panelMounted, setPanelMounted] = useState(false);
  const [actionsGroupId, setActionsGroupId] = useState<string | null>(null);
  const [popoverPos, setPopoverPos] = useState({ top: 0, right: 0 });
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [joinRequestsGroupId, setJoinRequestsGroupId] = useState<string | null>(null);
  const [joinRequests, setJoinRequests] = useState<JoinRequestRecord[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [respondingUserId, setRespondingUserId] = useState<string | null>(null);
  const [membersGroupId, setMembersGroupId] = useState<string | null>(null);
  const [members, setMembers] = useState<GroupMemberRecord[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [membersCanManage, setMembersCanManage] = useState(false);
  const [membersViewerRole, setMembersViewerRole] = useState<MembershipRole>("member");
  const [updatingMemberUserId, setUpdatingMemberUserId] = useState<string | null>(null);
  const triggerScale = useSharedValue(1);
  const chevronRotation = useSharedValue(open ? 180 : 0);
  const panelProgress = useSharedValue(0);
  const popoverProgress = useSharedValue(0);
  const currentUserId = session?.user?.id ?? null;

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
  const showMembers = membersGroupId !== null;
  const showSubPanel = showEditName || showJoinRequests || showMembers;

  useEffect(() => {
    const target = open ? 180 : 0;
    if (reducedMotion) {
      chevronRotation.value = target;
      return;
    }
    chevronRotation.value = withSpring(target, CHEVRON_SPRING);
  }, [chevronRotation, open, reducedMotion]);

  const chevronAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }]
  }));
  const triggerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: triggerScale.value }]
  }));
  const panelAnimatedStyle = useAnimatedStyle(() => ({
    opacity: panelProgress.value,
    transform: [
      { translateY: (1 - panelProgress.value) * -10 },
      { scale: 0.985 + panelProgress.value * 0.015 }
    ]
  }));
  const popoverAnimatedStyle = useAnimatedStyle(() => ({
    opacity: popoverProgress.value,
    transform: [
      { translateY: (1 - popoverProgress.value) * -8 },
      { scale: 0.96 + popoverProgress.value * 0.04 }
    ]
  }));

  const handleTriggerPressIn = useCallback(() => {
    if (memberships.length === 0 || reducedMotion) {
      triggerScale.value = 1;
      return;
    }
    triggerScale.value = withSpring(0.985, TRIGGER_PRESS_IN_SPRING);
  }, [memberships.length, reducedMotion, triggerScale]);

  const handleTriggerPressOut = useCallback(() => {
    if (memberships.length === 0 || reducedMotion) {
      triggerScale.value = 1;
      return;
    }
    triggerScale.value = withSpring(1, TRIGGER_PRESS_OUT_SPRING);
  }, [memberships.length, reducedMotion, triggerScale]);

  function toggleOpen() {
    if (memberships.length === 0) return;
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
    setOpen(false);
    setActionsGroupId(null);
    setEditingGroupId(null);
    setEditingName("");
    setJoinRequestsGroupId(null);
    setJoinRequests([]);
    setMembersGroupId(null);
    setMembers([]);
    setMembersCanManage(false);
    setMembersViewerRole("member");
    setUpdatingMemberUserId(null);
    onOpenChange?.(false);
  }

  useEffect(() => {
    if (open) {
      setPanelMounted(true);
      if (reducedMotion) {
        panelProgress.value = 1;
        return;
      }
      panelProgress.value = 0;
      panelProgress.value = withSpring(1, PANEL_OPEN_SPRING);
      return;
    }
    if (!panelMounted) {
      return;
    }
    if (reducedMotion) {
      panelProgress.value = 0;
      setPanelMounted(false);
      return;
    }
    panelProgress.value = withTiming(0, { duration: PANEL_CLOSE_TIMING_MS }, (finished) => {
      if (finished) {
        runOnJS(setPanelMounted)(false);
      }
    });
  }, [open, panelMounted, panelProgress, reducedMotion]);

  useEffect(() => {
    const popoverVisible = Boolean(actionsGroupId && actionsMembership);
    if (popoverVisible) {
      if (reducedMotion) {
        popoverProgress.value = 1;
        return;
      }
      popoverProgress.value = 0;
      popoverProgress.value = withSpring(1, POPOVER_SPRING);
      return;
    }
    if (reducedMotion) {
      popoverProgress.value = 0;
      return;
    }
    popoverProgress.value = withSpring(0, POPOVER_SPRING);
  }, [actionsGroupId, actionsMembership, popoverProgress, reducedMotion]);

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
        dialog.alert("Error", "No hay un link de invitación activo. Pedile a un admin que genere uno nuevo.");
        return;
      }

      const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL || "https://api.fulbitoprode.com";
      const link = `${apiBase}/join?invite=${encodeURIComponent(inviteToken)}`;
      await Share.share({
        message: `Unite a mi grupo "${actionsMembership.groupName}" en Fulbito Prode:\n${link}`
      });
    } catch (error) {
      dialog.alert("Error", error instanceof Error ? error.message : "No se pudo generar el link de invitación.");
    }
  }

  function handleEditName() {
    if (!actionsMembership) return;
    const membership = actionsMembership;
    dismissPopover();
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
        setEditingGroupId(null);
        setEditingName("");
      } catch (error) {
        dialog.alert("Error", error instanceof Error ? error.message : "No se pudo renombrar el grupo.");
      } finally {
        setSaving(false);
      }
    })();
  }

  function cancelEditName() {
    setEditingGroupId(null);
    setEditingName("");
  }

  function handleViewJoinRequests() {
    if (!actionsMembership) return;
    const groupId = actionsMembership.groupId;
    dismissPopover();
    setJoinRequestsGroupId(groupId);
    setLoadingRequests(true);
    void (async () => {
      try {
        const result = await groupsRepository.listJoinRequests({ groupId });
        setJoinRequests(result.requests);
      } catch {
        dialog.alert("Error", "No se pudieron cargar las solicitudes.");
      } finally {
        setLoadingRequests(false);
      }
    })();
  }

  function cancelJoinRequests() {
    setJoinRequestsGroupId(null);
    setJoinRequests([]);
  }

  function handleViewMembers() {
    if (!actionsMembership) return;
    const groupId = actionsMembership.groupId;
    dismissPopover();
    setMembersGroupId(groupId);
    setLoadingMembers(true);
    setUpdatingMemberUserId(null);
    void (async () => {
      try {
        const result = await groupsRepository.listMembers({ groupId });
        setMembers(result.members);
        setMembersCanManage(result.canManage);
        setMembersViewerRole(result.viewerRole);
      } catch (error) {
        dialog.alert("Error", error instanceof Error ? error.message : "No se pudieron cargar los miembros.");
      } finally {
        setLoadingMembers(false);
      }
    })();
  }

  function cancelMembersView() {
    setMembersGroupId(null);
    setMembers([]);
    setMembersCanManage(false);
    setMembersViewerRole("member");
    setUpdatingMemberUserId(null);
  }

  function canManageMember(member: GroupMemberRecord) {
    if (!membersCanManage) return false;
    if (member.role === "owner") return false;
    if (currentUserId && member.userId === currentUserId) return false;
    if (membersViewerRole !== "owner" && member.role === "admin") return false;
    return true;
  }

  function handleToggleMemberAdmin(member: GroupMemberRecord) {
    if (!membersGroupId || updatingMemberUserId || !canManageMember(member)) return;
    const nextRole: "admin" | "member" = member.role === "admin" ? "member" : "admin";
    const actionLabel = nextRole === "admin" ? "dar permisos de admin a" : "quitar permisos de admin a";

    dialog.alert(
      nextRole === "admin" ? "Dar permisos de admin" : "Quitar permisos de admin",
      `¿Querés ${actionLabel} ${member.name}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: () => {
            setUpdatingMemberUserId(member.userId);
            void (async () => {
              try {
                await groupsRepository.updateMemberRole({
                  groupId: membersGroupId,
                  userId: member.userId,
                  role: nextRole
                });
                setMembers((previous) => previous.map((row) => (row.userId === member.userId ? { ...row, role: nextRole } : row)));
              } catch (error) {
                dialog.alert("Error", error instanceof Error ? error.message : "No se pudo actualizar el rol.");
              } finally {
                setUpdatingMemberUserId(null);
              }
            })();
          }
        }
      ]
    );
  }

  function handleKickMember(member: GroupMemberRecord) {
    if (!membersGroupId || updatingMemberUserId || !canManageMember(member)) return;
    dialog.alert(
      "Quitar del grupo",
      `¿Querés quitar a ${member.name} del grupo?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Quitar",
          style: "destructive",
          onPress: () => {
            setUpdatingMemberUserId(member.userId);
            void (async () => {
              try {
                await groupsRepository.removeMember({
                  groupId: membersGroupId,
                  userId: member.userId
                });
                setMembers((previous) => previous.filter((row) => row.userId !== member.userId));
              } catch (error) {
                dialog.alert("Error", error instanceof Error ? error.message : "No se pudo quitar al miembro.");
              } finally {
                setUpdatingMemberUserId(null);
              }
            })();
          }
        }
      ]
    );
  }

  function handleRespondToRequest(targetUserId: string, action: "approve" | "reject") {
    if (!joinRequestsGroupId || respondingUserId) return;
    const label = action === "approve" ? "aprobar" : "rechazar";
    const request = joinRequests.find((r) => r.userId === targetUserId);
    const userName = request?.userName || "este usuario";

    dialog.alert(
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
                dialog.alert(
                  "Listo",
                  action === "approve"
                    ? `${userName} fue aceptado en el grupo.`
                    : `La solicitud de ${userName} fue rechazada.`
                );
              } catch (error) {
                dialog.alert("Error", error instanceof Error ? error.message : "No se pudo procesar la solicitud.");
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
      dialog.alert(
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
                  dialog.alert("Error", error instanceof Error ? error.message : "No se pudo salir del grupo.");
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
          dialog.alert(
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
                      dialog.alert("Error", error instanceof Error ? error.message : "No se pudo eliminar el grupo.");
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

        dialog.alert(
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
                    dialog.alert("Error", error instanceof Error ? error.message : "No se pudo salir del grupo.");
                  }
                })();
              }
            }
          ]
        );
      } catch (error) {
        dialog.alert("Error", error instanceof Error ? error.message : "No se pudo verificar el estado del grupo.");
      }
    })();
  }

  function handleDelete() {
    if (!actionsMembership) return;
    const name = actionsMembership.groupName;
    const groupId = actionsMembership.groupId;
    dismissPopover();
    dialog.alert(
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
                dialog.alert("Error", error instanceof Error ? error.message : "No se pudo eliminar el grupo.");
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
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel="Seleccionar grupo"
          onPress={toggleOpen}
          onPressIn={handleTriggerPressIn}
          onPressOut={handleTriggerPressOut}
          style={[styles.trigger, memberships.length === 0 && styles.triggerDisabled, triggerAnimatedStyle]}
        >
          <View style={styles.triggerAvatar}>
            <Ionicons name="people" size={18} color={isDark ? activeColors.textInverse : activeColors.textTitle} />
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
          <Animated.View style={chevronAnimatedStyle}>
            <Ionicons name="chevron-down" size={14} color={activeColors.textSecondary} />
          </Animated.View>
        </AnimatedPressable>
        {actionIcons}
      </View>

      {/* Expanded panel */}
      {panelMounted ? (
        <Animated.View ref={panelRef} style={[styles.panel, panelAnimatedStyle]}>
          {/* Panel header */}
          {!showSubPanel ? (
            <View style={styles.panelHeader}>
              <Text allowFontScaling={false} style={styles.panelTitle}>Mis Grupos</Text>
              <Text allowFontScaling={false} style={styles.panelCount}>{memberships.length}</Text>
              <View style={{ flex: 1 }} />
              <PressScaleTouchable
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
                onPress={closePanel}
                hitSlop={6}
                style={styles.closeButton}
                pressScale={0.93}
              >
                <Ionicons name="close" size={14} color={activeColors.textMuted} />
              </PressScaleTouchable>
            </View>
          ) : showEditName ? (
            <View style={styles.panelHeader}>
              <PressScaleTouchable
                accessibilityRole="button"
                accessibilityLabel="Volver"
                onPress={cancelEditName}
                style={styles.backButton}
                pressScale={0.93}
              >
                <Ionicons name="chevron-back" size={16} color={activeColors.textSecondary} />
              </PressScaleTouchable>
              <Text allowFontScaling={false} numberOfLines={1} style={styles.panelTitleFlex}>
                {editingMembership?.groupName ?? ""}
              </Text>
              <PressScaleTouchable
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
                onPress={closePanel}
                hitSlop={6}
                style={styles.closeButton}
                pressScale={0.93}
              >
                <Ionicons name="close" size={14} color={activeColors.textMuted} />
              </PressScaleTouchable>
            </View>
          ) : showJoinRequests ? (
            <View style={styles.panelHeader}>
              <PressScaleTouchable
                accessibilityRole="button"
                accessibilityLabel="Volver"
                onPress={cancelJoinRequests}
                style={styles.backButton}
                pressScale={0.93}
              >
                <Ionicons name="chevron-back" size={16} color={activeColors.textSecondary} />
              </PressScaleTouchable>
              <Text allowFontScaling={false} numberOfLines={1} style={styles.panelTitleFlex}>
                Solicitudes
              </Text>
              <PressScaleTouchable
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
                onPress={closePanel}
                hitSlop={6}
                style={styles.closeButton}
                pressScale={0.93}
              >
                <Ionicons name="close" size={14} color={activeColors.textMuted} />
              </PressScaleTouchable>
            </View>
          ) : (
            <View style={styles.panelHeader}>
              <PressScaleTouchable
                accessibilityRole="button"
                accessibilityLabel="Volver"
                onPress={cancelMembersView}
                style={styles.backButton}
                pressScale={0.93}
              >
                <Ionicons name="chevron-back" size={16} color={activeColors.textSecondary} />
              </PressScaleTouchable>
              <Text allowFontScaling={false} numberOfLines={1} style={styles.panelTitleFlex}>
                Miembros
              </Text>
              <PressScaleTouchable
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
                onPress={closePanel}
                hitSlop={6}
                style={styles.closeButton}
                pressScale={0.93}
              >
                <Ionicons name="close" size={14} color={activeColors.textMuted} />
              </PressScaleTouchable>
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
              <PressScaleTouchable
                accessibilityRole="button"
                accessibilityLabel="Unirse o crear grupo"
                onPress={goToUnirseCrearGrupo}
                style={styles.joinButton}
                pressScale={0.98}
              >
                <View style={styles.joinIconWrap}>
                  <Text allowFontScaling={false} style={[styles.joinIcon, isDark ? styles.joinIconDark : null]}>+</Text>
                </View>
                <Text allowFontScaling={false} style={styles.joinText}>Unirse/Crear grupo</Text>
              </PressScaleTouchable>

              {/* Actions popover overlay */}
              {actionsGroupId && actionsMembership ? (
                <>
                  <Pressable style={styles.popoverBackdrop} onPress={dismissPopover} />
                  <Animated.View style={[styles.popover, { top: popoverPos.top, right: popoverPos.right }, popoverAnimatedStyle]}>
                    <PressScaleTouchable onPress={() => void handleShare()} style={styles.popoverRow} pressScale={0.98}>
                      <Ionicons name="share-outline" size={17} color={activeColors.textSecondary} />
                      <Text allowFontScaling={false} style={styles.popoverLabel}>Compartir link</Text>
                    </PressScaleTouchable>
                    <PressScaleTouchable onPress={handleViewMembers} style={styles.popoverRow} pressScale={0.98}>
                      <Ionicons name="people-outline" size={17} color={activeColors.textSecondary} />
                      <Text allowFontScaling={false} style={styles.popoverLabel}>Miembros</Text>
                    </PressScaleTouchable>

                    {actionsIsAdmin ? (
                      <>
                        <PressScaleTouchable onPress={handleEditName} style={styles.popoverRow} pressScale={0.98}>
                          <Ionicons name="pencil-outline" size={17} color={activeColors.textSecondary} />
                          <Text allowFontScaling={false} style={styles.popoverLabel}>Editar nombre</Text>
                        </PressScaleTouchable>
                        <PressScaleTouchable onPress={handleViewJoinRequests} style={styles.popoverRow} pressScale={0.98}>
                          <Ionicons name="person-add-outline" size={17} color={activeColors.textSecondary} />
                          <Text allowFontScaling={false} style={styles.popoverLabel}>Solicitudes</Text>
                        </PressScaleTouchable>
                      </>
                    ) : null}

                    <View style={styles.popoverDivider} />

                    <PressScaleTouchable onPress={handleLeave} style={styles.popoverRow} pressScale={0.98}>
                      <Ionicons name="log-out-outline" size={17} color={activeColors.dangerAccent} />
                      <Text allowFontScaling={false} style={styles.popoverLabelDanger}>Salir</Text>
                    </PressScaleTouchable>

                    {actionsIsAdmin ? (
                      <PressScaleTouchable onPress={handleDelete} style={styles.popoverRow} pressScale={0.98}>
                        <Ionicons name="trash-outline" size={17} color={activeColors.dangerAccent} />
                        <Text allowFontScaling={false} style={styles.popoverLabelDanger}>Eliminar</Text>
                      </PressScaleTouchable>
                    ) : null}
                  </Animated.View>
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
                placeholderTextColor={activeColors.textSoft}
                autoFocus
                maxLength={40}
              />
              <View style={styles.editNameActions}>
                <PressScaleTouchable onPress={cancelEditName} style={styles.editNameCancel} pressScale={0.97}>
                  <Text allowFontScaling={false} style={styles.editNameCancelText}>Cancelar</Text>
                </PressScaleTouchable>
                <PressScaleTouchable
                  onPress={handleSaveName}
                  disabled={!editingName.trim() || saving}
                  style={[styles.editNameSave, (!editingName.trim() || saving) && styles.editNameSaveDisabled]}
                  pressScale={0.97}
                >
                  <Text allowFontScaling={false} style={styles.editNameSaveText}>{saving ? "Guardando..." : "Guardar"}</Text>
                </PressScaleTouchable>
              </View>
            </View>
          ) : null}

          {/* Join requests view */}
          {showJoinRequests ? (
            <View style={styles.joinRequestsWrap}>
              {loadingRequests ? (
                <View style={styles.joinRequestsCentered}>
                  <ActivityIndicator color={activeColors.primary} />
                </View>
              ) : joinRequests.length === 0 ? (
                <View style={styles.joinRequestsCentered}>
                  <Ionicons name="checkmark-circle-outline" size={32} color={activeColors.textSoft} />
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
                        <ActivityIndicator size="small" color={activeColors.primaryDeep} />
                      ) : (
                        <View style={styles.joinRequestActions}>
                          <PressScaleTouchable
                            onPress={() => handleRespondToRequest(request.userId, "approve")}
                            style={styles.joinRequestApproveBtn}
                            pressScale={0.92}
                          >
                            <Ionicons name="checkmark" size={18} color={activeColors.successDeep} />
                          </PressScaleTouchable>
                          <PressScaleTouchable
                            onPress={() => handleRespondToRequest(request.userId, "reject")}
                            style={styles.joinRequestRejectBtn}
                            pressScale={0.92}
                          >
                            <Ionicons name="close" size={18} color={activeColors.dangerAccent} />
                          </PressScaleTouchable>
                        </View>
                      )}
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          ) : null}

          {/* Members view */}
          {showMembers ? (
            <View style={styles.joinRequestsWrap}>
              {loadingMembers ? (
                <View style={styles.joinRequestsCentered}>
                  <ActivityIndicator color={activeColors.primary} />
                </View>
              ) : members.length === 0 ? (
                <View style={styles.joinRequestsCentered}>
                  <Ionicons name="people-outline" size={32} color={activeColors.textSoft} />
                  <Text allowFontScaling={false} style={styles.joinRequestsEmpty}>No hay miembros disponibles</Text>
                </View>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false} style={styles.joinRequestsList} nestedScrollEnabled>
                  {members.map((member) => {
                    const loadingMember = updatingMemberUserId === member.userId;
                    const showManageActions = canManageMember(member);
                    return (
                      <View key={member.userId} style={styles.memberRow}>
                        <View style={styles.memberMainLine}>
                          <Text allowFontScaling={false} numberOfLines={1} style={styles.memberName}>
                            {member.name}
                          </Text>
                          <View style={styles.memberMetaRow}>
                            <View style={[styles.memberRoleBadge, member.role === "owner" ? styles.memberRoleBadgeOwner : member.role === "admin" ? styles.memberRoleBadgeAdmin : null]}>
                              <Text allowFontScaling={false} style={[styles.memberRoleBadgeText, member.role === "owner" ? styles.memberRoleBadgeTextOwner : member.role === "admin" ? styles.memberRoleBadgeTextAdmin : null]}>
                                {member.role === "owner" ? "Owner" : member.role === "admin" ? "Admin" : "Miembro"}
                              </Text>
                            </View>
                            {currentUserId && member.userId === currentUserId ? (
                              <Text allowFontScaling={false} style={styles.memberYouLabel}>Vos</Text>
                            ) : null}
                          </View>
                        </View>
                        {loadingMember ? (
                          <ActivityIndicator size="small" color={activeColors.primaryDeep} />
                        ) : showManageActions ? (
                          <View style={styles.memberActions}>
                            <PressScaleTouchable
                              onPress={() => handleToggleMemberAdmin(member)}
                              style={styles.memberActionBtn}
                              pressScale={0.97}
                            >
                              <Ionicons
                                name={member.role === "admin" ? "remove-circle-outline" : "shield-checkmark-outline"}
                                size={16}
                                color={activeColors.textSecondary}
                              />
                              <Text allowFontScaling={false} style={styles.memberActionText}>
                                {member.role === "admin" ? "Quitar admin" : "Dar admin"}
                              </Text>
                            </PressScaleTouchable>
                            <PressScaleTouchable
                              onPress={() => handleKickMember(member)}
                              style={[styles.memberActionBtn, styles.memberActionBtnDanger]}
                              pressScale={0.97}
                            >
                              <Ionicons name="person-remove-outline" size={16} color={activeColors.dangerAccent} />
                              <Text allowFontScaling={false} style={styles.memberActionTextDanger}>Quitar</Text>
                            </PressScaleTouchable>
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          ) : null}
        </Animated.View>
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
  const { themePreference } = useThemePreference();
  const isDark = themePreference === "dark";
  const moreRef = useRef<View | null>(null);
  const rowPress = usePressScale(0.985);
  const morePress = usePressScale(0.93);

  return (
    <Animated.View style={rowPress.animatedStyle}>
      <Pressable
        accessibilityRole="button"
        onPress={onSelect}
        onPressIn={rowPress.onPressIn}
        onPressOut={rowPress.onPressOut}
        style={[
          styles.membershipRow,
          active && styles.membershipRowActive,
          !isLast && styles.membershipRowGap
        ]}
      >
        <View style={[styles.rowAvatar, active && styles.rowAvatarActive]}>
          <Text
            allowFontScaling={false}
            style={[
              styles.rowAvatarText,
              active && styles.rowAvatarTextActive,
              active && isDark ? styles.rowAvatarTextActiveDark : null
            ]}
          >
            {groupInitial(membership.groupName)}
          </Text>
        </View>
        <View style={styles.rowTextWrap}>
          <Text allowFontScaling={false} numberOfLines={1} style={[styles.groupName, active && styles.groupNameActive]}>
            {membership.groupName}
          </Text>
          <Text allowFontScaling={false} numberOfLines={1} style={styles.groupMeta}>{competitionLabel(membership)}</Text>
        </View>
        <Animated.View style={morePress.animatedStyle}>
          <Pressable
            ref={moreRef}
            accessibilityRole="button"
            accessibilityLabel="Opciones del grupo"
            hitSlop={8}
            onPress={() => onMore(moreRef.current)}
            onPressIn={morePress.onPressIn}
            onPressOut={morePress.onPressOut}
            style={[styles.moreButton, active && styles.moreButtonActive]}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color={activeColors.textMuted} />
          </Pressable>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const createStyles = () => StyleSheet.create({
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
    backgroundColor: activeColors.surfaceMuted,
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
    backgroundColor: activeColors.primaryStrong,
    alignItems: "center",
    justifyContent: "center"
  },
  triggerLabelWrap: {
    flex: 1,
    gap: 1
  },
  triggerText: {
    color: activeColors.textPrimary,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 18
  },
  triggerSubtext: {
    color: activeColors.textMuted,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 13
  },

  // ─── Panel ────────────────────────────────────────────────────────────────
  panel: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: activeColors.borderLight
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10
  },
  panelTitle: {
    color: activeColors.textPrimary,
    fontSize: 16,
    fontWeight: "900"
  },
  panelTitleFlex: {
    flex: 1,
    color: activeColors.textPrimary,
    fontSize: 16,
    fontWeight: "900"
  },
  panelCount: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: activeColors.primarySoft,
    color: activeColors.primaryDeep,
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
    backgroundColor: activeColors.surfaceMuted
  },
  closeButton: {
    height: 28,
    width: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: activeColors.surfaceMuted
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
    backgroundColor: activeColors.primaryHighlight
  },
  membershipRowGap: {
    marginBottom: 2
  },
  rowAvatar: {
    height: 36,
    width: 36,
    borderRadius: 10,
    backgroundColor: activeColors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center"
  },
  rowAvatarActive: {
    backgroundColor: activeColors.primaryStrong
  },
  rowAvatarText: {
    color: activeColors.textSecondary,
    fontSize: 15,
    fontWeight: "900"
  },
  rowAvatarTextActive: {
    color: activeColors.textTitle
  },
  rowAvatarTextActiveDark: {
    color: activeColors.textInverse
  },
  rowTextWrap: {
    flex: 1,
    gap: 2
  },
  groupName: {
    color: activeColors.textPrimary,
    fontSize: 14,
    fontWeight: "700"
  },
  groupNameActive: {
    fontWeight: "900"
  },
  groupMeta: {
    color: activeColors.textMuted,
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
    backgroundColor: activeColors.surface,
    borderWidth: 1,
    borderColor: activeColors.borderMuted
  },
  footerDivider: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: activeColors.borderLight
  },
  joinButton: {
    marginTop: 10,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: activeColors.brandTint,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm
  },
  joinIconWrap: {
    height: 22,
    width: 22,
    borderRadius: 999,
    backgroundColor: activeColors.primaryStrong,
    alignItems: "center",
    justifyContent: "center"
  },
  joinIcon: {
    color: activeColors.textTitle,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 16
  },
  joinIconDark: {
    color: activeColors.textInverse
  },
  joinText: {
    color: activeColors.textBrandDark,
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
    backgroundColor: activeColors.surface,
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 4,
    shadowColor: "#0F172A",
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
    borderWidth: 1,
    borderColor: activeColors.borderLight
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
    color: activeColors.textPrimary,
    fontSize: 14,
    fontWeight: "700"
  },
  popoverLabelDanger: {
    color: activeColors.dangerAccent,
    fontSize: 14,
    fontWeight: "700"
  },
  popoverDivider: {
    marginVertical: 3,
    marginHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: activeColors.borderLight
  },

  // ─── Edit name ────────────────────────────────────────────────────────────
  editNameWrap: {
    gap: 10
  },
  editNameInput: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: activeColors.borderMuted,
    backgroundColor: activeColors.surfaceMuted,
    paddingHorizontal: 12,
    color: activeColors.textPrimary,
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
    backgroundColor: activeColors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center"
  },
  editNameCancelText: {
    color: activeColors.textSecondary,
    fontSize: 13,
    fontWeight: "800"
  },
  editNameSave: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: activeColors.primaryStrong,
    alignItems: "center",
    justifyContent: "center"
  },
  editNameSaveDisabled: {
    opacity: 0.4
  },
  editNameSaveText: {
    color: activeColors.textTitle,
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
    color: activeColors.textMuted,
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
    backgroundColor: activeColors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center"
  },
  joinRequestAvatarText: {
    color: activeColors.textSecondary,
    fontSize: 14,
    fontWeight: "900"
  },
  joinRequestInfo: {
    flex: 1,
    gap: 2
  },
  joinRequestName: {
    color: activeColors.textPrimary,
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
    backgroundColor: activeColors.surfaceTintWarning,
    alignItems: "center",
    justifyContent: "center"
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4
  },
  memberMainLine: {
    flex: 1,
    minHeight: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  memberName: {
    flex: 1,
    color: activeColors.textPrimary,
    fontSize: 14,
    fontWeight: "700"
  },
  memberMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  memberRoleBadge: {
    borderRadius: 999,
    backgroundColor: activeColors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  memberRoleBadgeOwner: {
    backgroundColor: activeColors.primarySoftAlt
  },
  memberRoleBadgeAdmin: {
    backgroundColor: activeColors.surfaceTintBlueSoft
  },
  memberRoleBadgeText: {
    color: activeColors.textMuted,
    fontSize: 10,
    fontWeight: "700"
  },
  memberRoleBadgeTextOwner: {
    color: activeColors.primaryDeep
  },
  memberRoleBadgeTextAdmin: {
    color: activeColors.textSlateStrong
  },
  memberYouLabel: {
    color: activeColors.textSoft,
    fontSize: 10,
    fontWeight: "700"
  },
  memberActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  memberActionBtn: {
    minHeight: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: activeColors.borderMuted,
    backgroundColor: activeColors.surfaceMuted,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4
  },
  memberActionBtnDanger: {
    borderColor: activeColors.borderDangerSoft,
    backgroundColor: activeColors.surfaceTintDangerSoft
  },
  memberActionText: {
    color: activeColors.textSecondary,
    fontSize: 11,
    fontWeight: "700"
  },
  memberActionTextDanger: {
    color: activeColors.dangerAccent,
    fontSize: 11,
    fontWeight: "700"
  }
});


let styles = createStyles();
