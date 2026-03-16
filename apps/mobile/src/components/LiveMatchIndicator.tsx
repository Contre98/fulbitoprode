import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { getColors } from "@fulbito/design-tokens";
import type { ColorTokens } from "@fulbito/design-tokens";
import { useThemeColors } from "@/theme/useThemeColors";

const PULSE_DURATION = 900;

export function useLivePulse() {
  const value = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: 0.2, duration: PULSE_DURATION, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(value, { toValue: 1, duration: PULSE_DURATION, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [value]);

  return value;
}

export function LivePulseBorder({
  children,
  borderRadius = 16
}: {
  children: React.ReactNode;
  borderRadius?: number;
}) {
  const themeColors = useThemeColors();
  styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const opacity = useLivePulse();

  return (
    <View style={[styles.wrapper, { borderRadius }]}>
      <Animated.View
        style={[
          styles.pulseBorder,
          { borderRadius, opacity }
        ]}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

export function estimateMatchMinute(kickoffAt: string): string {
  const elapsed = Math.floor((Date.now() - new Date(kickoffAt).getTime()) / 60_000);
  if (elapsed < 0) return "";
  if (elapsed <= 45) return `${elapsed}'`;
  if (elapsed <= 60) return "ET";
  if (elapsed <= 105) return `${elapsed - 15}'`;
  return "90+";
}

const createStyles = (themeColors: ColorTokens) => StyleSheet.create({
  wrapper: {
    position: "relative",
    overflow: "visible",
    padding: 2
  },
  pulseBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: themeColors.dangerAccent
  }
});

let styles = createStyles(getColors("light"));
