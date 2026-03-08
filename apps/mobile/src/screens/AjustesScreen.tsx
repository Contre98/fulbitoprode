import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BrandBadgeIcon } from "@/components/BrandBadgeIcon";
import { ScreenFrame } from "@/components/ScreenFrame";
import { useAuth } from "@/state/AuthContext";

export function AjustesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { session, logout } = useAuth();

  return (
    <ScreenFrame
      title="Ajustes"
      subtitle="Cuenta y preferencias"
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
            <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
              <Text allowFontScaling={false} style={styles.backButtonText}>←</Text>
            </Pressable>
          </View>
          <View style={styles.profileRow}>
            <View style={styles.profileDot}>
              <Text allowFontScaling={false} style={styles.profileDotText}>
                {session?.user.name?.slice(0, 2).toUpperCase() || "FC"}
              </Text>
            </View>
            <View style={styles.profileMeta}>
              <Text allowFontScaling={false} numberOfLines={1} style={styles.profileName}>
                {session?.user.name || "Usuario Fulbito"}
              </Text>
              <Text allowFontScaling={false} numberOfLines={1} style={styles.profileEmail}>
                {session?.user.email || "Sin email"}
              </Text>
            </View>
          </View>
        </View>
      }
    >
      <View style={styles.sectionCard}>
        <Text allowFontScaling={false} style={styles.sectionTitle}>CUENTA</Text>
        <Pressable onPress={() => navigation.navigate("Perfil")} style={styles.rowButton}>
          <Text allowFontScaling={false} style={styles.rowButtonText}>Mi Perfil</Text>
        </Pressable>
        <Pressable onPress={() => void logout()} style={styles.logoutButton}>
          <Text allowFontScaling={false} style={styles.logoutText}>Cerrar sesión</Text>
        </Pressable>
      </View>

      <View style={styles.sectionCard}>
        <Text allowFontScaling={false} style={styles.sectionTitle}>PREFERENCIAS</Text>
        <View style={styles.placeholderRow}>
          <Text allowFontScaling={false} style={styles.placeholderLabel}>Tema</Text>
          <Text allowFontScaling={false} style={styles.placeholderValue}>Próximamente</Text>
        </View>
        <Pressable onPress={() => navigation.navigate("Notificaciones")} style={styles.placeholderRow}>
          <Text allowFontScaling={false} style={styles.placeholderLabel}>Notificaciones</Text>
          <Text allowFontScaling={false} style={styles.placeholderValue}>Gestionar</Text>
        </Pressable>
      </View>
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
    gap: 10
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
  backButton: {
    height: 32,
    width: 32,
    borderRadius: 999,
    backgroundColor: "#E9EDF2",
    alignItems: "center",
    justifyContent: "center"
  },
  backButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "900"
  },
  profileRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  profileDot: {
    height: 48,
    width: 48,
    borderRadius: 14,
    backgroundColor: "#E8EDCD",
    alignItems: "center",
    justifyContent: "center"
  },
  profileDotText: {
    color: "#374151",
    fontWeight: "900",
    fontSize: 14
  },
  profileMeta: {
    flex: 1
  },
  profileName: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "900"
  },
  profileEmail: {
    marginTop: 2,
    color: "#667085",
    fontSize: 11,
    fontWeight: "700"
  },
  sectionCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D7DCE3",
    backgroundColor: "#F8FAFC",
    padding: 12,
    gap: 8
  },
  sectionTitle: {
    color: "#8A94A4",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.7
  },
  rowButton: {
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D7DCE3",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    paddingHorizontal: 10
  },
  rowButtonText: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "800"
  },
  logoutButton: {
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: "#FDECEC",
    borderWidth: 1,
    borderColor: "#F8C8C8",
    justifyContent: "center",
    paddingHorizontal: 10
  },
  logoutText: {
    color: "#B42318",
    fontSize: 13,
    fontWeight: "900"
  },
  placeholderRow: {
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D7DCE3",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10
  },
  placeholderLabel: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "800"
  },
  placeholderValue: {
    color: "#667085",
    fontSize: 11,
    fontWeight: "800"
  }
});
