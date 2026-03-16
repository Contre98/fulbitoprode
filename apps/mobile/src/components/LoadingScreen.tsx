import { useEffect, useMemo, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { getColors } from "@fulbito/design-tokens";
import type { ColorTokens } from "@fulbito/design-tokens";
import { useThemeColors } from "@/theme/useThemeColors";

export function LoadingScreen() {
  const themeColors = useThemeColors();
  styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entry animation: fade in + scale up
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  useEffect(() => {
    // Looping pulse animation after entry completes
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );

    // Delay pulse until after entry animation
    const timer = setTimeout(() => {
      pulseAnimation.start();
    }, 600);

    return () => {
      clearTimeout(timer);
      pulseAnimation.stop();
    };
  }, [pulseAnim]);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Animated.View
        style={[
          styles.logoWrapper,
          {
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              {
                scale: pulseAnim.interpolate({
                  inputRange: [0.6, 1],
                  outputRange: [0.95, 1.05],
                }),
              },
            ],
          },
        ]}
      >
        <Svg width={56} height={56} viewBox="0 0 272.41 272.41">
          <Path
            fill="#b6d900"
            d="M217.93,3c0-1.66-1.34-3-3-3H21.82C9.77,0,0,9.77,0,21.82v194.87c0,.8.32,1.56.88,2.12l48.48,48.48c1.89,1.89,5.12.55,5.12-2.12V54.48h163.45V3Z"
          />
          <Path
            fill="#b6d900"
            d="M267.29,5.12l-49.19,49.19c-.11.11-.18.27-.18.43v163.21h0s-108.96-.01-108.96-.01v54.48h109.55s0,0,.02,0h31.46c12.38,0,22.42-10.04,22.42-22.42V7.24c0-2.67-3.23-4.01-5.12-2.12Z"
          />
          <Rect fill="#b6d900" x={108.96} y={108.96} width={54.48} height={54.48} />
        </Svg>
      </Animated.View>
    </View>
  );
}

const createStyles = (themeColors: ColorTokens) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logoWrapper: {
    justifyContent: "center",
    alignItems: "center",
  },
});

let styles = createStyles(getColors("light"));
