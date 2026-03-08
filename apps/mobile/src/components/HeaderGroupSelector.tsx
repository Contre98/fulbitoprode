import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { Membership } from "@fulbito/domain";
import { colors, spacing } from "@fulbito/design-tokens";

interface HeaderGroupSelectorProps {
  memberships: Membership[];
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string) => void;
}

function initialsFromLabel(label: string) {
  const chunks = label
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk.charAt(0).toUpperCase());

  return chunks.length > 0 ? chunks.join("") : "GR";
}

function competitionLabel(membership: Membership) {
  return membership.competitionName || membership.leagueName || "Competencia";
}

export function HeaderGroupSelector({ memberships, selectedGroupId, onSelectGroup }: HeaderGroupSelectorProps) {
  const navigation = useNavigation<any>();
  const [open, setOpen] = useState(false);

  const activeMembership = useMemo(
    () => memberships.find((membership) => membership.groupId === selectedGroupId) || memberships[0] || null,
    [memberships, selectedGroupId]
  );

  const triggerLabel = activeMembership?.groupName || "Sin grupo";

  function goToConfiguracion() {
    setOpen(false);
    navigation.navigate("Configuracion");
  }

  function goToPerfil() {
    setOpen(false);
    navigation.navigate("Perfil");
  }

  function goToAjustes() {
    setOpen(false);
    navigation.navigate("Ajustes");
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Seleccionar grupo"
        onPress={() => {
          if (memberships.length > 0) {
            setOpen(true);
          }
        }}
        style={[styles.trigger, memberships.length === 0 ? styles.triggerDisabled : null]}
      >
        <Text allowFontScaling={false} numberOfLines={1} style={styles.triggerText}>
          {triggerLabel}
        </Text>
        <Text allowFontScaling={false} style={styles.triggerChevron}>⌄</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />

          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <Text allowFontScaling={false} style={styles.sheetTitle}>Seleccionar Grupo</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Cerrar selector" onPress={() => setOpen(false)} style={styles.closeButton}>
                <Text allowFontScaling={false} style={styles.closeGlyph}>✕</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
              {memberships.map((membership) => {
                const active = membership.groupId === (activeMembership?.groupId || null);
                return (
                  <Pressable
                    key={membership.groupId}
                    accessibilityRole="button"
                    onPress={() => {
                      onSelectGroup(membership.groupId);
                      setOpen(false);
                    }}
                    style={[styles.membershipRow, active ? styles.membershipRowActive : null]}
                  >
                    <View style={styles.rowLeft}>
                      <View style={[styles.avatar, active ? styles.avatarActive : null]}>
                        <Text allowFontScaling={false} style={[styles.avatarText, active ? styles.avatarTextActive : null]}>
                          {initialsFromLabel(membership.groupName)}
                        </Text>
                      </View>
                      <View style={styles.rowTextWrap}>
                        <Text allowFontScaling={false} numberOfLines={1} style={styles.groupName}>{membership.groupName}</Text>
                        <Text allowFontScaling={false} numberOfLines={1} style={styles.groupMeta}>{competitionLabel(membership)}</Text>
                      </View>
                    </View>
                    {active ? <Text allowFontScaling={false} style={styles.check}>✓</Text> : null}
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.actionsRow}>
              <Pressable accessibilityRole="button" onPress={goToPerfil} style={styles.actionButton}>
                <Text allowFontScaling={false} style={styles.actionText}>Mi Perfil</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={goToAjustes} style={styles.actionButton}>
                <Text allowFontScaling={false} style={styles.actionText}>Ajustes</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={goToConfiguracion} style={styles.actionButton}>
                <Text allowFontScaling={false} style={styles.actionText}>Administrar Grupos</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    maxWidth: 168,
    minHeight: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D7DCE3",
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  triggerDisabled: {
    opacity: 0.6
  },
  triggerText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: "800"
  },
  triggerChevron: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "900"
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end"
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(11,17,26,0.34)"
  },
  sheet: {
    maxHeight: "72%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md
  },
  handle: {
    alignSelf: "center",
    width: 56,
    height: 6,
    borderRadius: 999,
    backgroundColor: "#D7DCE3",
    marginBottom: spacing.sm
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm
  },
  sheetTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "900"
  },
  closeButton: {
    height: 36,
    width: 36,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted
  },
  closeGlyph: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "900"
  },
  list: {
    gap: spacing.xs,
    paddingBottom: spacing.sm
  },
  membershipRow: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D7DCE3",
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  membershipRowActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(182,217,0,0.16)"
  },
  rowLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  avatar: {
    height: 34,
    width: 34,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarActive: {
    backgroundColor: "rgba(182,217,0,0.16)"
  },
  avatarText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "900"
  },
  avatarTextActive: {
    color: colors.primary
  },
  rowTextWrap: {
    flex: 1
  },
  groupName: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "800"
  },
  groupMeta: {
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700"
  },
  check: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "900"
  },
  actionsRow: {
    marginTop: spacing.sm,
    flexDirection: "row",
    gap: spacing.xs
  },
  actionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D7DCE3",
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xs
  },
  actionText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "800"
  }
});
