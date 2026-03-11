import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { colors, spacing } from "@fulbito/design-tokens";
import { translateBackendError } from "@fulbito/domain";
import { useAuth } from "@/state/AuthContext";
import { usePendingInvite } from "@/state/PendingInviteContext";

export function AuthScreen() {
  const { login, register, requestPasswordReset } = useAuth();
  const { pendingInviteToken } = usePendingInvite();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      setError(translateBackendError(nextError, "No se pudo iniciar la recuperación de contraseña."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fulbito Prode</Text>
      <Text style={styles.subtitle}>{mode === "login" ? "Iniciar sesión" : "Crear cuenta"}</Text>
      {pendingInviteToken ? <Text style={styles.pendingInviteText}>Hay una invitación pendiente. Iniciá sesión para continuar.</Text> : null}
      {mode === "signup" ? <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Nombre" placeholderTextColor={colors.textSecondary} /> : null}
      <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" placeholder="Email" placeholderTextColor={colors.textSecondary} />
      <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="Contraseña" placeholderTextColor={colors.textSecondary} />
      {mode === "login" ? (
        <Pressable accessibilityRole="button" onPress={() => void submitForgotPassword()} disabled={submitting}>
          <Text style={styles.forgotPasswordText}>{submitting ? "Enviando..." : "¿Olvidaste tu contraseña?"}</Text>
        </Pressable>
      ) : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {info ? <Text style={styles.infoText}>{info}</Text> : null}
      <Pressable onPress={() => void submit()} style={[styles.button, submitting ? styles.buttonDisabled : null]} disabled={submitting}>
        <Text style={styles.buttonText}>{submitting ? "Validando..." : mode === "login" ? "Entrar" : "Crear cuenta"}</Text>
      </Pressable>
      <Pressable onPress={() => setMode((prev) => (prev === "login" ? "signup" : "login"))}>
        <Text style={styles.switchText}>{mode === "login" ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.xl,
    justifyContent: "center",
    gap: spacing.md
  },
  title: {
    color: colors.textPrimary,
    fontSize: 34,
    fontWeight: "900"
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 24,
    fontWeight: "800",
    marginBottom: spacing.sm
  },
  pendingInviteText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600"
  },
  input: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "500",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  button: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: "center"
  },
  buttonText: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: "800"
  },
  switchText: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: "center",
    marginTop: spacing.sm
  },
  forgotPasswordText: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: "right",
    fontWeight: "700"
  },
  errorText: {
    color: colors.dangerStrong,
    fontSize: 12,
    fontWeight: "600"
  },
  infoText: {
    color: colors.successDeep,
    fontSize: 12,
    fontWeight: "600"
  },
  buttonDisabled: {
    opacity: 0.6
  }
});
