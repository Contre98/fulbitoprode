import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@fulbito/design-tokens";
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
            <Pressable onPress={() => navigation.goBack()} hitSlop={6} style={styles.backButton}>
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
  backButton: {
    height: 32,
    width: 32,
    borderRadius: 999,
    backgroundColor: colors.brandTintAlt,
    alignItems: "center",
    justifyContent: "center"
  },
  backButtonText: {
    color: colors.iconStrong,
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
    backgroundColor: colors.brandTint,
    alignItems: "center",
    justifyContent: "center"
  },
  profileDotText: {
    color: colors.iconStrong,
    fontWeight: "900",
    fontSize: 14
  },
  profileMeta: {
    flex: 1
  },
  profileName: {
    color: colors.textTitle,
    fontSize: 16,
    fontWeight: "900"
  },
  profileEmail: {
    marginTop: 2,
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: "700"
  },
  sectionCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceSoft,
    padding: 12,
    gap: 8
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.7
  },
  rowButton: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
    justifyContent: "center",
    paddingHorizontal: 10
  },
  rowButtonText: {
    color: colors.textHigh,
    fontSize: 13,
    fontWeight: "800"
  },
  logoutButton: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: colors.surfaceTintDangerSoft,
    borderWidth: 1,
    borderColor: colors.borderDangerAlt,
    justifyContent: "center",
    paddingHorizontal: 10
  },
  logoutText: {
    color: colors.dangerDeep,
    fontSize: 13,
    fontWeight: "900"
  },
  placeholderRow: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10
  },
  placeholderLabel: {
    color: colors.textHigh,
    fontSize: 13,
    fontWeight: "800"
  },
  placeholderValue: {
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: "800"
  }
});
