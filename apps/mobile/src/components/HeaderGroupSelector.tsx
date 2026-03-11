import { useMemo, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { Membership } from "@fulbito/domain";
import { colors, spacing } from "@fulbito/design-tokens";

interface HeaderGroupSelectorProps {
  memberships: Membership[];
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string) => void;
}

function competitionLabel(membership: Membership) {
  return membership.competitionName || membership.leagueName || "Competencia";
}

export function HeaderGroupSelector({ memberships, selectedGroupId, onSelectGroup }: HeaderGroupSelectorProps) {
  const HEADER_BOTTOM_CLEARANCE = 12;
  const DROPDOWN_GAP = 14;
  const triggerRef = useRef<View | null>(null);
  const [open, setOpen] = useState(false);
  const [dropdownTop, setDropdownTop] = useState(86);

  const activeMembership = useMemo(
    () => memberships.find((membership) => membership.groupId === selectedGroupId) || memberships[0] || null,
    [memberships, selectedGroupId]
  );

  const triggerLabel = activeMembership?.groupName || "Sin grupo";

  function openSelector() {
    if (memberships.length === 0) {
      return;
    }

    if (triggerRef.current) {
      triggerRef.current.measureInWindow((_x, y, _width, height) => {
        const nextDropdownTop = Math.max(y + height + HEADER_BOTTOM_CLEARANCE + DROPDOWN_GAP, 56);
        setDropdownTop(nextDropdownTop);
        setOpen(true);
      });
      return;
    }

    setOpen(true);
  }

  return (
    <>
      <Pressable
        ref={triggerRef}
        accessibilityRole="button"
        accessibilityLabel="Seleccionar grupo"
        onPress={openSelector}
        style={[styles.trigger, memberships.length === 0 ? styles.triggerDisabled : null]}
      >
        <Text allowFontScaling={false} numberOfLines={1} style={styles.triggerText}>
          {triggerLabel}
        </Text>
        <Text allowFontScaling={false} style={styles.triggerChevron}>⌄</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />

          <View style={[styles.sheet, { top: dropdownTop }]}>
            <View style={styles.sheetHeader}>
              <Text allowFontScaling={false} style={styles.sheetTitle}>Grupos</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Cerrar selector" onPress={() => setOpen(false)} style={styles.closeButton}>
                <Text allowFontScaling={false} style={styles.closeGlyph}>✕</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
              {memberships.map((membership, index) => {
                const active = membership.groupId === (activeMembership?.groupId || null);
                return (
                  <Pressable
                    key={membership.groupId}
                    accessibilityRole="button"
                    onPress={() => {
                      onSelectGroup(membership.groupId);
                      setOpen(false);
                    }}
                    style={[styles.membershipRow, index < memberships.length - 1 ? styles.membershipRowBorder : null]}
                  >
                    <View style={[styles.activeMarker, active ? styles.activeMarkerVisible : null]} />
                    <View style={styles.rowLeft}>
                      <View style={styles.rowTextWrap}>
                        <Text allowFontScaling={false} numberOfLines={1} style={[styles.groupName, active ? styles.groupNameActive : null]}>
                          {membership.groupName}
                        </Text>
                        <Text allowFontScaling={false} numberOfLines={1} style={styles.groupMeta}>{competitionLabel(membership)}</Text>
                      </View>
                    </View>
                    <View style={styles.optionsButton}>
                      <Text allowFontScaling={false} style={styles.optionsGlyph}>•••</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    maxWidth: 232,
    minHeight: 54,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  triggerDisabled: {
    opacity: 0.6
  },
  triggerText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "700"
  },
  triggerChevron: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "800"
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-start"
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay
  },
  sheet: {
    position: "absolute",
    left: 14,
    right: 14,
    maxHeight: "62%",
    borderRadius: 30,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8
  },
  sheetTitle: {
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: "900"
  },
  closeButton: {
    height: 42,
    width: 42,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted
  },
  closeGlyph: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "500"
  },
  list: {
    gap: 0
  },
  membershipRow: {
    minHeight: 72,
    borderRadius: 0,
    backgroundColor: colors.surface,
    paddingRight: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden"
  },
  membershipRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight
  },
  activeMarker: {
    position: "absolute",
    left: 0,
    top: 14,
    bottom: 14,
    width: 3,
    borderRadius: 999,
    backgroundColor: "transparent"
  },
  activeMarkerVisible: {
    backgroundColor: colors.textPrimary
  },
  rowLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingLeft: 18
  },
  rowTextWrap: {
    flex: 1
  },
  groupName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "800"
  },
  groupNameActive: {
    fontWeight: "900"
  },
  groupMeta: {
    marginTop: 4,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600"
  },
  optionsButton: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center"
  },
  optionsGlyph: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1
  },
});
