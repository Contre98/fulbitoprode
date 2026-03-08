import type { ReactNode } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  const insets = useSafeAreaInsets();

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
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: spacing.xl + insets.bottom }, contentStyle]}
      >
        {children}
      </ScrollView>
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
  scroll: {
    flex: 1
  },
  content: {
    marginTop: spacing.lg,
    gap: spacing.md
  }
});
