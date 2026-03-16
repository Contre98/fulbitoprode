import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated from "react-native-reanimated";
import { getColors } from "@fulbito/design-tokens";
import type { ColorTokens } from "@fulbito/design-tokens";
import { ScreenFrame } from "@/components/ScreenFrame";
import { usePressScale } from "@/lib/usePressScale";
import { useThemeColors } from "@/theme/useThemeColors";

let activeColors: ColorTokens = getColors("light");
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function SugerenciasScreen() {
  const themeColors = useThemeColors();
  activeColors = themeColors;
  styles = useMemo(() => createStyles(), [themeColors]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const backPress = usePressScale(0.93);

  return (
    <ScreenFrame
      title="Sugerencias"
      subtitle="Envianos tu feedback"
      hideDataModeBadge
      containerStyle={styles.screenContainer}
      contentStyle={styles.screenContent}
      header={
        <View style={[styles.headerCard, { paddingTop: Math.max(insets.top, 10) + 2 }]}>
          <AnimatedPressable
            onPress={() => navigation.goBack()}
            onPressIn={backPress.onPressIn}
            onPressOut={backPress.onPressOut}
            hitSlop={6}
            style={[styles.backButton, backPress.animatedStyle]}
          >
            <Text allowFontScaling={false} style={styles.backButtonText}>←</Text>
          </AnimatedPressable>
        </View>
      }
    >
      <View style={styles.placeholder}>
        <Text allowFontScaling={false} style={styles.placeholderTitle}>Sugerencias</Text>
        <Text allowFontScaling={false} style={styles.placeholderText}>Próximamente</Text>
      </View>
    </ScreenFrame>
  );
}

const createStyles = () => StyleSheet.create({
  screenContainer: {
    paddingHorizontal: 12,
    paddingTop: 0,
    paddingBottom: 0,
    backgroundColor: activeColors.canvas
  },
  screenContent: {
    gap: 10
  },
  headerCard: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    backgroundColor: activeColors.surfaceSoft,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: activeColors.borderSubtle,
    marginHorizontal: -12,
    flexDirection: "row",
    alignItems: "center"
  },
  backButton: {
    height: 32,
    width: 32,
    borderRadius: 999,
    backgroundColor: activeColors.brandTintAlt,
    alignItems: "center",
    justifyContent: "center"
  },
  backButtonText: {
    color: activeColors.iconStrong,
    fontSize: 16,
    fontWeight: "900"
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60
  },
  placeholderTitle: {
    color: activeColors.textPrimary,
    fontSize: 20,
    fontWeight: "900"
  },
  placeholderText: {
    marginTop: 8,
    color: activeColors.textMuted,
    fontSize: 14,
    fontWeight: "700"
  }
});


let styles = createStyles();
