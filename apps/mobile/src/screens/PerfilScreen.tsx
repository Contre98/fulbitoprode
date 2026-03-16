import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getColors } from "@fulbito/design-tokens";
import type { ColorTokens } from "@fulbito/design-tokens";
import { translateBackendError } from "@fulbito/domain";
import { authRepository, notificationsRepository, profileRepository } from "@/repositories";
import { useAuth } from "@/state/AuthContext";
import { useAppDialog } from "@/state/AppDialogContext";
import { ThemePreference, useThemePreference } from "@/state/ThemePreferenceContext";
import { useThemeColors } from "@/theme/useThemeColors";
import Constants from "expo-constants";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import Animated, { runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from "react-native-reanimated";

const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";
const SUGGESTIONS_EXTERNAL_URL = "https://forms.gle/JwHegvNmcsjbGkq18";
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
const EXPAND_OPEN_SPRING = {
  damping: 22,
  stiffness: 310,
  mass: 0.52
} as const;
const EXPAND_CLOSE_TIMING_MS = 110;
const THEME_INDICATOR_SPRING = {
  damping: 20,
  stiffness: 290,
  mass: 0.5
} as const;
let activeColors: ColorTokens = getColors("light");

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
          <Ionicons name={icon} size={18} color={danger ? activeColors.dangerAccent : activeColors.textSecondary} />
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
            color={activeColors.textSoft}
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
        placeholderTextColor={activeColors.textSoft}
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
            placeholderTextColor={activeColors.textSoft}
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
        placeholderTextColor={activeColors.textSoft}
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

function ThemeSelectorField({
  value,
  onChange
}: {
  value: ThemePreference;
  onChange: (next: ThemePreference) => void;
}) {
  const { themePreference } = useThemePreference();
  const isDark = themePreference === "dark";
  const reducedMotion = useReducedMotion();
  const [tabsWidth, setTabsWidth] = useState(0);
  const indicatorX = useSharedValue(0);
  const activeTabIndex = value === "light" ? 0 : 1;
  const tabWidth = tabsWidth > 0 ? (tabsWidth - 8) / 2 : 0;
  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: tabWidth > 0 ? 1 : 0,
    transform: [{ translateX: indicatorX.value }]
  }));

  useEffect(() => {
    if (tabWidth <= 0) return;
    const target = activeTabIndex * (tabWidth + 2);
    if (reducedMotion) {
      indicatorX.value = target;
      return;
    }
    indicatorX.value = withSpring(target, THEME_INDICATOR_SPRING);
  }, [activeTabIndex, indicatorX, reducedMotion, tabWidth]);

  const lightPress = usePressScale(0.97, false);
  const darkPress = usePressScale(0.97, false);

  return (
    <View style={styles.inlinePanel}>
      <Text allowFontScaling={false} style={styles.inlineFieldLabel}>
        Elegí el tema para previsualizar
      </Text>
      <View style={styles.themeOptionsRow} onLayout={(event) => setTabsWidth(event.nativeEvent.layout.width)}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.themeOptionIndicator,
            { width: tabWidth > 0 ? tabWidth : undefined },
            indicatorStyle
          ]}
        />
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityState={{ selected: value === "light" }}
          accessibilityLabel="Tema claro"
          onPress={() => onChange("light")}
          onPressIn={lightPress.onPressIn}
          onPressOut={lightPress.onPressOut}
          style={[
            styles.themeOption,
            lightPress.animatedStyle
          ]}
        >
          <Text
            allowFontScaling={false}
            style={[
              value === "light" ? styles.themeOptionTextActive : styles.themeOptionText,
              value === "light" && isDark ? styles.themeOptionTextActiveDark : null
            ]}
          >
            Claro
          </Text>
        </AnimatedPressable>

        <AnimatedPressable
          accessibilityRole="button"
          accessibilityState={{ selected: value === "dark" }}
          accessibilityLabel="Tema oscuro"
          onPress={() => onChange("dark")}
          onPressIn={darkPress.onPressIn}
          onPressOut={darkPress.onPressOut}
          style={[
            styles.themeOption,
            darkPress.animatedStyle
          ]}
        >
          <Text
            allowFontScaling={false}
            style={[
              value === "dark" ? styles.themeOptionTextActive : styles.themeOptionText,
              value === "dark" && isDark ? styles.themeOptionTextActiveDark : null
            ]}
          >
            Oscuro
          </Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

function NotificationsToggleField({
  value,
  loading,
  saving,
  onChange
}: {
  value: boolean;
  loading: boolean;
  saving: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <View style={styles.inlinePanel}>
      <Text allowFontScaling={false} style={styles.inlineFieldLabel}>
        Activar notificaciones
      </Text>
      {loading ? (
        <View style={styles.inlineLoadingRow}>
          <ActivityIndicator size="small" color={activeColors.primary} />
          <Text allowFontScaling={false} style={styles.inlineLoadingText}>Cargando preferencias...</Text>
        </View>
      ) : (
        <View style={styles.notificationsToggleRow}>
          <View style={styles.notificationsToggleCopy}>
            <Text allowFontScaling={false} style={styles.notificationsToggleTitle}>
              Notificaciones generales
            </Text>
            <Text allowFontScaling={false} style={styles.notificationsToggleSubtitle}>
              {value ? "Recibirás avisos y novedades." : "No recibirás notificaciones."}
            </Text>
          </View>
          <Switch
            accessibilityLabel="Permitir notificaciones"
            value={value}
            onValueChange={onChange}
            disabled={saving}
            thumbColor={value ? activeColors.primaryStrong : undefined}
            trackColor={{ false: activeColors.borderMuted, true: activeColors.primarySoftAlt }}
          />
        </View>
      )}
    </View>
  );
}

// ─── PerfilScreen ─────────────────────────────────────────────────────────────

type ExpandedSection = "nombre" | "email" | "password" | "delete" | "notifications" | "theme" | null;

function AnimatedExpandable({ visible, children }: { visible: boolean; children: ReactNode }) {
  const reducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(visible ? 1 : 0);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: (1 - progress.value) * -8 },
      { scale: 0.985 + progress.value * 0.015 }
    ]
  }));

  useEffect(() => {
    if (visible) {
      setMounted(true);
      if (reducedMotion) {
        progress.value = 1;
        return;
      }
      progress.value = 0;
      progress.value = withSpring(1, EXPAND_OPEN_SPRING);
      return;
    }
    if (!mounted) {
      return;
    }
    if (reducedMotion) {
      progress.value = 0;
      setMounted(false);
      return;
    }
    progress.value = withTiming(0, { duration: EXPAND_CLOSE_TIMING_MS }, (finished) => {
      if (finished) {
        runOnJS(setMounted)(false);
      }
    });
  }, [mounted, progress, reducedMotion, visible]);

  if (!mounted) {
    return null;
  }
  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

export function PerfilScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const themeColors = useThemeColors();
  activeColors = themeColors;
  styles = useMemo(() => createStyles(), [themeColors]);
  const { themePreference, setThemePreference } = useThemePreference();
  const { session, logout, updateSessionUser } = useAuth();
  const dialog = useAppDialog();
  const [expanded, setExpanded] = useState<ExpandedSection>(null);
  const [displayName, setDisplayName] = useState(session?.user?.name || "Jugador");
  const [displayEmail, setDisplayEmail] = useState(session?.user?.email || "");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationsSaving, setNotificationsSaving] = useState(false);
  const logoutPress = usePressScale(0.975);

  useEffect(() => {
    setDisplayName(session?.user?.name || "Jugador");
    setDisplayEmail(session?.user?.email || "");
  }, [session?.user?.name, session?.user?.email]);

  useEffect(() => {
    let cancelled = false;

    const loadNotificationPreferences = async () => {
      setNotificationsLoading(true);
      try {
        const preferences = await notificationsRepository.getPreferences();
        if (cancelled) return;
        setNotificationsEnabled(preferences.reminders || preferences.results || preferences.social);
      } catch (error) {
        if (!cancelled) {
          dialog.alert("Error", translateBackendError(error, "No se pudieron cargar las preferencias de notificaciones."));
        }
      } finally {
        if (!cancelled) {
          setNotificationsLoading(false);
        }
      }
    };

    void loadNotificationPreferences();
    return () => {
      cancelled = true;
    };
  }, [dialog]);

  function handleToggle(section: ExpandedSection) {
    setExpanded((current) => (current === section ? null : section));
  }

  function handleClose() {
    setExpanded(null);
  }

  const handleNotificationsChange = useCallback((nextEnabled: boolean) => {
    if (notificationsSaving || notificationsLoading) {
      return;
    }
    const previous = notificationsEnabled;
    setNotificationsEnabled(nextEnabled);
    setNotificationsSaving(true);

    void notificationsRepository
      .updatePreferences({
        reminders: nextEnabled,
        results: nextEnabled,
        social: nextEnabled
      })
      .catch((error) => {
        setNotificationsEnabled(previous);
        dialog.alert("Error", translateBackendError(error, "No se pudieron guardar las preferencias de notificaciones."));
      })
      .finally(() => {
        setNotificationsSaving(false);
      });
  }, [dialog, notificationsEnabled, notificationsLoading, notificationsSaving]);

  function handleLogout() {
    dialog.alert("Cerrar sesión", "¿Seguro que querés cerrar sesión?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Cerrar sesión", style: "destructive", onPress: () => void logout() }
    ]);
  }

  function handleOpenSuggestions() {
    dialog.alert(
      "⚠️ Enlace externo",
      "Vas a salir de la app para abrir un formulario externo. ¿Querés continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Continuar",
          onPress: () => {
            void Linking.openURL(SUGGESTIONS_EXTERNAL_URL).catch((error) => {
              dialog.alert("Error", translateBackendError(error, "No se pudo abrir el enlace externo."));
            });
          }
        }
      ]
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarCircle}>
          <Ionicons name="person" size={28} color={activeColors.primary} />
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
          <AnimatedExpandable visible={expanded === "nombre"}>
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
                const persistedName = updatedUser.name || nextName;
                setDisplayName(persistedName);
                updateSessionUser({ name: persistedName });
                dialog.alert("Listo", "Nombre actualizado.");
                return true;
              }}
            />
          </AnimatedExpandable>

          <View style={styles.separator} />

          <SettingsRow
            icon="mail-outline"
            label="Email"
            rightText={expanded !== "email" ? (displayEmail || "—") : undefined}
            onPress={() => handleToggle("email")}
            expanded={expanded === "email"}
          />
          <AnimatedExpandable visible={expanded === "email"}>
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
                const persistedEmail = updatedUser.email || nextEmail;
                setDisplayEmail(persistedEmail);
                updateSessionUser({ email: persistedEmail });
                dialog.alert("Listo", "Email actualizado.");
                return true;
              }}
            />
          </AnimatedExpandable>

          <View style={styles.separator} />

          <SettingsRow
            icon="lock-closed-outline"
            label="Contraseña"
            onPress={() => handleToggle("password")}
            expanded={expanded === "password"}
          />
          <AnimatedExpandable visible={expanded === "password"}>
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
          </AnimatedExpandable>

          <View style={styles.separator} />

          <SettingsRow
            icon="trash-outline"
            label="Eliminar cuenta"
            onPress={() => handleToggle("delete")}
            danger
            expanded={expanded === "delete"}
          />
          <AnimatedExpandable visible={expanded === "delete"}>
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
          </AnimatedExpandable>
        </View>

        {/* Preferencias */}
        <SectionHeader title="Preferencias" />
        <View style={styles.card}>
          <SettingsRow
            icon="notifications-outline"
            label="Notificaciones"
            rightText={expanded !== "notifications" ? (notificationsLoading ? "Cargando..." : notificationsEnabled ? "Activadas" : "Desactivadas") : undefined}
            onPress={() => handleToggle("notifications")}
            expanded={expanded === "notifications"}
          />
          <AnimatedExpandable visible={expanded === "notifications"}>
            <NotificationsToggleField
              value={notificationsEnabled}
              loading={notificationsLoading}
              saving={notificationsSaving}
              onChange={handleNotificationsChange}
            />
          </AnimatedExpandable>
          <View style={styles.separator} />
          <SettingsRow
            icon="contrast-outline"
            label="Tema"
            rightText={expanded !== "theme" ? (themePreference === "dark" ? "Oscuro" : "Claro") : undefined}
            onPress={() => handleToggle("theme")}
            expanded={expanded === "theme"}
          />
          <AnimatedExpandable visible={expanded === "theme"}>
            <ThemeSelectorField value={themePreference} onChange={setThemePreference} />
          </AnimatedExpandable>
        </View>

        {/* Sobre la app */}
        <SectionHeader title="Sobre la app" />
        <View style={styles.card}>
          <SettingsRow icon="book-outline" label="Reglas" onPress={() => navigation.navigate("Reglas")} navigate />
          <View style={styles.separator} />
          <SettingsRow icon="chatbubble-outline" label="Sugerencias" onPress={handleOpenSuggestions} navigate />
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
            <Ionicons name="log-out-outline" size={18} color={activeColors.dangerAccent} />
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

const createStyles = () => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: activeColors.canvas
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: activeColors.canvas
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: activeColors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center"
  },
  headerTextWrap: {
    flex: 1,
    gap: 2
  },
  headerName: {
    color: activeColors.textTitle,
    fontSize: 20,
    fontWeight: "900"
  },
  headerEmail: {
    color: activeColors.textMuted,
    fontSize: 13,
    fontWeight: "600"
  },
  scrollContent: {
    paddingHorizontal: 16
  },
  sectionHeader: {
    color: activeColors.textMuted,
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
    backgroundColor: activeColors.surface,
    borderWidth: 1,
    borderColor: activeColors.borderSubtle,
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
    backgroundColor: activeColors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center"
  },
  rowIconWrapDanger: {
    backgroundColor: activeColors.surfaceTintDangerSoft
  },
  rowLabel: {
    flex: 1,
    color: activeColors.textPrimary,
    fontSize: 15,
    fontWeight: "700"
  },
  rowLabelDanger: {
    color: activeColors.dangerAccent
  },
  rowValue: {
    color: activeColors.textMuted,
    fontSize: 14,
    fontWeight: "600",
    flexShrink: 1,
    maxWidth: 140
  },
  separator: {
    height: 1,
    backgroundColor: activeColors.borderLight,
    marginLeft: 56
  },
  logoutButton: {
    marginTop: 28,
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: activeColors.surfaceTintDangerSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  logoutText: {
    color: activeColors.dangerAccent,
    fontSize: 15,
    fontWeight: "800"
  },
  versionFooter: {
    marginTop: 16,
    textAlign: "center",
    color: activeColors.textSoft,
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
    color: activeColors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6
  },
  inlineFieldLabelBold: {
    color: activeColors.dangerAccent,
    fontWeight: "900"
  },
  inlineInput: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: activeColors.borderMuted,
    backgroundColor: activeColors.surfaceMuted,
    paddingHorizontal: 12,
    color: activeColors.textPrimary,
    fontSize: 15,
    fontWeight: "600"
  },
  inlineInputDanger: {
    borderColor: activeColors.borderDangerSoft
  },
  inlineWarning: {
    color: activeColors.textSecondary,
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
    backgroundColor: activeColors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center"
  },
  inlineCancelText: {
    color: activeColors.textSecondary,
    fontSize: 14,
    fontWeight: "800"
  },
  inlineSaveBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: activeColors.primaryStrong,
    alignItems: "center",
    justifyContent: "center"
  },
  inlineBtnDisabled: {
    opacity: 0.4
  },
  inlineSaveText: {
    color: activeColors.textInverse,
    fontSize: 14,
    fontWeight: "800"
  },
  inlineDeleteBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: activeColors.dangerAccent,
    alignItems: "center",
    justifyContent: "center"
  },
  inlineDeleteText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800"
  },
  inlineLoadingRow: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: activeColors.borderMuted,
    backgroundColor: activeColors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8
  },
  inlineLoadingText: {
    color: activeColors.textMuted,
    fontSize: 13,
    fontWeight: "600"
  },
  notificationsToggleRow: {
    marginTop: 8,
    minHeight: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: activeColors.borderSubtle,
    backgroundColor: activeColors.surfaceSoft,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  notificationsToggleCopy: {
    flex: 1,
    gap: 3
  },
  notificationsToggleTitle: {
    color: activeColors.textPrimary,
    fontSize: 14,
    fontWeight: "800"
  },
  notificationsToggleSubtitle: {
    color: activeColors.textMuted,
    fontSize: 12,
    fontWeight: "600"
  },
  themeOptionsRow: {
    marginTop: 10,
    position: "relative",
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: activeColors.borderSubtle,
    backgroundColor: activeColors.surfaceSoft,
    padding: 3,
    overflow: "hidden",
    gap: 2
  },
  themeOptionIndicator: {
    position: "absolute",
    left: 3,
    top: 3,
    bottom: 3,
    borderRadius: 8,
    backgroundColor: activeColors.primaryStrong
  },
  themeOption: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10
  },
  themeOptionText: {
    color: activeColors.textMutedAlt,
    fontSize: 14,
    fontWeight: "800"
  },
  themeOptionTextActive: {
    color: activeColors.textHigh,
    fontSize: 14,
    fontWeight: "800"
  },
  themeOptionTextActiveDark: {
    color: activeColors.textInverse
  }
});

let styles = createStyles();
