import { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated as NativeAnimated
} from "react-native";
import Constants from "expo-constants";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing } from "@fulbito/design-tokens";
import { translateBackendError } from "@fulbito/domain";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path, Rect } from "react-native-svg";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring
} from "react-native-reanimated";
import { useAuth } from "@/state/AuthContext";
import { usePendingInvite } from "@/state/PendingInviteContext";

WebBrowser.maybeCompleteAuthSession();

const EXPO_PROXY_REDIRECT_URI = "https://auth.expo.io/@fcontre/fulbito-prode-monorepo";
const PRESS_IN_SPRING = {
  damping: 20,
  stiffness: 420,
  mass: 0.4
} as const;
const PRESS_OUT_SPRING = {
  damping: 18,
  stiffness: 340,
  mass: 0.45
} as const;
const TAB_INDICATOR_SPRING = {
  damping: 20,
  stiffness: 290,
  mass: 0.5
} as const;

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

export function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { login, loginWithGoogle, register, requestPasswordReset } = useAuth();
  const { pendingInviteToken } = usePendingInvite();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [modeTabsWidth, setModeTabsWidth] = useState(0);
  const reducedMotion = useReducedMotion();

  const googleExpoClientId = process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID;
  const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const googleAndroidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const isExpoGo = Constants.appOwnership === "expo";
  const hasGoogleClientConfig = Boolean(
    googleExpoClientId || googleIosClientId || googleAndroidClientId || googleWebClientId
  );

  const [googleRequest, , promptGoogleAsync] = Google.useIdTokenAuthRequest({
    clientId: googleExpoClientId || googleWebClientId || "",
    iosClientId: isExpoGo ? undefined : googleIosClientId,
    androidClientId: isExpoGo ? undefined : googleAndroidClientId,
    webClientId: googleWebClientId,
    redirectUri: isExpoGo
      ? EXPO_PROXY_REDIRECT_URI
      : AuthSession.makeRedirectUri({
          native: "fulbito:/oauthredirect"
        }),
    responseType: isExpoGo ? "id_token" : undefined,
    shouldAutoExchangeCode: isExpoGo ? false : undefined,
    scopes: ["profile", "email"]
  });

  const fadeAnim = useRef(new NativeAnimated.Value(0)).current;
  const slideAnim = useRef(new NativeAnimated.Value(20)).current;
  const modeIndicatorX = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
      return;
    }
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    NativeAnimated.parallel([
      NativeAnimated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      NativeAnimated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, reducedMotion, slideAnim]);

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

  async function submitGoogleAuth() {
    if (!hasGoogleClientConfig) {
      setError("Google Login no está configurado en esta build.");
      return;
    }
    setError(null);
    setInfo(null);
    setGoogleSubmitting(true);
    try {
      const result = await promptGoogleAsync();
      if (result.type !== "success") {
        return;
      }

      const idToken = result.params?.id_token;
      if (!idToken) {
        throw new Error("Google sign-in did not return an id token.");
      }

      await loginWithGoogle(idToken);
    } catch (nextError) {
      setError(translateBackendError(nextError, "No se pudo autenticar con Google"));
    } finally {
      setGoogleSubmitting(false);
    }
  }

  const isLogin = mode === "login";
  const tabWidth = modeTabsWidth > 0 ? (modeTabsWidth - 6) / 2 : 0;
  const activeTabIndex = isLogin ? 0 : 1;
  const modeIndicatorStyle = useAnimatedStyle(() => ({
    opacity: tabWidth > 0 ? 1 : 0,
    transform: [{ translateX: modeIndicatorX.value }]
  }));
  const loginTabPress = usePressScale(0.98, isLogin);
  const signupTabPress = usePressScale(0.98, !isLogin);
  const eyePress = usePressScale(0.92);
  const canInteract = !(submitting || googleSubmitting);
  const forgotPress = usePressScale(0.98, !isLogin || !canInteract);
  const submitPress = usePressScale(0.98, !canInteract);
  const googleDisabled = !hasGoogleClientConfig || !googleRequest || submitting || googleSubmitting;
  const googlePress = usePressScale(0.98, googleDisabled);

  useEffect(() => {
    if (tabWidth <= 0) {
      return;
    }
    const target = activeTabIndex * (tabWidth + 0);
    if (reducedMotion) {
      modeIndicatorX.value = target;
      return;
    }
    modeIndicatorX.value = withSpring(target, TAB_INDICATOR_SPRING);
  }, [activeTabIndex, modeIndicatorX, reducedMotion, tabWidth]);

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
            <NativeAnimated.View
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
            </NativeAnimated.View>
          </View>

          {/* ── Form section ── */}
          <View style={styles.formSection}>
            <View style={styles.formCard}>
              <View style={styles.modeTabRow} onLayout={(event) => setModeTabsWidth(event.nativeEvent.layout.width)}>
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.modeTabIndicator,
                    { width: tabWidth > 0 ? tabWidth : undefined },
                    modeIndicatorStyle
                  ]}
                />
                <Animated.View style={[styles.modeTabWrapper, loginTabPress.animatedStyle]}>
                  <Pressable
                    onPress={() => !isLogin && switchMode()}
                    onPressIn={loginTabPress.onPressIn}
                    onPressOut={loginTabPress.onPressOut}
                    style={styles.modeTab}
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
                </Animated.View>
                <Animated.View style={[styles.modeTabWrapper, signupTabPress.animatedStyle]}>
                  <Pressable
                    onPress={() => isLogin && switchMode()}
                    onPressIn={signupTabPress.onPressIn}
                    onPressOut={signupTabPress.onPressOut}
                    style={styles.modeTab}
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
                </Animated.View>
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
                <Animated.View style={[styles.eyeButton, eyePress.animatedStyle]}>
                  <Pressable
                    onPress={() => setShowPassword((v) => !v)}
                    onPressIn={eyePress.onPressIn}
                    onPressOut={eyePress.onPressOut}
                    style={styles.eyeButtonHit}
                    hitSlop={8}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={colors.textMuted}
                    />
                  </Pressable>
                </Animated.View>
              </View>

              {isLogin ? (
                <Animated.View style={[styles.forgotRow, forgotPress.animatedStyle]}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void submitForgotPassword()}
                    onPressIn={forgotPress.onPressIn}
                    onPressOut={forgotPress.onPressOut}
                    disabled={submitting || googleSubmitting}
                  >
                    <Text style={styles.forgotText}>
                      {submitting ? "Enviando..." : "¿Olvidaste tu contraseña?"}
                    </Text>
                  </Pressable>
                </Animated.View>
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

              <Animated.View style={submitPress.animatedStyle}>
                <Pressable
                  onPress={() => void submit()}
                  onPressIn={submitPress.onPressIn}
                  onPressOut={submitPress.onPressOut}
                  style={[
                    styles.submitButton,
                    (submitting || googleSubmitting) && styles.submitButtonDisabled
                  ]}
                  disabled={submitting || googleSubmitting}
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
              </Animated.View>

              <View style={styles.separatorRow}>
                <View style={styles.separatorLine} />
                <Text style={styles.separatorText}>o</Text>
                <View style={styles.separatorLine} />
              </View>

              <Animated.View style={googlePress.animatedStyle}>
                <Pressable
                  onPress={() => void submitGoogleAuth()}
                  onPressIn={googlePress.onPressIn}
                  onPressOut={googlePress.onPressOut}
                  style={[
                    styles.googleButton,
                    googleDisabled && styles.submitButtonDisabled
                  ]}
                  disabled={googleDisabled}
                >
                  <Ionicons name="logo-google" size={18} color={colors.textPrimary} />
                  <Text style={styles.googleButtonText}>
                    {googleSubmitting ? "Conectando..." : "Continuar con Google"}
                  </Text>
                </Pressable>
              </Animated.View>
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
    gap: 0,
    position: "relative",
    overflow: "hidden"
  },
  modeTabIndicator: {
    position: "absolute",
    left: 3,
    top: 3,
    bottom: 3,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderMuted
  },
  modeTabWrapper: {
    flex: 1
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
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
  },
  eyeButtonHit: {
    padding: 4
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
  separatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderMuted
  },
  separatorText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700"
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    backgroundColor: colors.surfaceMuted
  },
  googleButtonText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700"
  }
});
