import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "@fulbito/design-tokens";

export function CreateOrJoinGroupPrompt() {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons name="people-outline" size={26} color={colors.primaryDeep} />
      </View>
      <Text allowFontScaling={false} style={styles.title}>Todavía no estás en un grupo</Text>
      <Text allowFontScaling={false} style={styles.description}>
        Para ver posiciones, fixture y pronósticos, primero creá un grupo o unite a uno existente.
      </Text>
      <Pressable style={styles.ctaButton} onPress={() => navigation.navigate("UnirseCrearGrupo")}>
        <Text allowFontScaling={false} style={styles.ctaText}>Crear o unirse a un grupo</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
    gap: spacing.sm
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoftAlt
  },
  title: {
    color: colors.textTitle,
    fontSize: 16,
    fontWeight: "800"
  },
  description: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19
  },
  ctaButton: {
    marginTop: spacing.xs,
    minHeight: 42,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary
  },
  ctaText: {
    color: colors.textStrong,
    fontSize: 13,
    fontWeight: "800"
  }
});
