import { Pressable, StyleSheet, View } from "react-native";
import { colors } from "@fulbito/design-tokens";
import { Text } from "react-native";

export function HeaderActionIcons() {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Abrir ajustes"
        hitSlop={6}
        style={styles.iconButton}
      >
        <Text allowFontScaling={false} style={styles.iconGlyph}>⚙</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Abrir perfil"
        hitSlop={6}
        style={styles.iconButton}
      >
        <View style={styles.profileIcon}>
          <View style={styles.profileHead} />
          <View style={styles.profileBody} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  iconButton: {
    height: 44,
    width: 44,
    borderRadius: 999,
    backgroundColor: colors.brandTint,
    alignItems: "center",
    justifyContent: "center"
  },
  iconGlyph: {
    color: colors.iconStrong,
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 24
  },
  profileIcon: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center"
  },
  profileHead: {
    width: 9,
    height: 9,
    borderRadius: 999,
    backgroundColor: colors.iconStrong
  },
  profileBody: {
    marginTop: 2,
    width: 14,
    height: 8,
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
    backgroundColor: colors.iconStrong
  }
});
