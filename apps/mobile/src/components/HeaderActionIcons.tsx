import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@fulbito/design-tokens";

interface HeaderActionIconsProps {
  notificationCount?: number;
  onPressNotifications?: () => void;
}

export function HeaderActionIcons({
  notificationCount = 0,
  onPressNotifications
}: HeaderActionIconsProps) {
  const showBadge = notificationCount > 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Notificaciones"
      onPress={onPressNotifications}
      hitSlop={6}
      style={styles.iconButton}
    >
      <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
      {showBadge && (
        <View style={styles.badge}>
          <Text allowFontScaling={false} style={styles.badgeText}>
            {notificationCount > 9 ? "9+" : String(notificationCount)}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    height: 42,
    width: 42,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 3
  },
  badge: {
    position: "absolute",
    top: 5,
    right: 5,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.dangerAccent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: colors.surface
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
    lineHeight: 11
  }
});
