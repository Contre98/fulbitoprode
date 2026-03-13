import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@fulbito/design-tokens";
import type { LeaderboardStatsRow, LeaderboardAward } from "@fulbito/domain";

interface LeaderboardOverviewCardProps {
  groupLabel: string;
  row: LeaderboardStatsRow;
  awards?: LeaderboardAward[];
  currentUserId?: string;
  onPress?: () => void;
}

const awardGlyph: Record<string, { icon: string; tone: string }> = {
  nostradamus: { icon: "✣", tone: colors.primaryStrong },
  bilardista: { icon: "◻", tone: colors.slate },
  "la-racha": { icon: "◔", tone: colors.warning },
  batacazo: { icon: "⚡", tone: colors.warning },
  "robin-hood": { icon: "◎", tone: colors.successAccent },
  "el-casi": { icon: "⌖", tone: colors.info },
  "el-mufa": { icon: "☂", tone: colors.slateMuted }
};

export function LeaderboardOverviewCard({ groupLabel, row, awards, currentUserId, onPress }: LeaderboardOverviewCardProps) {
  const delta = row.deltaRank ?? 0;
  const streak = row.streak ?? 0;
  const myAwards = awards?.filter((a) => a.winnerUserId === (row.userId ?? currentUserId)) ?? [];

  const awardBadges = myAwards.map((award) => {
    const visual = awardGlyph[award.id] ?? { icon: "◈", tone: colors.trophy };
    return { icon: visual.icon, tone: visual.tone, label: award.title };
  });

  const flameColor = streak > 0 ? colors.warning : colors.textMuted;
  const streakLabel = streak > 0 ? `Racha: ${streak} aciertos` : "Sin racha";

  const podiumConfig: Record<number, { color: string; label: string }> = {
    1: { color: colors.trophy, label: "1° lugar" },
    2: { color: colors.slate, label: "2° lugar" },
    3: { color: colors.warningMuted, label: "3° lugar" }
  };
  const podium = podiumConfig[row.rank];

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>{groupLabel.toUpperCase()}</Text>
        {onPress && (
          <TouchableOpacity onPress={onPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-forward" size={18} color={colors.textGray} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.col}>
          <Text style={styles.label}>Tu Posición</Text>
          <View style={styles.posRow}>
            <Text style={styles.bigNum}>#{row.rank}</Text>
            {delta !== 0 && (
              <View style={[styles.badge, delta > 0 ? styles.badgeUp : styles.badgeDown]}>
                <Text style={[styles.badgeText, delta > 0 ? styles.badgeTextUp : styles.badgeTextDown]}>
                  {delta > 0 ? `▲ +${delta}` : `▼ ${delta}`}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.col, styles.colRight]}>
          <Text style={styles.label}>Puntos</Text>
          <Text style={styles.bigNum}>{row.points}</Text>
        </View>
      </View>

      <View style={styles.divider} />
      <View style={styles.badgesRow}>
        {podium && (
          <View style={styles.pill}>
            <Ionicons name="trophy" size={14} color={podium.color} />
            <Text style={styles.pillText}>{podium.label}</Text>
          </View>
        )}
        <View style={styles.pill}>
          <Ionicons name="flame" size={14} color={flameColor} />
          <Text style={styles.pillText}>{streakLabel}</Text>
        </View>
        {awardBadges.map((b, i) => (
          <View key={i} style={styles.pill}>
            <Text allowFontScaling={false} style={[styles.pillIcon, { color: b.tone }]}>{b.icon}</Text>
            <Text style={styles.pillText}>{b.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    paddingBottom: 16,
    gap: 14,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  header: {
    color: colors.textGray,
    fontFamily: "Inter",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  col: {
    gap: 4
  },
  colRight: {
    alignItems: "flex-end"
  },
  label: {
    color: colors.textGray,
    fontSize: 12
  },
  posRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  bigNum: {
    color: colors.textHigh,
    fontSize: 40,
    fontWeight: "800",
    lineHeight: 40
  },
  badge: {
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 2
  },
  badgeUp: {
    backgroundColor: "#DCFCE7"
  },
  badgeDown: {
    backgroundColor: "#FEE2E2"
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600"
  },
  badgeTextUp: {
    color: "#16A34A"
  },
  badgeTextDown: {
    color: "#DC2626"
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  pill: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12
  },
  pillIcon: {
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 16
  },
  pillText: {
    color: colors.iconStrong,
    fontSize: 12,
    fontWeight: "500"
  }
});
