import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@fulbito/design-tokens";

interface UrgentActionCardProps {
  message: string;
  filled: number;
  total: number;
  complete: boolean;
  onPress: () => void;
}

export function UrgentActionCard({ message, filled, total, complete, onPress }: UrgentActionCardProps) {
  const progressPct = total > 0 ? Math.min(filled / total, 1) : 0;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.sectionTitle}>
          {complete ? "PRONÓSTICOS COMPLETOS" : "PRONÓSTICOS PENDIENTES"}
        </Text>
        {!complete && (
          <Pressable style={styles.ctaBtn} onPress={onPress}>
            <Text style={styles.ctaBtnLabel}>Jugar</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.messageRow}>
        <View style={[styles.iconCircle, complete && styles.iconCircleComplete]}>
          <Text allowFontScaling={false} style={[styles.iconGlyph, complete && styles.iconGlyphComplete]}>
            {complete ? "✓" : "◷"}
          </Text>
        </View>
        <Text style={styles.message}>{message}</Text>
      </View>

      <View style={styles.progressRow}>
        <Text style={styles.progressLabel}>{filled}/{total}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, complete && styles.progressFillComplete, { width: `${progressPct * 100}%` }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  sectionTitle: {
    color: colors.textGray,
    fontFamily: "Inter",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1
  },
  ctaBtn: {
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    paddingVertical: 4,
    paddingHorizontal: 12
  },
  ctaBtnLabel: {
    color: colors.primaryDeep,
    fontFamily: "Inter",
    fontSize: 12,
    fontWeight: "700"
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surfaceTintWarning,
    alignItems: "center",
    justifyContent: "center"
  },
  iconCircleComplete: {
    backgroundColor: colors.primarySoftAlt
  },
  iconGlyph: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.warningDeep,
    lineHeight: 15
  },
  iconGlyphComplete: {
    color: colors.primaryDeep
  },
  message: {
    flex: 1,
    color: colors.textStrong,
    fontFamily: "Inter",
    fontSize: 13,
    lineHeight: 16
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  progressLabel: {
    color: colors.textGray,
    fontFamily: "Inter",
    fontSize: 12,
    fontWeight: "600"
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 3,
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.warning,
    borderRadius: 3
  },
  progressFillComplete: {
    backgroundColor: colors.primaryStrong
  }
});
