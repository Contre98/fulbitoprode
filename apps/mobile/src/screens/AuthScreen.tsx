import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { colors, spacing } from "@fulbito/design-tokens";
import { useAuth } from "@/state/AuthContext";

export function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function submit() {
    if (mode === "login") {
      await login(email, password);
      return;
    }
    await register({ email, password, name: name || "Jugador" });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fulbito Prode</Text>
      <Text style={styles.subtitle}>{mode === "login" ? "Iniciar sesión" : "Crear cuenta"}</Text>
      {mode === "signup" ? <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Nombre" placeholderTextColor={colors.textSecondary} /> : null}
      <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" placeholder="Email" placeholderTextColor={colors.textSecondary} />
      <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="Contraseña" placeholderTextColor={colors.textSecondary} />
      <Pressable onPress={() => void submit()} style={styles.button}>
        <Text style={styles.buttonText}>{mode === "login" ? "Entrar" : "Crear cuenta"}</Text>
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
    marginBottom: spacing.sm
  },
  input: {
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    color: colors.textPrimary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  button: {
    borderRadius: 12,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    alignItems: "center"
  },
  buttonText: {
    color: colors.primaryText,
    fontWeight: "800"
  },
  switchText: {
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.sm
  }
});
