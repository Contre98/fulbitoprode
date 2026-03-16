import { LayoutAnimation, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, UIManager, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@fulbito/design-tokens";
import { translateBackendError } from "@fulbito/domain";
import { authRepository, profileRepository } from "@/repositories";
import { useAuth } from "@/state/AuthContext";
import { useAppDialog } from "@/state/AppDialogContext";
import { useNotificationsOverlay } from "@/state/NotificationsOverlayContext";
import Constants from "expo-constants";
import { useCallback, useEffect, useState } from "react";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from "react-native-reanimated";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const PRESS_IN_SPRING = {
  damping: 22,
  stiffness: 430,
  mass: 0.4
} as const;
const PRESS_OUT_SPRING = {
  damping: 18,
  stiffness: 340,
  mass: 0.45
} as const;

type IoniconsName = keyof typeof Ionicons.glyphMap;

function usePressScale(scaleDown: number, disabled = false) {
  const reducedMotion = useReducedMotion();
  const pressScale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }]
  }));

  const onPressIn = useCallback(() => {
    if (reducedMotion || disabled) {
      pressScale.value = 1;
      return;
    }
    pressScale.value = withSpring(scaleDown, PRESS_IN_SPRING);
  }, [disabled, pressScale, reducedMotion, scaleDown]);

  const onPressOut = useCallback(() => {
    if (reducedMotion || disabled) {
      pressScale.value = 1;
      return;
    }
    pressScale.value = withSpring(1, PRESS_OUT_SPRING);
  }, [disabled, pressScale, reducedMotion]);

  return { animatedStyle, onPressIn, onPressOut };
}

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
  const disabled = !onPress;
  const press = usePressScale(0.992, disabled);

  return (
    <Animated.View style={press.animatedStyle}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        style={styles.row}
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
    </Animated.View>
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
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "email-address";
  confirmLabel?: string;
  onSave: (value: string, confirm?: string) => Promise<boolean | void> | boolean | void;
  onClose: () => void;
}

function InlineEditField({
  label,
  value,
  placeholder,
  secureTextEntry,
  autoCapitalize,
  keyboardType,
  confirmLabel,
  onSave,
  onClose
}: InlineEditFieldProps) {
  const [draft, setDraft] = useState(value);
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const dialog = useAppDialog();
  const canSave = nextValueCanBeSaved(draft, secureTextEntry);
  const cancelPress = usePressScale(0.97, submitting);
  const savePress = usePressScale(0.97, submitting || !canSave);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  async function handleSave() {
    const nextValue = secureTextEntry ? draft : draft.trim();
    const nextConfirm = secureTextEntry ? confirm : confirm.trim();
    if (!nextValue.trim()) return;
    if (confirmLabel && nextValue !== nextConfirm) {
      dialog.alert("Error", "Las contraseñas no coinciden.");
      return;
    }
    setSubmitting(true);
    try {
      const shouldClose = await onSave(nextValue, nextConfirm);
      if (shouldClose !== false) {
        onClose();
      }
    } catch (error) {
      dialog.alert("Error", translateBackendError(error, "No se pudieron guardar los cambios."));
    } finally {
      setSubmitting(false);
    }
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
        editable={!submitting}
        keyboardType={keyboardType}
        autoFocus
        autoCorrect={false}
        autoCapitalize={autoCapitalize ?? (secureTextEntry ? "none" : "words")}
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
            editable={!submitting}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </>
      ) : null}

      <View style={styles.inlineActions}>
        <AnimatedPressable
          disabled={submitting}
          onPress={onClose}
          onPressIn={cancelPress.onPressIn}
          onPressOut={cancelPress.onPressOut}
          style={[styles.inlineCancelBtn, cancelPress.animatedStyle]}
        >
          <Text allowFontScaling={false} style={styles.inlineCancelText}>Cancelar</Text>
        </AnimatedPressable>
        <AnimatedPressable
          onPress={handleSave}
          disabled={submitting || !canSave}
          onPressIn={savePress.onPressIn}
          onPressOut={savePress.onPressOut}
          style={[styles.inlineSaveBtn, (submitting || !canSave) && styles.inlineBtnDisabled, savePress.animatedStyle]}
        >
          <Text allowFontScaling={false} style={styles.inlineSaveText}>{submitting ? "Guardando..." : "Guardar"}</Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

// ─── InlineDeleteField ───────────────────────────────────────────────────────

function nextValueCanBeSaved(value: string, secureTextEntry?: boolean) {
  if (secureTextEntry) {
    return value.trim().length > 0;
  }
  return value.trim().length > 0;
}

function InlineDeleteField({ onConfirm, onClose }: { onConfirm: () => Promise<boolean | void> | boolean | void; onClose: () => void }) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const dialog = useAppDialog();
  const confirmed = text.trim().toLowerCase() === "eliminar";
  const cancelPress = usePressScale(0.97, submitting);
  const deletePress = usePressScale(0.97, submitting || !confirmed);

  async function handleConfirm() {
    if (!confirmed) return;
    setSubmitting(true);
    try {
      const shouldClose = await onConfirm();
      if (shouldClose !== false) {
        onClose();
      }
    } catch (error) {
      dialog.alert("Error", translateBackendError(error, "No se pudo eliminar la cuenta."));
    } finally {
      setSubmitting(false);
    }
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
        editable={!submitting}
        autoFocus
        autoCorrect={false}
        autoCapitalize="none"
      />

      <View style={styles.inlineActions}>
        <AnimatedPressable
          disabled={submitting}
          onPress={onClose}
          onPressIn={cancelPress.onPressIn}
          onPressOut={cancelPress.onPressOut}
          style={[styles.inlineCancelBtn, cancelPress.animatedStyle]}
        >
          <Text allowFontScaling={false} style={styles.inlineCancelText}>Cancelar</Text>
        </AnimatedPressable>
        <AnimatedPressable
          onPress={handleConfirm}
          disabled={submitting || !confirmed}
          onPressIn={deletePress.onPressIn}
          onPressOut={deletePress.onPressOut}
          style={[styles.inlineDeleteBtn, (submitting || !confirmed) && styles.inlineBtnDisabled, deletePress.animatedStyle]}
        >
          <Text allowFontScaling={false} style={styles.inlineDeleteText}>{submitting ? "Eliminando..." : "Eliminar"}</Text>
        </AnimatedPressable>
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
  const notificationsOverlay = useNotificationsOverlay();
  const { session, logout, refresh } = useAuth();
  const dialog = useAppDialog();
  const [expanded, setExpanded] = useState<ExpandedSection>(null);
  const [displayName, setDisplayName] = useState(session?.user?.name || "Jugador");
  const [displayEmail, setDisplayEmail] = useState(session?.user?.email || "");
  const logoutPress = usePressScale(0.975);

  useEffect(() => {
    setDisplayName(session?.user?.name || "Jugador");
    setDisplayEmail(session?.user?.email || "");
  }, [session?.user?.name, session?.user?.email]);

  function handleToggle(section: ExpandedSection) {
    setExpanded(toggleSection(expanded, section));
  }

  function handleClose() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(null);
  }

  function handleLogout() {
    dialog.alert("Cerrar sesión", "¿Seguro que querés cerrar sesión?", [
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
            {displayName}
          </Text>
          <Text allowFontScaling={false} style={styles.headerEmail}>
            {displayEmail}
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
            rightText={expanded !== "nombre" ? (displayName || "—") : undefined}
            onPress={() => handleToggle("nombre")}
            expanded={expanded === "nombre"}
          />
          {expanded === "nombre" && (
            <InlineEditField
              label="Nombre"
              value={displayName}
              placeholder="Tu nombre"
              onClose={handleClose}
              onSave={async (value) => {
                const nextName = value.trim();
                if (!nextName) {
                  dialog.alert("Error", "Ingresá un nombre válido.");
                  return false;
                }
                if (nextName === (displayName || "").trim()) {
                  return true;
                }
                const updatedUser = await profileRepository.updateProfile({ name: nextName });
                setDisplayName(updatedUser.name || nextName);
                void refresh().catch(() => undefined);
                dialog.alert("Listo", "Nombre actualizado.");
                return true;
              }}
            />
          )}

          <View style={styles.separator} />

          <SettingsRow
            icon="mail-outline"
            label="Email"
            rightText={expanded !== "email" ? (displayEmail || "—") : undefined}
            onPress={() => handleToggle("email")}
            expanded={expanded === "email"}
          />
          {expanded === "email" && (
            <InlineEditField
              label="Email"
              value={displayEmail}
              placeholder="tu@email.com"
              autoCapitalize="none"
              keyboardType="email-address"
              onClose={handleClose}
              onSave={async (value) => {
                const nextEmail = value.trim().toLowerCase();
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
                  dialog.alert("Error", "Ingresá un email válido.");
                  return false;
                }
                if (nextEmail === (displayEmail || "").trim().toLowerCase()) {
                  return true;
                }
                const updatedUser = await profileRepository.updateProfile({ email: nextEmail });
                setDisplayEmail(updatedUser.email || nextEmail);
                void refresh().catch(() => undefined);
                dialog.alert("Listo", "Email actualizado.");
                return true;
              }}
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
              onSave={async (value) => {
                if (value.length < 8) {
                  dialog.alert("Error", "La contraseña debe tener al menos 8 caracteres.");
                  return false;
                }
                await authRepository.changePassword({ password: value });
                dialog.alert("Listo", "Contraseña actualizada.");
                return true;
              }}
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
              onConfirm={async () => {
                let confirmed = false;
                await new Promise<void>((resolve) => {
                  dialog.alert("Eliminar cuenta", "¿Seguro que querés eliminar tu cuenta? Esta acción es irreversible.", [
                    { text: "Cancelar", style: "cancel", onPress: () => resolve() },
                    {
                      text: "Eliminar",
                      style: "destructive",
                      onPress: () => {
                        confirmed = true;
                        resolve();
                      }
                    }
                  ]);
                });

                if (!confirmed) {
                  return false;
                }

                await authRepository.deleteAccount();
                await logout();
                return true;
              }}
            />
          )}
        </View>

        {/* Preferencias */}
        <SectionHeader title="Preferencias" />
        <View style={styles.card}>
          <SettingsRow icon="notifications-outline" label="Notificaciones" onPress={notificationsOverlay.toggle} />
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
        <Animated.View style={logoutPress.animatedStyle}>
          <Pressable
            accessibilityRole="button"
            onPress={handleLogout}
            onPressIn={logoutPress.onPressIn}
            onPressOut={logoutPress.onPressOut}
            style={styles.logoutButton}
          >
            <Ionicons name="log-out-outline" size={18} color={colors.dangerAccent} />
            <Text allowFontScaling={false} style={styles.logoutText}>Cerrar sesión</Text>
          </Pressable>
        </Animated.View>

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
