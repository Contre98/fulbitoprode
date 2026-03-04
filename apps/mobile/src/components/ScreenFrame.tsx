import type { ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { colors, spacing } from "@fulbito/design-tokens";
import { DataModeBadge } from "@/components/DataModeBadge";

export function ScreenFrame({
  title,
  subtitle,
  header,
  hideDataModeBadge,
  containerStyle,
  contentStyle,
  children
}: {
  title: string;
  subtitle?: string;
  header?: ReactNode;
  hideDataModeBadge?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  return (
    <View style={[styles.container, containerStyle]}>
      {header ? (
        header
      ) : (
        <>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </>
      )}
      {hideDataModeBadge ? null : <DataModeBadge />}
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.xl
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "800"
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: spacing.sm
  },
  content: {
    marginTop: spacing.lg,
    gap: spacing.md
  }
});
