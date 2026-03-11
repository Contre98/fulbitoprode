import { StyleSheet, View } from "react-native";
import { colors } from "@fulbito/design-tokens";

type BrandBadgeIconProps = {
  size?: number;
};

export function BrandBadgeIcon({ size = 18 }: BrandBadgeIconProps) {
  const scale = size / 18;

  return (
    <View style={[styles.root, { width: size, height: size }]}>
      <View style={[styles.cup, { transform: [{ scale }] }]}>
        <View style={styles.bowl} />
        <View style={styles.handleLeft} />
        <View style={styles.handleRight} />
        <View style={styles.stem} />
        <View style={styles.base} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    justifyContent: "center"
  },
  cup: {
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "flex-start"
  },
  bowl: {
    marginTop: 2,
    width: 12,
    height: 8,
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    backgroundColor: colors.trophy,
    borderWidth: 1,
    borderColor: colors.trophyDeep
  },
  handleLeft: {
    position: "absolute",
    top: 3,
    left: -2,
    width: 4,
    height: 6,
    borderWidth: 1.4,
    borderColor: colors.trophyDeep,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    borderRightWidth: 0
  },
  handleRight: {
    position: "absolute",
    top: 3,
    right: -2,
    width: 4,
    height: 6,
    borderWidth: 1.4,
    borderColor: colors.trophyDeep,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    borderLeftWidth: 0
  },
  stem: {
    position: "absolute",
    top: 10,
    width: 2.5,
    height: 4.5,
    borderRadius: 999,
    backgroundColor: colors.trophyDeep
  },
  base: {
    position: "absolute",
    top: 14,
    width: 8,
    height: 2.5,
    borderRadius: 999,
    backgroundColor: colors.trophyDeep
  }
});
