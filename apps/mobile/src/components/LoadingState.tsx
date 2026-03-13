import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View, type DimensionValue, type StyleProp, type ViewStyle } from "react-native";
import { colors, spacing } from "@fulbito/design-tokens";

export type LoadingStateVariant =
  | "default"
  | "home"
  | "fixtures"
  | "predictions"
  | "leaderboard"
  | "stats"
  | "profile"
  | "preferences"
  | "notifications";

type LoadingStateProps = {
  message?: string;
  showMessage?: boolean;
  variant?: LoadingStateVariant;
};

type SkeletonBlockProps = {
  height: number;
  width?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

function SkeletonBlock({ height, width = "100%", radius = 10, style }: SkeletonBlockProps) {
  return <View style={[styles.skeletonBlock, { height, width, borderRadius: radius }, style]} />;
}

function FixtureSkeleton() {
  return (
    <View style={styles.variantStack}>
      {[0, 1, 2].map((index) => (
        <View key={`fixture-${index}`} style={styles.card}>
          <View style={styles.fixtureRow}>
            <View style={styles.fixtureTeam}>
              <SkeletonBlock height={28} width={28} radius={14} />
              <SkeletonBlock height={12} width="70%" />
            </View>
            <SkeletonBlock height={20} width={62} radius={8} />
            <View style={[styles.fixtureTeam, styles.fixtureTeamRight]}>
              <SkeletonBlock height={12} width="70%" />
              <SkeletonBlock height={28} width={28} radius={14} />
            </View>
          </View>
          <SkeletonBlock height={10} width={95} radius={8} style={styles.centeredMeta} />
        </View>
      ))}
    </View>
  );
}

function PredictionSkeleton() {
  return (
    <View style={styles.variantStack}>
      <View style={styles.card}>
        <SkeletonBlock height={10} width={76} />
        <SkeletonBlock height={8} width="100%" radius={999} />
      </View>
      <View style={styles.tabShell}>
        <SkeletonBlock height={30} radius={10} style={styles.tabHalf} />
        <SkeletonBlock height={30} radius={10} style={styles.tabHalf} />
      </View>
      <FixtureSkeleton />
    </View>
  );
}

function LeaderboardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.leaderboardHeader}>
        <SkeletonBlock height={12} width={108} />
        <SkeletonBlock height={12} width={126} />
      </View>
      {[0, 1, 2, 3, 4].map((index) => (
        <View key={`leaderboard-${index}`} style={[styles.leaderboardRow, index > 0 ? styles.leaderboardRowBorder : null]}>
          <SkeletonBlock height={18} width={20} radius={9} />
          <SkeletonBlock height={12} width="40%" />
          <SkeletonBlock height={12} width={26} />
          <SkeletonBlock height={12} width={40} />
          <SkeletonBlock height={12} width={30} />
        </View>
      ))}
    </View>
  );
}

function StatsSkeleton() {
  return (
    <View style={styles.variantStack}>
      <View style={styles.statsSummaryRow}>
        {[0, 1, 2].map((index) => (
          <View key={`stat-summary-${index}`} style={styles.statsSummaryCard}>
            <SkeletonBlock height={26} width={26} radius={13} />
            <SkeletonBlock height={10} width="70%" />
            <SkeletonBlock height={16} width="45%" />
          </View>
        ))}
      </View>
      <View style={styles.card}>
        {[0, 1, 2, 3].map((index) => (
          <View key={`stat-row-${index}`} style={[styles.simpleRow, index > 0 ? styles.simpleRowBorder : null]}>
            <SkeletonBlock height={11} width="45%" />
            <SkeletonBlock height={11} width={64} />
          </View>
        ))}
      </View>
      {[0, 1].map((index) => (
        <View key={`stat-card-${index}`} style={styles.card}>
          <SkeletonBlock height={12} width="35%" />
          <SkeletonBlock height={12} width="70%" />
          <SkeletonBlock height={11} width="55%" />
        </View>
      ))}
    </View>
  );
}

function ProfileSkeleton() {
  return (
    <View style={styles.variantStack}>
      <View style={styles.statsSummaryRow}>
        {[0, 1, 2].map((index) => (
          <View key={`profile-summary-${index}`} style={styles.statsSummaryCard}>
            <SkeletonBlock height={10} width="60%" />
            <SkeletonBlock height={18} width="45%" />
          </View>
        ))}
      </View>
      {[0, 1, 2].map((index) => (
        <View key={`profile-row-${index}`} style={styles.card}>
          <SkeletonBlock height={13} width="68%" />
          <SkeletonBlock height={11} width="40%" />
        </View>
      ))}
    </View>
  );
}

function PreferencesSkeleton() {
  return (
    <View style={styles.variantStack}>
      {[0, 1, 2].map((index) => (
        <View key={`preference-${index}`} style={styles.preferenceRow}>
          <SkeletonBlock height={12} width="58%" />
          <SkeletonBlock height={12} width={30} />
        </View>
      ))}
    </View>
  );
}

function NotificationsSkeleton() {
  return (
    <View style={styles.variantStack}>
      {[0, 1, 2].map((index) => (
        <View key={`notification-${index}`} style={styles.card}>
          <SkeletonBlock height={13} width="55%" />
          <SkeletonBlock height={11} width="92%" />
          <SkeletonBlock height={11} width="78%" />
        </View>
      ))}
    </View>
  );
}

function DefaultSkeleton() {
  return (
    <View style={styles.card}>
      <SkeletonBlock height={12} width="62%" />
      <SkeletonBlock height={10} width="42%" />
    </View>
  );
}

function HomeSkeleton() {
  return (
    <View style={styles.variantStack}>
      <View style={styles.card}>
        <View style={styles.homeHeaderRow}>
          <SkeletonBlock height={12} width="45%" />
          <SkeletonBlock height={12} width={80} />
        </View>
        <View style={styles.homeRankRow}>
          <SkeletonBlock height={46} width={46} radius={23} />
          <View style={styles.homeRankMeta}>
            <SkeletonBlock height={12} width="60%" />
            <SkeletonBlock height={10} width="40%" />
          </View>
          <SkeletonBlock height={18} width={58} radius={9} />
        </View>
      </View>
      <View style={styles.card}>
        <SkeletonBlock height={12} width="74%" />
        <SkeletonBlock height={8} width="100%" radius={999} />
        <SkeletonBlock height={36} width={132} radius={10} />
      </View>
      {[0, 1].map((index) => (
        <View key={`home-fixture-${index}`} style={styles.card}>
          <View style={styles.fixtureRow}>
            <View style={styles.fixtureTeam}>
              <SkeletonBlock height={24} width={24} radius={12} />
              <SkeletonBlock height={12} width="65%" />
            </View>
            <SkeletonBlock height={20} width={52} radius={8} />
            <View style={[styles.fixtureTeam, styles.fixtureTeamRight]}>
              <SkeletonBlock height={12} width="65%" />
              <SkeletonBlock height={24} width={24} radius={12} />
            </View>
          </View>
          <SkeletonBlock height={10} width={100} radius={8} style={styles.centeredMeta} />
        </View>
      ))}
    </View>
  );
}

function variantContent(variant: LoadingStateVariant) {
  switch (variant) {
    case "home":
      return <HomeSkeleton />;
    case "fixtures":
      return <FixtureSkeleton />;
    case "predictions":
      return <PredictionSkeleton />;
    case "leaderboard":
      return <LeaderboardSkeleton />;
    case "stats":
      return <StatsSkeleton />;
    case "profile":
      return <ProfileSkeleton />;
    case "preferences":
      return <PreferencesSkeleton />;
    case "notifications":
      return <NotificationsSkeleton />;
    case "default":
    default:
      return <DefaultSkeleton />;
  }
}

export function LoadingState({ message = "Cargando...", showMessage = true, variant = "default" }: LoadingStateProps) {
  const pulse = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.95,
          duration: 700,
          useNativeDriver: true
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 700,
          useNativeDriver: true
        })
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.skeletonWrap, { opacity: pulse }]}>
        {variantContent(variant)}
      </Animated.View>
      {showMessage ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingVertical: spacing.md,
    gap: spacing.sm
  },
  skeletonWrap: {
    gap: spacing.sm
  },
  variantStack: {
    gap: spacing.sm
  },
  skeletonBlock: {
    backgroundColor: colors.surfaceMuted
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceSoft,
    padding: 12,
    gap: 8
  },
  fixtureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8
  },
  fixtureTeam: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  fixtureTeamRight: {
    justifyContent: "flex-end"
  },
  centeredMeta: {
    alignSelf: "center"
  },
  tabShell: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceSoft,
    padding: 4,
    gap: 4
  },
  tabHalf: {
    flex: 1
  },
  leaderboardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2
  },
  leaderboardRow: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  leaderboardRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: 8
  },
  statsSummaryRow: {
    flexDirection: "row",
    gap: 8
  },
  statsSummaryCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceSoft,
    padding: 10,
    gap: 8,
    alignItems: "center"
  },
  simpleRow: {
    minHeight: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8
  },
  simpleRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: 8
  },
  homeHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  homeRankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  homeRankMeta: {
    flex: 1,
    gap: 6
  },
  preferenceRow: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  message: {
    alignSelf: "center",
    color: colors.textSecondary,
    fontSize: 12
  }
});
