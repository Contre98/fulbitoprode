import { useId } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { colors } from "@fulbito/design-tokens";
import type { MatchFormState } from "@/lib/matchVisuals";

type MatchSideGradientProps = {
  homeColor: string;
  awayColor: string;
  intensity?: number;
};

type CardSideAccentGradientProps = {
  color?: string;
  intensity?: number;
  side?: "left" | "right";
  widthPct?: number;
};

type FormDotsProps = {
  form: MatchFormState[];
  align?: "left" | "right";
};

export function MatchSideGradient({ homeColor, awayColor, intensity = 0.2 }: MatchSideGradientProps) {
  const gradientId = useId().replace(/:/g, "");
  const leftId = `${gradientId}-left`;
  const rightId = `${gradientId}-right`;
  const alpha = Math.min(Math.max(intensity, 0), 0.22);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={leftId} x1="0%" y1="0%" x2="100%" y2="55%">
            <Stop offset="0%" stopColor={homeColor} stopOpacity={alpha} />
            <Stop offset="45%" stopColor={homeColor} stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id={rightId} x1="100%" y1="0%" x2="0%" y2="55%">
            <Stop offset="0%" stopColor={awayColor} stopOpacity={alpha} />
            <Stop offset="45%" stopColor={awayColor} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="50%" height="100%" fill={`url(#${leftId})`} />
        <Rect x="50%" y="0" width="50%" height="100%" fill={`url(#${rightId})`} />
      </Svg>
    </View>
  );
}

export function CardSideAccentGradient({
  color = colors.primaryStrong,
  intensity = 0.08,
  side = "left",
  widthPct = 34
}: CardSideAccentGradientProps) {
  const gradientId = useId().replace(/:/g, "");
  const sideId = `${gradientId}-${side}`;
  const alpha = Math.min(Math.max(intensity, 0), 0.18);
  const clampedWidth = Math.min(Math.max(widthPct, 10), 60);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          {side === "left" ? (
            <LinearGradient id={sideId} x1="0%" y1="0%" x2="100%" y2="35%">
              <Stop offset="0%" stopColor={color} stopOpacity={alpha} />
              <Stop offset="100%" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          ) : (
            <LinearGradient id={sideId} x1="100%" y1="0%" x2="0%" y2="35%">
              <Stop offset="0%" stopColor={color} stopOpacity={alpha} />
              <Stop offset="100%" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          )}
        </Defs>
        <Rect
          x={side === "left" ? "0%" : `${100 - clampedWidth}%`}
          y="0"
          width={`${clampedWidth}%`}
          height="100%"
          fill={`url(#${sideId})`}
        />
      </Svg>
    </View>
  );
}

export function FormDots({ form, align = "left" }: FormDotsProps) {
  return (
    <View style={[styles.formRow, align === "right" ? styles.formRowRight : null]}>
      {form.slice(0, 5).map((state, index) => (
        <View key={`${state}-${index}`} style={[styles.dot, dotStyleForState(state)]} />
      ))}
    </View>
  );
}

function dotStyleForState(state: MatchFormState) {
  if (state === "win") {
    return styles.dotWin;
  }
  if (state === "loss") {
    return styles.dotLoss;
  }
  if (state === "draw") {
    return styles.dotDraw;
  }
  return styles.dotNone;
}

const styles = StyleSheet.create({
  formRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: 3
  },
  formRowRight: {
    justifyContent: "flex-end"
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999
  },
  dotWin: {
    backgroundColor: "#22C55E"
  },
  dotLoss: {
    backgroundColor: colors.dangerAccent
  },
  dotDraw: {
    backgroundColor: colors.warningAccent
  },
  dotNone: {
    backgroundColor: colors.textMutedAlt
  }
});
