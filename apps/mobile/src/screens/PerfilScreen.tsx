import { Alert, LayoutAnimation, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, UIManager, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@fulbito/design-tokens";
import { useAuth } from "@/state/AuthContext";
import Constants from "expo-constants";
import { useState } from "react";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";

type IoniconsName = keyof typeof Ionicons.glyphMap;

// ─── SettingsRow ────────────────────────────────────────────────────────────

interface SettingsRowProps {
  icon: IoniconsName;
  label: string;
  onPress?: () => void;
  rightText?: string;
  chevron?: boolean;
  danger?: boolean;
  expanded?: boolean;
  /** Shows an external-link style icon instead of the dropdown chevron */
  navigate?: boolean;
}

function SettingsRow({ icon, label, onPress, rightText, chevron = true, danger, expanded, navigate }: SettingsRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={[styles.rowIconWrap, danger && styles.rowIconWrapDanger]}>
        <Ionicons name={icon} size={18} color={danger ? colors.dangerAccent : colors.textSecondary} />
      </View>
      <Text allowFontScaling={false} style={[styles.rowLabel, danger && styles.rowLabelDanger]}>
        {label}
      </Text>
      {rightText ? (
        <Text allowFontScaling={false} numberOfLines={1} ellipsizeMode="tail" style={styles.rowValue}>{rightText}</Text>
      ) : null}
      {chevron ? (
        <Ionicons
          name={navigate ? "open-outline" : expanded ? "chevron-down" : "chevron-forward"}
          size={navigate ? 15 : 16}
          color={colors.textSoft}
        />
      ) : null}
    </Pressable>
  );
}

// ─── SectionHeader ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <Text allowFontScaling={false} style={styles.sectionHeader}>{title}</Text>
  );
}

// ─── InlineEditField ─────────────────────────────────────────────────────────

interface InlineEditFieldProps {
  label: string;
  value: string;
  placeholder: string;
  secureTextEntry?: boolean;
  confirmLabel?: string;
  onSave: (value: string, confirm?: string) => void;
  onClose: () => void;
}

function InlineEditField({ label, value, placeholder, secureTextEntry, confirmLabel, onSave, onClose }: InlineEditFieldProps) {
  const [draft, setDraft] = useState(value);
  const [confirm, setConfirm] = useState("");

  function handleSave() {
    if (!draft.trim()) return;
    if (confirmLabel && draft !== confirm) {
      Alert.alert("Error", "Las contraseñas no coinciden.");
      return;
    }
    onSave(draft.trim(), confirm);
    onClose();
  }

  return (
    <View style={styles.inlinePanel}>
      <Text allowFontScaling={false} style={styles.inlineFieldLabel}>{label}</Text>
      <TextInput
        style={styles.inlineInput}
        value={draft}
        onChangeText={setDraft}
        placeholder={placeholder}
        placeholderTextColor={colors.textSoft}
        secureTextEntry={secureTextEntry}
        autoFocus
        autoCorrect={false}
        autoCapitalize={secureTextEntry ? "none" : "words"}
      />

      {confirmLabel ? (
        <>
          <Text allowFontScaling={false} style={[styles.inlineFieldLabel, { marginTop: 10 }]}>{confirmLabel}</Text>
          <TextInput
            style={styles.inlineInput}
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Repetir contraseña"
            placeholderTextColor={colors.textSoft}
            secureTextEntry
            autoCorrect={false}
            autoCapitalize="none"
          />
        </>
      ) : null}

      <View style={styles.inlineActions}>
        <Pressable onPress={onClose} style={styles.inlineCancelBtn}>
          <Text allowFontScaling={false} style={styles.inlineCancelText}>Cancelar</Text>
        </Pressable>
        <Pressable
          onPress={handleSave}
          style={[styles.inlineSaveBtn, !draft.trim() && styles.inlineBtnDisabled]}
        >
          <Text allowFontScaling={false} style={styles.inlineSaveText}>Guardar</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── InlineDeleteField ───────────────────────────────────────────────────────

function InlineDeleteField({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) {
  const [text, setText] = useState("");
  const confirmed = text.toLowerCase() === "eliminar";

  function handleConfirm() {
    if (!confirmed) return;
    onConfirm();
  }

  return (
    <View style={styles.inlinePanel}>
      <Text allowFontScaling={false} style={styles.inlineWarning}>
        Esta acción es irreversible. Se eliminarán todos tus datos y pronósticos permanentemente.
      </Text>

      <Text allowFontScaling={false} style={styles.inlineFieldLabel}>
        Escribí <Text style={styles.inlineFieldLabelBold}>eliminar</Text> para confirmar
      </Text>
      <TextInput
        style={[styles.inlineInput, styles.inlineInputDanger]}
        value={text}
        onChangeText={setText}
        placeholder="eliminar"
        placeholderTextColor={colors.textSoft}
        autoFocus
        autoCorrect={false}
        autoCapitalize="none"
      />

      <View style={styles.inlineActions}>
        <Pressable onPress={onClose} style={styles.inlineCancelBtn}>
          <Text allowFontScaling={false} style={styles.inlineCancelText}>Cancelar</Text>
        </Pressable>
        <Pressable
          onPress={handleConfirm}
          style={[styles.inlineDeleteBtn, !confirmed && styles.inlineBtnDisabled]}
        >
          <Text allowFontScaling={false} style={styles.inlineDeleteText}>Eliminar</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── PerfilScreen ─────────────────────────────────────────────────────────────

type ExpandedSection = "nombre" | "email" | "password" | "delete" | null;

function toggleSection(current: ExpandedSection, target: ExpandedSection): ExpandedSection {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  return current === target ? null : target;
}

export function PerfilScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { session, logout } = useAuth();
  const [expanded, setExpanded] = useState<ExpandedSection>(null);

  function handleToggle(section: ExpandedSection) {
    setExpanded(toggleSection(expanded, section));
  }

  function handleClose() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(null);
  }

  function handleLogout() {
    Alert.alert("Cerrar sesión", "¿Seguro que querés cerrar sesión?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Cerrar sesión", style: "destructive", onPress: () => void logout() }
    ]);
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarCircle}>
          <Ionicons name="person" size={28} color={colors.primary} />
        </View>
        <View style={styles.headerTextWrap}>
          <Text allowFontScaling={false} style={styles.headerName}>
            {session?.user?.name || "Jugador"}
          </Text>
          <Text allowFontScaling={false} style={styles.headerEmail}>
            {session?.user?.email || ""}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Cuenta */}
        <SectionHeader title="Cuenta" />
        <View style={styles.card}>
          <SettingsRow
            icon="person-outline"
            label="Nombre"
            rightText={expanded !== "nombre" ? (session?.user?.name || "—") : undefined}
            onPress={() => handleToggle("nombre")}
            expanded={expanded === "nombre"}
          />
          {expanded === "nombre" && (
            <InlineEditField
              label="Nombre"
              value={session?.user?.name || ""}
              placeholder="Tu nombre"
              onClose={handleClose}
              onSave={(_val) => { /* TODO: call API to update name */ }}
            />
          )}

          <View style={styles.separator} />

          <SettingsRow
            icon="mail-outline"
            label="Email"
            rightText={expanded !== "email" ? (session?.user?.email || "—") : undefined}
            onPress={() => handleToggle("email")}
            expanded={expanded === "email"}
          />
          {expanded === "email" && (
            <InlineEditField
              label="Email"
              value={session?.user?.email || ""}
              placeholder="tu@email.com"
              onClose={handleClose}
              onSave={(_val) => { /* TODO: call API to update email */ }}
            />
          )}

          <View style={styles.separator} />

          <SettingsRow
            icon="lock-closed-outline"
            label="Contraseña"
            onPress={() => handleToggle("password")}
            expanded={expanded === "password"}
          />
          {expanded === "password" && (
            <InlineEditField
              label="Nueva contraseña"
              value=""
              placeholder="Nueva contraseña"
              secureTextEntry
              confirmLabel="Confirmar contraseña"
              onClose={handleClose}
              onSave={(_val, _confirm) => { /* TODO: call API to update password */ }}
            />
          )}

          <View style={styles.separator} />

          <SettingsRow
            icon="trash-outline"
            label="Eliminar cuenta"
            onPress={() => handleToggle("delete")}
            danger
            expanded={expanded === "delete"}
          />
          {expanded === "delete" && (
            <InlineDeleteField
              onClose={handleClose}
              onConfirm={() => { /* TODO: call API to delete account, then logout */ }}
            />
          )}
        </View>

        {/* Preferencias */}
        <SectionHeader title="Preferencias" />
        <View style={styles.card}>
          <SettingsRow icon="notifications-outline" label="Notificaciones" onPress={() => navigation.navigate("Notificaciones")} />
        </View>

        {/* Sobre la app */}
        <SectionHeader title="Sobre la app" />
        <View style={styles.card}>
          <SettingsRow icon="book-outline" label="Reglas" onPress={() => navigation.navigate("Reglas")} navigate />
          <View style={styles.separator} />
          <SettingsRow icon="chatbubble-outline" label="Sugerencias" onPress={() => navigation.navigate("Sugerencias")} navigate />
          <View style={styles.separator} />
          <SettingsRow icon="document-text-outline" label="Términos y condiciones" onPress={() => navigation.navigate("TerminosCondiciones")} navigate />
          <View style={styles.separator} />
          <SettingsRow icon="shield-checkmark-outline" label="Políticas de privacidad" onPress={() => navigation.navigate("PoliticasPrivacidad")} navigate />
        </View>

        {/* Logout */}
        <Pressable
          accessibilityRole="button"
          onPress={handleLogout}
          style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutButtonPressed]}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.dangerAccent} />
          <Text allowFontScaling={false} style={styles.logoutText}>Cerrar sesión</Text>
        </Pressable>

        <Text allowFontScaling={false} style={styles.versionFooter}>
          Fulbito Prode v{APP_VERSION}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.canvas
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: colors.canvas
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center"
  },
  headerTextWrap: {
    flex: 1,
    gap: 2
  },
  headerName: {
    color: colors.textTitle,
    fontSize: 20,
    fontWeight: "900"
  },
  headerEmail: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600"
  },
  scrollContent: {
    paddingHorizontal: 16
  },
  sectionHeader: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 4
  },
  card: {
    borderRadius: 16,
    backgroundColor: colors.surface,
    overflow: "hidden"
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 50,
    paddingHorizontal: 14,
    gap: 12
  },
  rowPressed: {
    backgroundColor: colors.surfaceMuted
  },
  rowIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center"
  },
  rowIconWrapDanger: {
    backgroundColor: colors.surfaceTintDangerSoft
  },
  rowLabel: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700"
  },
  rowLabelDanger: {
    color: colors.dangerAccent
  },
  rowValue: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "600",
    flexShrink: 1,
    maxWidth: 140
  },
  separator: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginLeft: 56
  },
  logoutButton: {
    marginTop: 28,
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: colors.surfaceTintDangerSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  logoutButtonPressed: {
    opacity: 0.7
  },
  logoutText: {
    color: colors.dangerAccent,
    fontSize: 15,
    fontWeight: "800"
  },
  versionFooter: {
    marginTop: 16,
    textAlign: "center",
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: "600"
  },

  // ─── Inline expandable panels ───────────────────────────────────────────────
  inlinePanel: {
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 14
  },
  inlineFieldLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6
  },
  inlineFieldLabelBold: {
    color: colors.dangerAccent,
    fontWeight: "900"
  },
  inlineInput: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 12,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "600"
  },
  inlineInputDanger: {
    borderColor: colors.borderDangerSoft
  },
  inlineWarning: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    marginBottom: 12
  },
  inlineActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12
  },
  inlineCancelBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center"
  },
  inlineCancelText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "800"
  },
  inlineSaveBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: colors.primaryStrong,
    alignItems: "center",
    justifyContent: "center"
  },
  inlineBtnDisabled: {
    opacity: 0.4
  },
  inlineSaveText: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: "800"
  },
  inlineDeleteBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: colors.dangerAccent,
    alignItems: "center",
    justifyContent: "center"
  },
  inlineDeleteText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800"
  }
});
