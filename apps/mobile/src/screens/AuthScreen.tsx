import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing } from "@fulbito/design-tokens";
import { translateBackendError } from "@fulbito/domain";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path, Rect } from "react-native-svg";
import { useAuth } from "@/state/AuthContext";
import { usePendingInvite } from "@/state/PendingInviteContext";

export function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { login, register, requestPasswordReset } = useAuth();
  const { pendingInviteToken } = usePendingInvite();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  function switchMode() {
    setError(null);
    setInfo(null);
    setMode((prev) => (prev === "login" ? "signup" : "login"));
  }

  async function submit() {
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
        return;
      }
      await register({ email, password, name: name || "Jugador" });
    } catch (nextError) {
      setError(translateBackendError(nextError, "No se pudo autenticar"));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitForgotPassword() {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError("Ingresá tu email para recuperar la contraseña.");
      return;
    }

    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      const payload = await requestPasswordReset(cleanEmail);
      setInfo(payload.message);
    } catch (nextError) {
      setError(
        translateBackendError(
          nextError,
          "No se pudo iniciar la recuperación de contraseña."
        )
      );
    } finally {
      setSubmitting(false);
    }
  }

  const isLogin = mode === "login";

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* ── Hero section ── */}
          <View style={[styles.hero, { paddingTop: insets.top + 32 }]}>
            <View style={styles.heroAccentBar} />
            <Animated.View
              style={[
                styles.logoContainer,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
              ]}
            >
              <View style={styles.logoCircle}>
                <BrandLogo size={44} />
              </View>
              <Text style={styles.heroTitle}>Fulbito Prode</Text>
              <Text style={styles.heroTagline}>
                {isLogin
                  ? "Volvé a competir con tus amigos"
                  : "Competí contra tus amigos"}
              </Text>
            </Animated.View>
          </View>

          {/* ── Form section ── */}
          <View style={styles.formSection}>
            <View style={styles.formCard}>
              <View style={styles.modeTabRow}>
                <Pressable
                  onPress={() => !isLogin && switchMode()}
                  style={[styles.modeTab, isLogin && styles.modeTabActive]}
                >
                  <Text
                    style={[
                      styles.modeTabText,
                      isLogin && styles.modeTabTextActive,
                    ]}
                  >
                    Iniciar sesión
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => isLogin && switchMode()}
                  style={[styles.modeTab, !isLogin && styles.modeTabActive]}
                >
                  <Text
                    style={[
                      styles.modeTabText,
                      !isLogin && styles.modeTabTextActive,
                    ]}
                  >
                    Crear cuenta
                  </Text>
                </Pressable>
              </View>

              {pendingInviteToken ? (
                <View style={styles.inviteBanner}>
                  <Ionicons
                    name="mail-outline"
                    size={16}
                    color={colors.primaryDeep}
                  />
                  <Text style={styles.inviteBannerText}>
                    Tenés una invitación pendiente. Iniciá sesión para
                    continuar.
                  </Text>
                </View>
              ) : null}

              {!isLogin ? (
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="person-outline"
                    size={18}
                    color={colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Tu nombre"
                    placeholderTextColor={colors.textSoft}
                    autoCapitalize="words"
                  />
                </View>
              ) : null}

              <View style={styles.inputWrapper}>
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="tu@email.com"
                  placeholderTextColor={colors.textSoft}
                />
              </View>

              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholder="Contraseña"
                  placeholderTextColor={colors.textSoft}
                />
                <Pressable
                  onPress={() => setShowPassword((v) => !v)}
                  style={styles.eyeButton}
                  hitSlop={8}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={colors.textMuted}
                  />
                </Pressable>
              </View>

              {isLogin ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void submitForgotPassword()}
                  disabled={submitting}
                  style={styles.forgotRow}
                >
                  <Text style={styles.forgotText}>
                    {submitting ? "Enviando..." : "¿Olvidaste tu contraseña?"}
                  </Text>
                </Pressable>
              ) : null}

              {error ? (
                <View style={styles.messageBanner}>
                  <Ionicons
                    name="alert-circle"
                    size={16}
                    color={colors.dangerStrong}
                  />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {info ? (
                <View style={styles.messageBannerSuccess}>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={colors.successDeep}
                  />
                  <Text style={styles.infoText}>{info}</Text>
                </View>
              ) : null}

              <Pressable
                onPress={() => void submit()}
                style={({ pressed }) => [
                  styles.submitButton,
                  submitting && styles.submitButtonDisabled,
                  pressed && !submitting && styles.submitButtonPressed,
                ]}
                disabled={submitting}
              >
                <Text style={styles.submitButtonText}>
                  {submitting
                    ? "Validando..."
                    : isLogin
                      ? "Entrar"
                      : "Crear cuenta"}
                </Text>
                {!submitting ? (
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color={colors.primaryText}
                  />
                ) : null}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function BrandLogo({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 272.41 272.41">
      <Path
        fill={colors.primaryStrong}
        d="M217.93,3c0-1.66-1.34-3-3-3H21.82C9.77,0,0,9.77,0,21.82v194.87c0,.8.32,1.56.88,2.12l48.48,48.48c1.89,1.89,5.12.55,5.12-2.12V54.48h163.45V3Z"
      />
      <Path
        fill={colors.primaryStrong}
        d="M267.29,5.12l-49.19,49.19c-.11.11-.18.27-.18.43v163.21h0s-108.96-.01-108.96-.01v54.48h109.55s0,0,.02,0h31.46c12.38,0,22.42-10.04,22.42-22.42V7.24c0-2.67-3.23-4.01-5.12-2.12Z"
      />
      <Rect fill={colors.primaryStrong} x={108.96} y={108.96} width={54.48} height={54.48} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // ── Hero ──
  hero: {
    backgroundColor: colors.background,
    paddingBottom: 40,
    alignItems: "center",
  },
  heroAccentBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.primary,
  },
  logoContainer: {
    alignItems: "center",
    gap: 12,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: "900",
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  heroTagline: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: -2,
  },

  // ── Form section ──
  formSection: {
    flex: 1,
    marginTop: -20,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.lg,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.borderMuted,
  },

  // ── Mode tabs ──
  modeTabRow: {
    flexDirection: "row",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    padding: 3,
    marginBottom: 4,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  modeTabActive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderMuted,
  },
  modeTabText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textMuted,
  },
  modeTabTextActive: {
    color: colors.textPrimary,
  },

  // ── Invite banner ──
  inviteBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primarySoftAlt,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inviteBannerText: {
    flex: 1,
    color: colors.textBodyStrong,
    fontSize: 12,
    fontWeight: "600",
  },

  // ── Inputs ──
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    minHeight: 48,
  },
  inputIcon: {
    marginLeft: 14,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "500",
    paddingHorizontal: 12,
    paddingVertical: 13,
  },
  passwordInput: {
    paddingRight: 44,
  },
  eyeButton: {
    position: "absolute",
    right: 14,
    padding: 4,
  },

  // ── Forgot password ──
  forgotRow: {
    alignSelf: "flex-end",
    marginTop: -4,
  },
  forgotText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },

  // ── Messages ──
  messageBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: colors.surfaceTintDangerSoft,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  messageBannerSuccess: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: colors.primarySoftAlt,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    flex: 1,
    color: colors.dangerStrong,
    fontSize: 13,
    fontWeight: "600",
  },
  infoText: {
    flex: 1,
    color: colors.successDeep,
    fontSize: 13,
    fontWeight: "600",
  },

  // ── Submit button ──
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: colors.primary,
    marginTop: 4,
  },
  submitButtonText: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: "800",
  },
  submitButtonDisabled: {
    opacity: 0.55,
  },
  submitButtonPressed: {
    opacity: 0.85,
  },
});
