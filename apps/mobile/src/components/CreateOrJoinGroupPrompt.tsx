import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Animated from "react-native-reanimated";
import { getColors, spacing } from "@fulbito/design-tokens";
import type { ColorTokens } from "@fulbito/design-tokens";
import { usePressScale } from "@/lib/usePressScale";
import { useThemeColors } from "@/theme/useThemeColors";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function CreateOrJoinGroupPrompt() {
  const navigation = useNavigation<any>();
  const ctaPress = usePressScale(0.98);
  const themeColors = useThemeColors();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons name="people-outline" size={26} color={themeColors.primaryDeep} />
      </View>
      <Text allowFontScaling={false} style={styles.title}>Todavía no estás en un grupo</Text>
      <Text allowFontScaling={false} style={styles.description}>
        Para ver posiciones, fixture y pronósticos, primero creá un grupo o unite a uno existente.
      </Text>
      <AnimatedPressable
        style={[styles.ctaButton, ctaPress.animatedStyle]}
        onPress={() => navigation.navigate("UnirseCrearGrupo")}
        onPressIn={ctaPress.onPressIn}
        onPressOut={ctaPress.onPressOut}
      >
        <Text allowFontScaling={false} style={styles.ctaText}>Crear o unirse a un grupo</Text>
      </AnimatedPressable>
    </View>
  );
}

const createStyles = (themeColors: ColorTokens) => StyleSheet.create({
  card: {
    backgroundColor: themeColors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: themeColors.borderSubtle,
    padding: spacing.md,
    gap: spacing.sm
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: themeColors.primarySoftAlt
  },
  title: {
    color: themeColors.textTitle,
    fontSize: 16,
    fontWeight: "800"
  },
  description: {
    color: themeColors.textSecondary,
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
    backgroundColor: themeColors.primary
  },
  ctaText: {
    color: themeColors.textInverse,
    fontSize: 13,
    fontWeight: "800"
  }
});
