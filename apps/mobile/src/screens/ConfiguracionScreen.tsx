import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenFrame } from "@/components/ScreenFrame";
import { BrandBadgeIcon } from "@/components/BrandBadgeIcon";
import { useAuth } from "@/state/AuthContext";
import { useGroupSelection } from "@/state/GroupContext";

type Mode = "create" | "join";

function stageLabel(value: string | undefined) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export function ConfiguracionScreen() {
  const insets = useSafeAreaInsets();
  const { session, logout } = useAuth();
  const { memberships } = useGroupSelection();
  const [mode, setMode] = useState<Mode>("create");

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
            <View style={styles.brandBadge}>
              <BrandBadgeIcon size={16} />
            </View>
            <Text allowFontScaling={false} numberOfLines={1} style={styles.brandTitle}>
              <Text style={styles.brandTitleDark}>FULBITO</Text>
              <Text style={styles.brandTitleAccent}>PRODE</Text>
            </Text>
            <View style={styles.headerActions}>
              <Pressable style={styles.headerActionButton}>
                <Text allowFontScaling={false} style={styles.headerActionGlyph}>◔</Text>
              </Pressable>
              <Pressable style={styles.headerActionButton}>
                <Text allowFontScaling={false} style={styles.headerActionGlyph}>⌂</Text>
                <View style={styles.headerAlertDot} />
              </Pressable>
              <Pressable style={styles.headerActionButton}>
                <Text allowFontScaling={false} style={styles.headerActionGlyph}>⚙</Text>
              </Pressable>
              <View style={styles.profileDot}>
                <Text allowFontScaling={false} style={styles.profileDotText}>
                  {session?.user.name?.slice(0, 2).toUpperCase() || "FC"}
                </Text>
              </View>
            </View>
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

      <View style={styles.formCard}>
        {mode === "create" ? (
          <>
            <TextInput editable={false} value="Nombre del nuevo grupo" style={styles.input} />
            <View style={styles.row}>
              <TextInput editable={false} value="Liga Profesional Apertura" style={[styles.input, styles.rowInput]} />
              <Pressable style={styles.plusButton}>
                <Text allowFontScaling={false} style={styles.plusText}>+</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <TextInput editable={false} value="Código de invitación" style={styles.input} />
            <Pressable style={styles.joinButton}>
              <Text allowFontScaling={false} style={styles.joinButtonText}>Unirse al grupo</Text>
            </Pressable>
          </>
        )}
      </View>

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
          <View style={styles.ownerChip}>
            <Text allowFontScaling={false} style={styles.ownerChipText}>{membership.role.toUpperCase()}</Text>
          </View>
          <Text allowFontScaling={false} style={styles.settingsGlyph}>⚙</Text>
        </View>
      ))}

      <Pressable onPress={() => void logout()} style={styles.logoutButton}>
        <Text allowFontScaling={false} style={styles.logoutText}>Cerrar sesión</Text>
      </Pressable>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    paddingHorizontal: 12,
    paddingTop: 0,
    paddingBottom: 0,
    backgroundColor: "#DDE2E8"
  },
  screenContent: {
    gap: 12
  },
  headerCard: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: "#D7DCE3",
    marginHorizontal: -12
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  brandBadge: {
    height: 28,
    width: 28,
    borderRadius: 10,
    backgroundColor: "#EFF4E6",
    alignItems: "center",
    justifyContent: "center"
  },
  brandTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: -0.2,
    marginRight: 6
  },
  brandTitleDark: {
    color: "#0F172A"
  },
  brandTitleAccent: {
    color: "#A3C90A"
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  headerActionButton: {
    height: 32,
    width: 32,
    borderRadius: 999,
    backgroundColor: "#ECEFF3",
    alignItems: "center",
    justifyContent: "center"
  },
  headerActionGlyph: {
    color: "#6B7280",
    fontSize: 14
  },
  headerAlertDot: {
    position: "absolute",
    top: 8,
    right: 9,
    height: 4,
    width: 4,
    borderRadius: 999,
    backgroundColor: "#D94651"
  },
  profileDot: {
    height: 32,
    width: 32,
    borderRadius: 999,
    backgroundColor: "#E8EDCD",
    alignItems: "center",
    justifyContent: "center"
  },
  profileDotText: {
    color: "#374151",
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
    backgroundColor: "#B7D70A"
  },
  sectionIconText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1F2937"
  },
  sectionTitle: {
    color: "#0F172A",
    fontSize: 22,
    fontWeight: "800"
  },
  sectionSubtitle: {
    marginLeft: "auto",
    color: "#7A8698",
    fontSize: 11,
    fontWeight: "700"
  },
  tabBar: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D7DCE3",
    backgroundColor: "#F8FAFC",
    overflow: "hidden"
  },
  tab: {
    flex: 1,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center"
  },
  tabActive: {
    backgroundColor: "#E9EFCF",
    borderBottomWidth: 2,
    borderBottomColor: "#B7D70A"
  },
  tabLabel: {
    color: "#7A8698",
    fontSize: 12,
    fontWeight: "700"
  },
  tabLabelActive: {
    color: "#A3C90A",
    fontWeight: "800"
  },
  formCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D7DCE3",
    backgroundColor: "#F8FAFC",
    padding: 12,
    gap: 8
  },
  input: {
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DDE3EA",
    backgroundColor: "#E9EDF2",
    paddingHorizontal: 12,
    color: "#8A94A4",
    fontSize: 11,
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
    height: 38,
    width: 44,
    borderRadius: 10,
    backgroundColor: "#CFE77A",
    alignItems: "center",
    justifyContent: "center"
  },
  plusText: {
    color: "#64748B",
    fontSize: 24,
    lineHeight: 24
  },
  joinButton: {
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: "#B7D70A",
    alignItems: "center",
    justifyContent: "center"
  },
  joinButtonText: {
    color: "#111827",
    fontWeight: "800",
    fontSize: 12
  },
  listHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  listHeader: {
    color: "#111827",
    fontSize: 32,
    lineHeight: 34,
    fontWeight: "800"
  },
  listCount: {
    marginTop: 8,
    color: "#6B7280",
    fontSize: 18,
    fontWeight: "700"
  },
  groupCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D7DCE3",
    backgroundColor: "#F8FAFC",
    minHeight: 70,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  avatarBox: {
    height: 40,
    width: 40,
    borderRadius: 10,
    backgroundColor: "#E8EDCD",
    alignItems: "center",
    justifyContent: "center"
  },
  avatarText: {
    color: "#9DBB00",
    fontSize: 22,
    lineHeight: 24,
    fontWeight: "900"
  },
  groupInfo: {
    flex: 1
  },
  groupName: {
    color: "#111827",
    fontSize: 32,
    lineHeight: 34,
    fontWeight: "800"
  },
  groupMeta: {
    marginTop: 2,
    color: "#667085",
    fontSize: 11,
    fontWeight: "700"
  },
  ownerChip: {
    paddingHorizontal: 9,
    height: 22,
    borderRadius: 999,
    backgroundColor: "#EEE6D6",
    alignItems: "center",
    justifyContent: "center"
  },
  ownerChipText: {
    color: "#C47C00",
    fontSize: 10,
    fontWeight: "900"
  },
  settingsGlyph: {
    color: "#98A2B3",
    fontSize: 16
  },
  logoutButton: {
    marginTop: 4,
    borderRadius: 10,
    backgroundColor: "#1F2937",
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center"
  },
  logoutText: {
    color: "#F9FAFB",
    fontWeight: "800",
    fontSize: 12
  }
});
